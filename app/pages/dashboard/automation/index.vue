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
  Image as ImageIcon,
  ArrowRight,
  User,
  Hash,
  ChevronRight
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'
import AutomationNode from '~~/app/components/automation/AutomationNode.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const auth = useAuth()
const { userId, limits, planSlug: userPlan } = auth
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

// Node-based Creation Flow State
const currentStep = ref(1)
const isCreating = ref(false)

// Form
const newTrigger = ref({
  instagram_post_id: '',
  keywords: '',
  chatbot_id: '',
  dm_template: 'Hello! How can I help?',
  reply_in_comment: true,
  reply_in_dm: false,
  replyType: (userPlan?.value === 'starter') ? 'manual' : 'ai'
})

// Watch planSlug to update replyType if it changes (e.g. after upgrade)
watch(userPlan, (newSlug) => {
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
const resetNewTrigger = () => {
  newTrigger.value = {
    instagram_post_id: '',
    keywords: '',
    chatbot_id: '',
    dm_template: 'Hello! How can I help?',
    reply_in_comment: true,
    reply_in_dm: false,
    replyType: userPlan?.value === 'starter' ? 'manual' : 'ai'
  }
  selectedAccountId.value = accounts.value[0]?.id || ''
  currentStep.value = 1
}

const handleCreateTrigger = async () => {
  if (!newTrigger.value.instagram_post_id) return
  if (newTrigger.value.replyType === 'ai' && !newTrigger.value.chatbot_id) return

  isCreating.value = true
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

      if (postError) {
        console.warn('[Trigger] Full upsert failed, retrying with minimal payload:', postError.message)
        const fallback = await supabase
          .from('instagram_posts')
          .upsert({ id: selectedPost.id }, { onConflict: 'id', ignoreDuplicates: true })
        postError = fallback.error
      }

      if (postError) {
        throw new Error(`Could not save post to database: ${postError.message}`)
      }
    }

    // Step 2: Create the trigger referencing the (now-local) post
    const { error } = await supabase
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

    if (error) throw error
    await fetchData()
    showCreateModal.value = false
    resetNewTrigger()
  } catch (err) {
    console.error('Error creating trigger:', err)
    alert('Failed to create automation rule.')
  } finally {
    isCreating.value = false
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
  if (showCreateModal.value) {
    fetchPosts()
    newTrigger.value.instagram_post_id = ''
  }
})

</script>

