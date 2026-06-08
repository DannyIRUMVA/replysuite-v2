import { serverSupabaseServiceRole } from '#supabase/server'
import { getAuthenticatedUserId } from '~~/server/utils/auth'
import { isUuid } from '~~/server/utils/public-chatbot'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)

  const supabase = serverSupabaseServiceRole(event)

  const { data: accounts, error } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, instagram_account_id, platform_id, username, profile_picture, token_expires_at, last_synced, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const normalizedAccounts = accounts || []
  const accountIds = normalizedAccounts
    .map((account: any) => String(account?.id || '').trim())
    .filter((id: string) => isUuid(id))

  const { data: posts } = accountIds.length
    ? await supabase
      .from('instagram_posts')
      .select('id, instagram_account_id, caption, media_type, media_url, permalink, thumbnail_url, created_at, updated_at')
      .in('instagram_account_id', accountIds)
      .order('updated_at', { ascending: false })
    : { data: [] }

  const postIds = (posts || []).map((post: any) => String(post?.id || '').trim()).filter(Boolean)
  const { data: triggers } = postIds.length
    ? await supabase
      .from('instagram_comment_triggers')
      .select('id, chatbot_id, instagram_post_id, trigger_type, keywords, reply_in_comment, reply_in_dm, dm_template, is_active, created_at, chatbots(name)')
      .in('instagram_post_id', postIds)
      .order('created_at', { ascending: false })
    : { data: [] }

  const { data: jobs } = accountIds.length
    ? await supabase
      .from('instagram_message_jobs')
      .select('instagram_account_id, instagram_post_id, trigger_id, comment_id, status, payload, created_at')
      .in('instagram_account_id', accountIds)
      .order('created_at', { ascending: false })
      .limit(200)
    : { data: [] }

  const { data: comments } = postIds.length
    ? await supabase
      .from('instagram_comments')
      .select('id, instagram_account_id, instagram_post_id, comment_id, comment_text, commenter_asid, commenter_username, created_at')
      .in('instagram_post_id', postIds)
      .order('created_at', { ascending: false })
      .limit(300)
    : { data: [] }

  const postsByAccount = new Map<string, any[]>()
  for (const post of posts || []) {
    const list = postsByAccount.get(post.instagram_account_id) || []
    list.push({ ...post, triggers: [] })
    postsByAccount.set(post.instagram_account_id, list)
  }

  for (const trigger of triggers || []) {
    const post = (postsByAccount.get((posts || []).find((item: any) => item.id === trigger.instagram_post_id)?.instagram_account_id) || [])
      .find((item: any) => item.id === trigger.instagram_post_id)
    if (post) post.triggers.push(trigger)
  }

  for (const comment of comments || []) {
    const post = (postsByAccount.get(comment.instagram_account_id) || [])
      .find((item: any) => item.id === comment.instagram_post_id)
    if (post) {
      const list = post.comments || []
      list.push(comment)
      post.comments = list
    }
  }

  const jobsByAccount = new Map<string, any[]>()
  for (const job of jobs || []) {
    const list = jobsByAccount.get(job.instagram_account_id) || []
    list.push(job)
    jobsByAccount.set(job.instagram_account_id, list)
  }

  return normalizedAccounts.map((account: any) => ({
    ...account,
    posts: postsByAccount.get(account.id) || [],
    jobs: jobsByAccount.get(account.id) || [],
  }))
})
