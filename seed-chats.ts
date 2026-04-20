import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vycwuvynlqdpvjiwbjjv.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Y3d1dnlubHFkcHZqaXdiamp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTIzODM1MywiZXhwIjoyMDg0ODE0MzUzfQ.iEGhZMuWvjXW8H9ZW8Q3lb3LRgo2ApWzB8pRB6ZKhk4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function seed() {
  console.log('Fetching user boyg87059@gmail.com...')
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'boyg87059@gmail.com')
  
  if (profileErr || !profiles?.length) {
    console.error('Failed to find profile boyg87059@gmail.com by email in profiles table. Trying to use Admin auth API...')
    
    // Fallback: Admin Auth fetch
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
    if (authErr) {
      console.error('Failed to fetch auth users:', authErr)
      return
    }

    const matchedUser = authUsers.users.find(u => u.email === 'boyg87059@gmail.com')
    if (!matchedUser) {
      console.error('Could not find user with email boyg87059@gmail.com via admin api.')
      console.log('Available Emails:', authUsers.users.map(u => u.email))
      return
    }
    
    var userId = matchedUser.id
  } else {
    var userId = profiles[0].id
  }

  console.log('Found User ID:', userId)

  console.log('Fetching chatbots for this user...')
  const { data: chatbots, error: chatErr } = await supabase
    .from('chatbots')
    .select('id, name')
    .eq('user_id', userId)

  if (chatErr || !chatbots?.length) {
    console.error('Failed to find any chatbots for user:', chatErr)
    return
  }

  const raskChatbot = chatbots.find(c => c.name.toLowerCase().includes('rask')) || chatbots[0]
  console.log('Targeting Chatbot:', raskChatbot.name, 'with ID:', raskChatbot.id)

  const chatsToInsert = [
    { userText: 'Can you help me set up an automation rule?', botText: 'Absolutely! Please navigate to the agents tab and click create.' },
    { userText: 'Is the system active right now?', botText: 'Yes, your ReplySuite instagram hooks are currently fully active and monitoring.' }
  ]

  for (let i = 0; i < chatsToInsert.length; i++) {
    const chat = chatsToInsert[i]
    console.log(`\nInserting session ${i + 1}...`)
    
    const { data: session, error: sessErr } = await supabase.from('chat_sessions').insert({
      user_id: userId,
      chatbot_id: raskChatbot.id,
      metadata: { type: 'instagram', username: 'dummy_user_' + i }
    }).select('id').single()

    if (sessErr) {
      console.error('Failed to insert session:', sessErr)
      continue
    }

    console.log(`Saved session ID: ${session.id}`)
    
    console.log(`Inserting messages...`)
    const { error: msgErr } = await supabase.from('chat_messages').insert([
      { session_id: session.id, role: 'user', content: chat.userText },
      { session_id: session.id, role: 'assistant', content: chat.botText }
    ])

    if (msgErr) {
      console.error('Failed to insert messages:', msgErr)
    } else {
      console.log(`Successfully saved chat ${i + 1}!`)
    }
  }

  console.log('\n✅ Script Complete.')
}

seed()
