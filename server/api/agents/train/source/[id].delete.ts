import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const sourceId = getRouterParam(event, 'id')
  if (!sourceId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing source id' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: source, error: sourceError } = await supabase
    .from('data_sources')
    .select('id, chatbot_id, user_id, metadata')
    .eq('id', sourceId)
    .maybeSingle<any>()

  if (sourceError || !source || source.user_id !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Knowledge source not found or access denied' })
  }

  const storagePath = source.metadata?.storage_path as string | undefined

  const { error: deleteError } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', sourceId)
    .eq('user_id', user.id)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete knowledge source' })
  }

  if (storagePath) {
    await supabase.storage.from('training-assets').remove([storagePath]).catch(() => null)
  }

  const { data: remainingSources } = await supabase
    .from('data_sources')
    .select('data_size_bytes')
    .eq('chatbot_id', source.chatbot_id)
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalBytes = (remainingSources || []).reduce((sum: number, row: any) => sum + Number(row.data_size_bytes || 0), 0)
  await supabase
    .from('chatbots')
    .update({ current_embedding_mb: (totalBytes / (1024 * 1024)).toFixed(4) })
    .eq('id', source.chatbot_id)
    .eq('user_id', user.id)

  return { success: true }
})
