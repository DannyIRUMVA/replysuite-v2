import { processInstagramComment } from './automation'
import { buildInstagramLoginGraphUrl } from './config'

const COMMENT_FIELDS = 'id,text,username,timestamp,from,replies{id,text,username,timestamp,from}'

type PollOptions = {
  maxPosts?: number
  commentsPerPost?: number
  maxCommentsPerRun?: number
  maxCommentAgeMinutes?: number
}

export const fetchInstagramComments = async (postId: string, accessToken: string, limit = 25) => {
  const comments: any[] = []
  let nextUrl: string | undefined = buildInstagramLoginGraphUrl(`${postId}/comments?fields=${encodeURIComponent(COMMENT_FIELDS)}&limit=${limit}`)

  while (nextUrl && comments.length < limit) {
    const target: URL = new URL(nextUrl)
    if (!target.searchParams.has('access_token')) target.searchParams.set('access_token', accessToken)

    const response: Response = await fetch(target.toString())
    const data: any = await response.json().catch(() => ({}))

    if (!response.ok || data?.error) {
      const error = new Error(data?.error?.message || 'Could not fetch Instagram comments for this post.') as Error & { status?: number; payload?: unknown }
      error.status = response.status || 502
      error.payload = data
      throw error
    }

    comments.push(...(data?.data || []))
    nextUrl = data?.paging?.next
  }

  return comments.slice(0, limit)
}

export const pollInstagramAutomations = async (supabase: any, options: PollOptions = {}) => {
  const maxPosts = Math.min(Math.max(Number(options.maxPosts || 50), 1), 100)
  const commentsPerPost = Math.min(Math.max(Number(options.commentsPerPost || 25), 1), 100)
  const maxCommentsPerRun = Math.min(Math.max(Number(options.maxCommentsPerRun || 5), 1), 25)
  const maxCommentAgeMinutes = Math.min(Math.max(Number(options.maxCommentAgeMinutes || 90), 1), 1440)
  const newestAllowedCommentTime = Date.now() - (maxCommentAgeMinutes * 60 * 1000)

  const { data: triggers, error: triggerError } = await supabase
    .from('instagram_comment_triggers')
    .select('id, instagram_post_id, reply_in_comment, reply_in_dm, is_active')
    .eq('is_active', true)
    .not('instagram_post_id', 'is', null)

  if (triggerError) throw triggerError

  const actionablePostIds = Array.from(new Set((triggers || [])
    .filter((trigger: any) => trigger?.instagram_post_id && (trigger.reply_in_comment || trigger.reply_in_dm))
    .map((trigger: any) => String(trigger.instagram_post_id))))
    .slice(0, maxPosts)

  if (!actionablePostIds.length) {
    return { checkedPosts: 0, fetchedComments: 0, processedComments: 0, failedPosts: 0, results: [] }
  }

  const { data: posts, error: postError } = await supabase
    .from('instagram_posts')
    .select('id, instagram_account_id, instagram_accounts(id, username, instagram_account_id, access_token)')
    .in('id', actionablePostIds)

  if (postError) throw postError

  const results: any[] = []
  let fetchedComments = 0
  let processedComments = 0
  let skippedOldComments = 0
  let skippedBudgetComments = 0
  let failedPosts = 0

  for (const post of posts || []) {
    const account = Array.isArray((post as any).instagram_accounts)
      ? (post as any).instagram_accounts[0]
      : (post as any).instagram_accounts

    if (!account?.access_token) {
      failedPosts += 1
      results.push({ postId: post.id, accountId: post.instagram_account_id, fetched: 0, processed: 0, error: 'Missing Instagram access token.' })
      continue
    }

    try {
      const comments = await fetchInstagramComments(String(post.id), account.access_token, commentsPerPost)
      let postProcessed = 0
      fetchedComments += comments.length

      for (const comment of comments) {
        const commentId = String(comment?.id || '').trim()
        const text = String(comment?.text || '').trim()
        if (!commentId || !text) continue

        const commentTime = comment?.timestamp ? Date.parse(comment.timestamp) : Date.now()
        if (Number.isFinite(commentTime) && commentTime < newestAllowedCommentTime) {
          skippedOldComments += 1
          continue
        }

        if (processedComments >= maxCommentsPerRun) {
          skippedBudgetComments += 1
          continue
        }

        await processInstagramComment(supabase, {
          igUserId: account.instagram_account_id,
          mediaId: String(post.id),
          commentId,
          commentText: text,
          commenterId: comment?.from?.id ? String(comment.from.id) : null,
          commenterUsername: comment?.from?.username || comment?.username || null,
          raw: comment,
        })
        processedComments += 1
        postProcessed += 1
      }

      results.push({ postId: post.id, accountId: post.instagram_account_id, username: account.username || null, fetched: comments.length, processed: postProcessed })
    } catch (error: any) {
      failedPosts += 1
      console.error('[Instagram Poll] Post polling failed:', post.id, error?.message || error)
      results.push({ postId: post.id, accountId: post.instagram_account_id, fetched: 0, processed: 0, error: error?.message || 'Failed to fetch comments.' })
    }
  }

  return {
    checkedPosts: (posts || []).length,
    fetchedComments,
    processedComments,
    skippedOldComments,
    skippedBudgetComments,
    failedPosts,
    safety: {
      maxCommentsPerRun,
      maxCommentAgeMinutes,
    },
    results,
  }
}
