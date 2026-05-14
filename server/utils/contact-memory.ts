export interface ContactMemoryRecord {
  id?: string
  chatbot_id: string
  channel: 'whatsapp' | 'web'
  contact_key: string
  display_name?: string | null
  preferred_language?: string | null
  memory?: Record<string, any>
  last_seen_at?: string | null
}

const isRelationMissing = (error: any) => {
  const message = String(error?.message || '').toLowerCase()
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('relation')
}

export const safeLoadContactMemory = async (
  supabase: any,
  chatbotId: string,
  channel: 'whatsapp' | 'web',
  contactKey?: string | null,
) => {
  if (!contactKey) return null

  try {
    const { data, error } = await supabase
      .from('chatbot_contact_memories')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .eq('channel', channel)
      .eq('contact_key', contactKey)
      .maybeSingle()

    if (error) {
      if (isRelationMissing(error)) return null
      throw error
    }

    return data || null
  } catch (error: any) {
    if (isRelationMissing(error)) return null
    console.warn('[Contact Memory] Failed to load:', error?.message || error)
    return null
  }
}

export const safeUpsertContactMemory = async (
  supabase: any,
  payload: ContactMemoryRecord,
) => {
  if (!payload.contact_key) return

  try {
    const { error } = await supabase
      .from('chatbot_contact_memories')
      .upsert({
        ...payload,
        memory: payload.memory || {},
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'chatbot_id,channel,contact_key' })

    if (error) {
      if (isRelationMissing(error)) return
      throw error
    }
  } catch (error: any) {
    if (isRelationMissing(error)) return
    console.warn('[Contact Memory] Failed to save:', error?.message || error)
  }
}
