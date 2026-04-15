<script setup lang="ts">
import { 
  Plus, 
  Instagram, 
  Zap, 
  Settings2, 
  Trash2, 
  Loader2, 
  MessageCircle, 
  MousePointer2,
  CheckCircle2,
  XCircle,
  Bot,
  Filter,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { userId, limits, planSlug } = useAuth()
const supabase = useSupabaseClient()

// State
const isLoading = ref(true)
const isFetchingPosts = ref(false)
const isFetchingMore = ref(false)
const showCreateModal = ref(false)
const selectedAccountId = ref('')
const nextPageCursor = ref<string | null>(null)
const accounts = ref<any[]>([])
const triggers = ref<any[]>([])
const posts = ref<any[]>([])
const chatbots = ref<any[]>([])

// Form
const newTrigger = ref({
  instagram_post_id: '',
  keywords: '',
  chatbot_id: '',
  dm_template: 'Hello! How can I help?',
  reply_in_comment: true,
  reply_in_dm: false,
  replyType: planSlug.value === 'starter' ? 'manual' : 'ai'
})

// Watch planSlug to update replyType if it changes (e.g. after upgrade)
watch(planSlug, (newSlug) => {
  if (newSlug === 'starter') {
    newTrigger.value.replyType = 'manual'
  }
})

// Fetch Data
const fetchData = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const [accRes, trigRes, chatRes] = await Promise.all([
      supabase.from('instagram_accounts').select('*').eq('user_id', userId.value),
      // Fetch triggers — table uses RLS (auth.uid()) for scoping, no user_id column
      supabase.from('instagram_comment_triggers').select('*'),
      supabase.from('chatbots').select('*').eq('user_id', userId.value).is('deleted_at', null)
    ])

    accounts.value = accRes.data || []
    chatbots.value = chatRes.data || []

    // Manually enrich triggers with their linked chatbot
    const chatbotMap = new Map((chatRes.data || []).map((c: any) => [c.id, c]))
    triggers.value = (trigRes.data || []).map((t: any) => ({
      ...t,
      chatbots: chatbotMap.get(t.chatbot_id) || null
    }))
    
    if (accounts.value.length > 0 && !selectedAccountId.value) {
      selectedAccountId.value = accounts.value[0].id
    }
  } catch (err) {
    console.error('Error fetching automation data:', err)
  } finally {
    isLoading.value = false
  }
}

const fetchPosts = async (isLoadMore = false) => {
  if (!selectedAccountId.value) return
  
  if (isLoadMore) isFetchingMore.value = true
  else {
    isFetchingPosts.value = true
    nextPageCursor.value = null
  }

  try {
    const url = `/api/instagram/posts?accountId=${selectedAccountId.value}${isLoadMore && nextPageCursor.value ? `&after=${nextPageCursor.value}` : ''}`
    const res: any = await $fetch(url)
    
    if (isLoadMore) {
      posts.value = [...posts.value, ...(res.data || [])]
    } else {
      posts.value = res.data || []
    }
    
    nextPageCursor.value = res.paging?.cursors?.after || null
  } catch (err) {
    console.error('Error fetching posts:', err)
    alert('Failed to fetch Instagram posts.')
  } finally {
    isFetchingPosts.value = false
    isFetchingMore.value = false
  }
}

onMounted(fetchData)