<template>
  <div class="space-y-12 pb-24">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-white mb-2 uppercase italic-none">Smart Automations</h2>
        <p class="text-gray-500 text-sm italic-none italic-none">Connect your AI agents to Instagram posts for
          auto-replies and lead generation.</p>
      </div>

      <button @click="showCreateModal = true; fetchPosts()"
        class="flex items-center gap-3 px-6 py-3 bg-primary text-black font-bold rounded-2xl transition-all shadow-lg shadow-primary/10 hover:bg-primary-accent">
        <Plus class="w-5 h-5" />
        CREATE NEW RULE
      </button>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i"
        class="glass-card flex flex-col md:flex-row md:items-center justify-between gap-6 opacity-60">
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
      <div v-if="triggers.length === 0"
        class="glass-card flex flex-col items-center py-20 text-center border-dashed border-white/10 bg-white/[0.01]">
        <Zap class="w-16 h-16 text-gray-800 mb-6" />
        <h3 class="text-lg font-bold text-white mb-2 tracking-tight italic-none">No active rules</h3>
        <p class="text-gray-500 text-[11px] max-w-sm mb-10 leading-relaxed uppercase tracking-widest italic-none">start
          by creating a rule to link a specific instagram post to one of your chatbots.</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <div v-for="trigger in triggers" :key="trigger.id"
          class="relative glass-card !p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.01] hover:border-white/10 transition-all group">
          <!-- Absolute link covering the card -->
          <NuxtLink :to="`/dashboard/automation/${trigger.id}`" class="absolute inset-0 z-0"></NuxtLink>

          <div class="flex items-start gap-6 relative z-10">
            <div
              class="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Instagram class="w-8 h-8 text-gray-700" />
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-3">
                <span
                  class="text-[10px] font-bold tracking-widest px-2.5 py-1 bg-white/5 text-gray-400 rounded-lg uppercase">POST:
                  {{ trigger.instagram_post_id?.substring(0, 8) }}...</span>
                <div v-if="trigger.chatbot_id"
                  class="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                  <Bot class="w-2.5 h-2.5 text-primary" />
                  <span class="text-[8px] font-black text-primary uppercase">AI AGENT</span>
                </div>
                <span v-if="trigger.is_active"
                  class="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase">
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
            <button @click="toggleTriggerStatus(trigger)" :class="[
              'px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all uppercase',
              trigger.is_active ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-primary text-black hover:bg-primary-accent'
            ]">
              {{ trigger.is_active ? 'pause' : 'activate' }}
            </button>
            <button @click="handleDeleteTrigger(trigger.id)"
              class="p-2 text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div> <!-- Create Modal: Node Builder -->
    <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <div class="absolute inset-0 bg-black/90 backdrop-blur-xl" @click="showCreateModal = false"></div>

      <div
        class="relative w-full max-w-5xl bg-[#050505] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 h-[90vh] flex flex-col">
        <!-- Modal Header -->
        <div class="p-8 border-b border-white/5 bg-white/[0.01]">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl font-black text-white tracking-tighter uppercase italic-none">Automation Builder</h3>
              <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Design your sequential
                auto-reply flow</p>
            </div>
            <button @click="showCreateModal = false"
              class="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
              <Plus class="w-6 h-6 rotate-45 text-gray-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        <!-- Node Builder Canvas -->
        <div
          class="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.05)_0%,transparent_50%)]">
          <div class="max-w-3xl mx-auto space-y-0">

            <!-- Node 1: Account Selection -->
            <AutomationNode title="1. Source Node" description="Choose the Instagram account to monitor"
              :status="currentStep === 1 ? 'active' : (currentStep > 1 ? 'completed' : 'pending')" :icon="Instagram"
              is-first>
              <div v-if="currentStep === 1" class="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div class="grid grid-cols-1 gap-2">
                  <div v-for="acc in accounts" :key="acc.id" @click="selectedAccountId = acc.id; currentStep = 2"
                    :class="[
                      'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group',
                      selectedAccountId === acc.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-white/5 border-white/5 hover:border-white/10'
                    ]">
                    <div
                      class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                      <img v-if="acc.profile_picture" :src="acc.profile_picture" class="w-full h-full object-cover" />
                      <User v-else class="w-5 h-5 text-gray-500" />
                    </div>
                    <div class="flex-1">
                      <p class="text-xs font-bold text-white uppercase tracking-tight">{{ acc.username }}</p>
                      <p class="text-[8px] text-gray-500 uppercase tracking-widest">{{ acc.platform_id }}</p>
                    </div>
                    <ChevronRight class="w-4 h-4 text-gray-700 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
              <div v-else-if="selectedAccountId" class="flex items-center gap-3 mt-4" @click="currentStep = 1">
                <div
                  class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all">
                  <span class="text-[10px] font-bold text-primary uppercase">{{ accounts.find(a => a.id === selectedAccountId)?.username }}</span>
                  <Settings2 class="w-3 h-3 text-gray-600" />
                </div>
              </div>
            </AutomationNode>

            <!-- Node 2: Post Selection -->
            <AutomationNode title="2. Trigger Node" description="Select the post that triggers this automation"
              :status="currentStep === 2 ? 'active' : (currentStep > 2 ? 'completed' : 'pending')" :icon="ImageIcon">
              <div v-if="currentStep === 2" class="space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div v-if="isFetchingPosts" class="flex flex-col items-center justify-center py-10 opacity-50">
                  <Loader2 class="w-6 h-6 animate-spin text-primary mb-3" />
                  <p class="text-[9px] font-bold tracking-widest text-gray-500 uppercase">Fetching latest media...</p>
                </div>
                <div v-else class="grid grid-cols-3 gap-3">
                  <div v-for="post in posts" :key="post.id"
                    @click="newTrigger.instagram_post_id = post.id; currentStep = 3" :class="[
                      'relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 active:scale-95',
                      newTrigger.instagram_post_id === post.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-white/5'
                    ]">
                    <img
                      :src="`/api/instagram/proxy-image?url=${encodeURIComponent(post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url)}`"
                      class="absolute inset-0 w-full h-full object-cover" />
                    <div v-if="post.media_type === 'VIDEO'"
                      class="absolute top-1 left-1 bg-black/60 text-[7px] font-bold uppercase p-1 rounded-md">video
                    </div>
                  </div>
                </div>
                <button v-if="nextPageCursor" @click="fetchPosts(true)"
                  class="w-full py-2 border border-dashed border-white/10 rounded-xl text-[8px] font-bold uppercase tracking-widest text-gray-500">Load
                  More</button>
              </div>
              <div v-else-if="newTrigger.instagram_post_id" class="mt-4" @click="currentStep = 2">
                <div
                  class="w-20 h-20 rounded-xl border border-primary/30 overflow-hidden cursor-pointer hover:border-primary transition-all group relative">
                  <img
                    :src="`/api/instagram/proxy-image?url=${encodeURIComponent(getPostById(newTrigger.instagram_post_id)?.thumbnail_url || getPostById(newTrigger.instagram_post_id)?.media_url || '')}`"
                    class="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                  <div
                    class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings2 class="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </AutomationNode>

            <!-- Node 3: Filter Node -->
            <AutomationNode title="3. Filter Node" description="Configure keyword triggers for comments"
              :status="currentStep === 3 ? 'active' : (currentStep > 3 ? 'completed' : 'pending')" :icon="Filter">
              <div v-if="currentStep === 3" class="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <input v-model="newTrigger.keywords" placeholder="e.g. price, info, help (comma separated)"
                  class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-[11px] font-bold uppercase tracking-widest focus:border-primary/50 outline-none"
                  @keypress.enter="currentStep = 4" />
                <p class="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-2">Leave blank to respond to
                  all comments</p>
                <button @click="currentStep = 4"
                  class="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <span>Continue to logic</span>
                  <ArrowRight class="w-4 h-4" />
                </button>
              </div>
              <div v-else-if="currentStep > 3" class="mt-4 flex items-center gap-3" @click="currentStep = 3">
                <div
                  class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/10">
                  <span class="text-[10px] font-bold text-white uppercase">{{ newTrigger.keywords || 'All Comments' }}</span>
                  <Settings2 class="w-3 h-3 text-gray-600" />
                </div>
              </div>
            </AutomationNode>

            <!-- Node 4: Action Node -->
            <AutomationNode title="4. Action Node" description="Define the response strategy"
              :status="currentStep === 4 ? 'active' : 'pending'" :icon="Zap" is-last>
              <div v-if="currentStep === 4" class="space-y-8 animate-in slide-in-from-top-2 duration-300">
                <!-- Reply Type Toggle -->
                <div class="flex p-2 bg-white/5 border border-white/10 rounded-2xl gap-2">
                  <button @click="newTrigger.replyType = 'manual'"
                    :class="['flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all', newTrigger.replyType === 'manual' ? 'bg-white text-black' : 'text-gray-500 hover:text-white']">
                    Template
                  </button>
                  <button @click="userPlan !== 'starter' ? newTrigger.replyType = 'ai' : null"
                    :class="['flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative flex items-center justify-center gap-2', newTrigger.replyType === 'ai' ? 'bg-primary text-black' : 'text-gray-500 hover:text-white', userPlan === 'starter' ? 'opacity-50 cursor-not-allowed' : '']">
                    AI Agent
                    <div v-if="userPlan === 'starter'"
                      class="bg-secondary text-black text-[7px] font-black px-1.5 py-0.5 rounded-full">PRO</div>
                  </button>
                </div>

                <!-- AI Selector -->
                <div v-if="newTrigger.replyType === 'ai'" class="grid grid-cols-1 gap-2">
                  <div v-for="bot in chatbots" :key="bot.id" @click="newTrigger.chatbot_id = bot.id" :class="[
                    'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group',
                    newTrigger.chatbot_id === bot.id ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/5 hover:border-white/10'
                  ]">
                    <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Bot class="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p class="text-[11px] font-bold text-white uppercase">{{ bot.name }}</p>
                      <p class="text-[8px] text-gray-500 uppercase tracking-widest">Active RAG Logic</p>
                    </div>
                  </div>
                </div>

                <!-- Template Textarea -->
                <div v-else class="space-y-4">
                  <textarea v-model="newTrigger.dm_template" rows="4"
                    class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-[11px] font-medium focus:border-primary/50 outline-none resize-none"
                    placeholder="Enter your static response..."></textarea>
                </div>

                <!-- Channels -->
                <div class="grid grid-cols-2 gap-3 pb-6 border-b border-white/5">
                  <div @click="newTrigger.reply_in_comment = !newTrigger.reply_in_comment"
                    :class="['flex flex-col items-center gap-2 p-6 rounded-3xl border-2 transition-all cursor-pointer', newTrigger.reply_in_comment ? 'border-primary/50 bg-primary/5' : 'border-white/5 bg-white/[0.02]']">
                    <MessageCircle class="w-6 h-6"
                      :class="newTrigger.reply_in_comment ? 'text-primary' : 'text-gray-800'" />
                    <span class="text-[10px] font-bold uppercase tracking-widest"
                      :class="newTrigger.reply_in_comment ? 'text-white' : 'text-gray-600'">Comment</span>
                  </div>
                  <div @click="newTrigger.reply_in_dm = !newTrigger.reply_in_dm"
                    :class="['flex flex-col items-center gap-2 p-6 rounded-3xl border-2 transition-all cursor-pointer', newTrigger.reply_in_dm ? 'border-primary/50 bg-primary/5' : 'border-white/5 bg-white/[0.02]']">
                    <MousePointer2 class="w-6 h-6" :class="newTrigger.reply_in_dm ? 'text-primary' : 'text-gray-800'" />
                    <span class="text-[10px] font-bold uppercase tracking-widest"
                      :class="newTrigger.reply_in_dm ? 'text-white' : 'text-gray-600'">Direct DM</span>
                  </div>
                </div>

                <!-- Final Forge Action -->
                <div class="pt-4 flex flex-col gap-4">
                  <button @click="handleCreateTrigger"
                    :disabled="isCreating || !newTrigger.instagram_post_id || (newTrigger.replyType === 'ai' && !newTrigger.chatbot_id)"
                    class="w-full py-6 bg-primary text-black font-black uppercase tracking-[0.2em] text-sm rounded-3xl hover:bg-primary-accent transition-all shadow-2xl shadow-primary/20 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-4">
                    <Loader2 v-if="isCreating" class="w-5 h-5 animate-spin" />
                    <Zap v-else class="w-5 h-5 fill-current" />
                    <span>{{ isCreating ? 'Forging Logic...' : 'Deploy Automation' }}</span>
                  </button>
                  <p class="text-center text-[9px] text-gray-600 font-bold uppercase tracking-[0.15em]">Rules are
                    applied instantly to detected comments</p>
                </div>
              </div>
            </AutomationNode>

          </div>
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