// Actions
const handleCreateTrigger = async () => {
  if (!newTrigger.value.instagram_post_id || !newTrigger.value.chatbot_id) return
  
  try {
    // Normalize keywords: store as an array (split by comma), filtering empty strings
    const keywordsArray = newTrigger.value.keywords
      ? newTrigger.value.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
      : []

    // Step 1: The trigger has a FK to instagram_posts.id (Instagram media ID).
    // We must upsert the post locally before creating the trigger.
    const selectedPost = posts.value.find((p: any) => p.id === newTrigger.value.instagram_post_id)
    if (selectedPost) {
      // Try upsert with all fields first; fall back to id-only if schema is more minimal
      let { error: postError } = await supabase
        .from('instagram_posts')
        .upsert({
          id: selectedPost.id,
          media_url: selectedPost.media_url,
          thumbnail_url: selectedPost.thumbnail_url || null,
          caption: selectedPost.caption || null,
          media_type: selectedPost.media_type,
          permalink: selectedPost.permalink || null,
        }, { onConflict: 'id', ignoreDuplicates: true })

      // If schema has fewer columns, fall back to id-only upsert
      if (postError?.code === 'PGRST204') {
        console.warn('[Trigger] Full upsert failed, retrying with minimal payload:', postError.message)
        const fallback = await supabase
          .from('instagram_posts')
          .upsert({ id: selectedPost.id }, { onConflict: 'id', ignoreDuplicates: true })
        postError = fallback.error
      }

      if (postError) {
        console.error('[Trigger] Failed to upsert post:', postError.message)
        throw new Error(`Could not save post to database: ${postError.message}`)
      }
    }

    // Step 2: Create the trigger referencing the (now-local) post
    const { data, error } = await supabase
      .from('instagram_comment_triggers')
      .insert({
        instagram_post_id: newTrigger.value.instagram_post_id,
        keywords: keywordsArray,
        chatbot_id: newTrigger.value.replyType === 'ai' ? newTrigger.value.chatbot_id : null,
        dm_template: newTrigger.value.dm_template,
        reply_in_comment: newTrigger.value.reply_in_comment,
        reply_in_dm: newTrigger.value.reply_in_dm,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    await fetchData()
    showCreateModal.value = false
    newTrigger.value = { 
      instagram_post_id: '', 
      keywords: '', 
      chatbot_id: '', 
      dm_template: 'Hello! How can I help?', 
      reply_in_comment: true, 
      reply_in_dm: false, 
      replyType: planSlug.value === 'starter' ? 'manual' : 'ai' 
    }
  } catch (err) {
    console.error('Error creating trigger:', err)
    alert('Failed to create automation rule.')
  }
}

const toggleTriggerStatus = async (trigger: any) => {
  const { error } = await supabase
    .from('instagram_comment_triggers')
    .update({ is_active: !trigger.is_active })
    .eq('id', trigger.id)
  
  if (!error) await fetchData()
}

const handleDeleteTrigger = async (id: string) => {
  if (!confirm('Delete this automation rule?')) return
  const { error } = await supabase.from('instagram_comment_triggers').delete().eq('id', id)
  if (!error) await fetchData()
}

const getPostById = (postId: string) => {
  return posts.value.find(p => p.id === postId)
}

watch(selectedAccountId, () => {
  if (showCreateModal.value) fetchPosts()
})

</script>

<template>
  <div class="space-y-12 pb-24">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-white mb-2 uppercase italic-none">Smart Automations</h2>
        <p class="text-gray-500 text-sm italic-none italic-none">Connect your AI agents to Instagram posts for auto-replies and lead generation.</p>
      </div>
      
      <button 
        @click="showCreateModal = true; fetchPosts()"
        class="flex items-center gap-3 px-6 py-3 bg-primary text-black font-bold rounded-2xl transition-all shadow-lg shadow-primary/10 hover:bg-primary-accent"
      >
        <Plus class="w-5 h-5" />
        CREATE NEW RULE
      </button>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="glass-card flex flex-col md:flex-row md:items-center justify-between gap-6 opacity-60">
        <div class="flex items-start gap-6">
          <Skeleton width="5rem" height="5rem" radius="1rem" />
          <div class="space-y-3">
            <div class="flex gap-2">
              <Skeleton width="8rem" height="1.5rem" />
              <Skeleton width="6rem" height="1.5rem" />
            </div>
            <Skeleton width="12rem" height="1rem" />
            <div class="flex gap-4">
               <Skeleton width="4rem" height="0.75rem" />
               <Skeleton width="4rem" height="0.75rem" />
            </div>
          </div>
        </div>
        <div class="flex gap-3 self-end md:self-center">
          <Skeleton width="5rem" height="2.5rem" />
          <Skeleton width="2rem" height="2rem" circle />
        </div>
      </div>
    </div>

    <!-- Active Triggers -->
    <div v-else class="space-y-6">
      <div v-if="triggers.length === 0" class="glass-card flex flex-col items-center py-20 text-center border-dashed border-white/10 bg-white/[0.01]">
        <Zap class="w-16 h-16 text-gray-800 mb-6" />
        <h3 class="text-lg font-bold text-white mb-2 uppercase tracking-tight italic-none">no active rules</h3>
        <p class="text-gray-500 text-[11px] max-w-sm mb-10 leading-relaxed uppercase tracking-widest italic-none">start by creating a rule to link a specific instagram post to one of your chatbots.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <div 
          v-for="trigger in triggers" 
          :key="trigger.id"
          class="relative glass-card !p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.01] hover:border-white/10 transition-all group"
        >
          <!-- Absolute link covering the card -->
          <NuxtLink :to="`/dashboard/automation/${trigger.id}`" class="absolute inset-0 z-0"></NuxtLink>

          <div class="flex items-start gap-6 relative z-10">
            <div class="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Instagram class="w-8 h-8 text-gray-700" />
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-bold tracking-widest px-2.5 py-1 bg-white/5 text-gray-400 rounded-lg uppercase">POST: {{ trigger.instagram_post_id?.substring(0, 8) }}...</span>
                <div v-if="trigger.chatbot_id" class="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                   <Bot class="w-2.5 h-2.5 text-primary" />
                   <span class="text-[8px] font-black text-primary uppercase">AI AGENT</span>
                </div>
                <span v-if="trigger.is_active" class="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  LIVE & WATCHING
                </span>
                <span v-else class="text-[9px] font-bold text-gray-600 uppercase">PAUSED</span>
              </div>
              <h4 class="text-sm font-bold text-white uppercase italic-none">Auto-Reply via {{ trigger.chatbots?.name || 'Assigned Agent' }}</h4>
              <div class="flex flex-wrap gap-4 pt-1">
                <div class="flex items-center gap-2">
                  <Filter class="w-3.5 h-3.5 text-gray-600" />
                  <span class="text-[10px] font-bold text-gray-500 uppercase">{{ trigger.keywords?.length ? trigger.keywords.join(', ') : 'All Comments' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <MessageCircle class="w-3.5 h-3.5 text-gray-600" />
                  <span class="text-[10px] font-bold text-gray-500 uppercase">{{ trigger.reply_in_comment ? 'Comment' : '' }} {{ trigger.reply_in_dm ? '+ DM' : '' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 self-end md:self-center relative z-10">
            <button 
              @click="toggleTriggerStatus(trigger)"
              :class="[
                'px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all uppercase',
                trigger.is_active ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-primary text-black hover:bg-primary-accent'
              ]"
            >
              {{ trigger.is_active ? 'pause' : 'activate' }}
            </button>
            <button 
              @click="handleDeleteTrigger(trigger.id)"
              class="p-2 text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-black/90 backdrop-blur-md" @click="showCreateModal = false"></div>
      
      <div class="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 h-[85vh] flex flex-col">
        <div class="p-8 border-b border-white/5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-white tracking-tight italic-none uppercase">Create Automation Rule</h3>
              <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Select a post and assign a specialized agent</p>
            </div>
            <button @click="showCreateModal = false" class="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
              <Plus class="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- Part 1: Select Post -->
            <div class="space-y-6">
              <div class="flex items-center justify-between mb-4">
                <label class="text-[11px] font-bold tracking-widest text-gray-500 uppercase">1. Select Instagram Account & Post</label>
                <button @click="fetchPosts" class="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Refresh Posts">
                  <RefreshCw :class="['w-4 h-4', isFetchingPosts ? 'animate-spin' : '']" />
                </button>
              </div>

              <div class="space-y-3">
                <select 
                  v-model="selectedAccountId"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white uppercase text-[10px] font-bold tracking-widest focus:border-primary/50 outline-none mb-6 appearance-none"
                >
                  <option v-for="acc in accounts" :key="acc.id" :value="acc.id" class="text-black bg-white">{{ acc.username }}</option>
                </select>
              </div>

              <div v-if="isFetchingPosts" class="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                <Loader2 class="w-8 h-8 animate-spin text-primary mb-4" />
                <p class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Synchronizing with Instagram Meta API...</p>
              </div>

              <div v-else-if="posts.length > 0" class="space-y-8">
                <div class="grid grid-cols-2 gap-4">
                  <div 
                    v-for="post in posts" 
                    :key="post.id"
                    @click="newTrigger.instagram_post_id = post.id"
                    :class="[
                      'relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group',
                      newTrigger.instagram_post_id === post.id ? 'border-primary shadow-lg shadow-primary/20 scale-95' : 'border-white/5 hover:border-white/20'
                    ]"
                  >
                    <!-- Video/Image Preview -->
                    <img 
                      :src="`/api/instagram/proxy-image?url=${encodeURIComponent(post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url)}`"
                      class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      @error="(e: any) => { e.target.style.display='none'; e.target.nextElementSibling?.classList.remove('hidden') }"
                    />
                    <div class="hidden absolute inset-0 flex items-center justify-center bg-white/5">
                      <ImageIcon class="w-8 h-8 text-gray-700" />
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                      <p class="text-[9px] text-white line-clamp-2 leading-tight uppercase font-bold">{{ post.caption }}</p>
                    </div>
                    <div v-if="newTrigger.instagram_post_id === post.id" class="absolute top-3 right-3 bg-primary text-black rounded-full p-1 shadow-lg">
                      <CheckCircle2 class="w-4 h-4" />
                    </div>
                    <div v-if="post.media_type === 'VIDEO'" class="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                      video
                    </div>
                  </div>
                </div>

                <!-- Load More Button -->
                <button 
                  v-if="nextPageCursor"
                  @click="fetchPosts(true)"
                  :disabled="isFetchingMore"
                  class="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold text-gray-500 hover:text-white hover:border-white/20 transition-all uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <Loader2 v-if="isFetchingMore" class="w-3 h-3 animate-spin" />
                  <span>{{ isFetchingMore ? 'fetching more media...' : 'load older posts' }}</span>
                </button>
              </div>

              <div v-else class="text-center py-20 grayscale opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
                <ImageIcon class="w-12 h-12 mx-auto mb-4" />
                <p class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">No media found for this account.</p>
              </div>
            </div>

            <!-- Part 2: Configuration -->
            <div class="space-y-8">
              <label class="text-[11px] font-bold tracking-widest text-gray-500 uppercase block mb-4">2. Rule Configuration</label>

              <!-- Plan Based Reply Logic Toggle -->
              <div class="bg-white/5 border border-white/10 rounded-[2rem] p-5 flex gap-3">
                <button 
                  @click="newTrigger.replyType = 'manual'"
                  type="button"
                  :class="[
                    'flex-1 py-4 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all',
                    newTrigger.replyType === 'manual' ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-gray-500 hover:text-white bg-white/5'
                  ]"
                >
                  Static Template
                </button>
                <button 
                  @click="planSlug !== 'starter' ? newTrigger.replyType = 'ai' : null"
                  type="button"
                  :class="[
                    'flex-1 py-4 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center justify-center gap-2 group',
                    newTrigger.replyType === 'ai' ? 'bg-primary text-black shadow-xl shadow-primary/20' : 'text-gray-500 hover:text-white bg-white/5',
                    planSlug === 'starter' ? 'opacity-50 cursor-not-allowed grayscale' : ''
                  ]"
                >
                  AI Dynamic Agent
                  <Zap v-if="planSlug === 'starter'" class="w-3 h-3 text-secondary group-hover:scale-125 transition-transform" />
                  <div v-if="planSlug === 'starter'" class="absolute -top-2 -right-2 bg-secondary text-black text-[7px] font-black px-2 py-0.5 rounded-full shadow-lg">PRO</div>
                </button>
              </div>

              <div class="space-y-6">
                <!-- AI Agent Selection (Conditional) -->
                <div v-if="newTrigger.replyType === 'ai'" class="space-y-4">
                  <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Assign AI Specialist</label>
                  <div class="grid grid-cols-1 gap-3">
                    <div 
                      v-for="bot in chatbots" 
                      :key="bot.id"
                      @click="newTrigger.chatbot_id = bot.id"
                      :class="[
                        'flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group',
                        newTrigger.chatbot_id === bot.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-white/5 border-white/5 hover:border-white/10'
                      ]"
                    >
                      <div :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-colors', newTrigger.chatbot_id === bot.id ? 'bg-primary text-black' : 'bg-white/5 text-gray-500 group-hover:bg-white/10']">
                        <Bot class="w-5 h-5" />
                      </div>
                      <div class="flex-1">
                        <p class="text-xs font-bold text-white uppercase tracking-tight italic-none">{{ bot.name }}</p>
                        <p class="text-[9px] text-gray-500 uppercase mt-0.5">RAG Knowledge Indexed</p>
                      </div>
                      <div v-if="newTrigger.chatbot_id === bot.id" class="text-primary">
                        <CheckCircle2 class="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Manual Template (Conditional) -->
                <div v-else class="space-y-4">
                   <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Reply Template</label>
                   <textarea 
                    v-model="newTrigger.dm_template"
                    rows="4"
                    class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-[11px] font-medium focus:border-primary/50 outline-none resize-none transition-all"
                    placeholder="Example: Hello! Thanks for reaching out. Someone from our team will get back to you shortly."
                   ></textarea>
                   <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">This message will be dispatched automatically whenever a comment is detected on the selected post.</p>
                </div>

                <!-- Keywords -->
                <div class="space-y-3">
                   <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Keyword Trigger (Optional)</label>
                   <input 
                    v-model="newTrigger.keywords"
                    placeholder="e.g. price, info, help (leave empty for all)"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-[10px] font-bold uppercase tracking-widest focus:border-primary/50 outline-none"
                   />
                </div>

                <!-- Response Channels -->
                <div class="space-y-4 pt-4 border-t border-white/5">
                  <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Response Channels</label>
                  <div class="grid grid-cols-2 gap-4">
                    <div 
                      @click="newTrigger.reply_in_comment = !newTrigger.reply_in_comment"
                      :class="['flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer', newTrigger.reply_in_comment ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-white/[0.02]']"
                    >
                      <div :class="[newTrigger.reply_in_comment ? 'text-primary' : 'text-gray-700']">
                        <MessageCircle class="w-5 h-5" />
                      </div>
                      <span class="text-[10px] font-bold uppercase tracking-widest" :class="newTrigger.reply_in_comment ? 'text-white' : 'text-gray-600'">Comment</span>
                    </div>
                    <div 
                      @click="newTrigger.reply_in_dm = !newTrigger.reply_in_dm"
                      :class="['flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer', newTrigger.reply_in_dm ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-white/[0.02]']"
                    >
                      <div :class="[newTrigger.reply_in_dm ? 'text-primary' : 'text-gray-700']">
                        <MousePointer2 class="w-5 h-5" />
                      </div>
                      <span class="text-[10px] font-bold uppercase tracking-widest" :class="newTrigger.reply_in_dm ? 'text-white' : 'text-gray-600'">Direct DM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="text-[10px] font-black text-white uppercase tracking-widest italic-none">Ready for deployment</p>
              <p class="text-[9px] text-gray-500 uppercase tracking-widest">Rules will apply instantly after forge</p>
            </div>
          </div>
          <button 
            @click="handleCreateTrigger"
            :disabled="!newTrigger.instagram_post_id || (newTrigger.replyType === 'ai' && !newTrigger.chatbot_id) || (newTrigger.replyType === 'manual' && !newTrigger.dm_template)"
            class="px-10 py-4 bg-primary text-black font-bold tracking-widest text-[11px] rounded-2xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/20 disabled:grayscale disabled:opacity-50 uppercase"
          >
            FORGE AUTOMATION
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-[#111111]/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem];
}
.italic-none {
  font-style: normal !important;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-white/10 rounded-full;
}

/* Ensure select options are visible in all systems/browsers */
select option {
  background-color: white !important;
  color: black !important;
}
</style>
