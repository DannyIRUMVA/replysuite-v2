<script setup lang="ts">
import { 
  ArrowLeft, 
  Save, 
  MessageSquare, 
  Zap, 
  Sparkles,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { userId, limits, canAdd, isAuthenticated } = useAuth()
const supabase = useSupabaseClient()
const router = useRouter()

const triggersCount = ref(0)
const canAddMore = computed(() => canAdd('rules', triggersCount.value))

// Form State
const accounts = ref<any[]>([])
const selectedAccountId = ref('')
const keywords = ref('')
const dmTemplate = ref('')
const isSaving = ref(false)
const isLoading = ref(true)

// Fetch accounts & current rule count on mount
onMounted(async () => {
  const currentId = userId.value
  if (!currentId) return
  
  const [accountsRes, triggersRes] = await Promise.all([
    supabase.from('instagram_accounts').select('*').eq('user_id', currentId),
    supabase.from('instagram_comment_triggers').select('id').eq('user_id', currentId)
  ])
  
  if (accountsRes.data) {
    accounts.value = accountsRes.data
    if (accountsRes.data.length > 0) {
      selectedAccountId.value = accountsRes.data[0].id
    }
  }

  if (triggersRes.data) {
    triggersCount.value = triggersRes.data.length
  }

  isLoading.value = false
})

const handleSave = async () => {
  if (!canAddMore.value) {
    alert(`you have reached your limit of ${limits.value.maxRules} rule(s). please upgrade your plan.`)
    return
  }

  if (!selectedAccountId.value || !keywords.value || !dmTemplate.value) {
    alert('please fill in all required fields.')
    return
  }

  isSaving.value = true
  
  const keywordArray = keywords.value.split(',').map(k => k.trim().toLowerCase()).filter(k => k)

  try {
    const { error } = await supabase
      .from('instagram_comment_triggers')
      .insert({
        user_id: userId.value,
        instagram_account_id: selectedAccountId.value,
        keywords: keywordArray,
        dm_template: dmTemplate.value,
        is_active: true
      })

    if (error) throw error
    
    router.push('/dashboard/instagram')
  } catch (err: any) {
    console.error('error saving trigger:', err)
    alert('failed to save automation rule. please try again.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl pb-24 lg:pb-0">
    <!-- Breadcrumb/Back -->
    <NuxtLink 
      to="/dashboard/instagram" 
      class="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 group"
    >
      <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      <span class="text-[10px] font-bold tracking-widest uppercase">back to dashboard</span>
    </NuxtLink>

    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div class="max-w-xl">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 bg-primary/10 rounded-lg">
            <Zap class="w-5 h-5 text-primary" />
          </div>
          <span class="text-[10px] font-bold tracking-widest text-primary uppercase">new automation</span>
        </div>
        <h1 class="text-3xl font-black tracking-tighter text-white leading-tight mb-2">forge a comment trigger.</h1>
        <p class="text-gray-500 text-sm italic-none">define how your ai or template responds to specific community engagement.</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
    </div>

    <div v-else-if="accounts.length === 0" class="glass-card p-12 text-center">
      <AlertCircle class="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h3 class="text-lg font-bold text-white mb-2 uppercase tracking-tight">no accounts connected</h3>
      <p class="text-gray-500 text-sm mb-6">you need to connect an instagram account before creating automation rules.</p>
      <NuxtLink to="/dashboard/instagram" class="btn-primary inline-flex">connect account now</NuxtLink>
    </div>

    <div v-else-if="!canAddMore" class="glass-card p-12 text-center border-primary/20 bg-primary/5">
      <Lock class="w-12 h-12 text-primary mx-auto mb-4" />
      <h3 class="text-lg font-bold text-white mb-2 uppercase tracking-tight">rule limit reached</h3>
      <p class="text-gray-500 text-sm mb-6 max-w-md mx-auto">you are currently using {{ triggersCount }} of {{ limits.maxRules }} available rules. upgrade your plan to forge more automations.</p>
      <NuxtLink to="/dashboard/settings" class="btn-primary inline-flex">upgrade membership</NuxtLink>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main Form -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Step 1: Account -->
        <div class="glass-card">
          <h4 class="text-xs font-bold text-white/40 tracking-widest uppercase mb-6 flex items-center gap-2">
            <span class="w-1 h-1 rounded-full bg-primary"></span>
            select account
          </h4>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              v-for="account in accounts" 
              :key="account.id"
              @click="selectedAccountId = account.id"
              class="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left"
              :class="selectedAccountId === account.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'"
            >
              <img :src="account.profile_picture || '/placeholder-avatar.png'" class="w-10 h-10 rounded-full border border-white/10" />
              <div class="overflow-hidden">
                <p class="text-xs font-bold text-white truncate">{{ account.username }}</p>
                <p class="text-[10px] text-gray-500 truncate">ig business account</p>
              </div>
              <div v-if="selectedAccountId === account.id" class="ml-auto">
                <Check class="w-4 h-4 text-primary" />
              </div>
            </button>
          </div>
        </div>

        <!-- Step 2: Keywords -->
        <div class="glass-card">
          <h4 class="text-xs font-bold text-white/40 tracking-widest uppercase mb-6 flex items-center gap-2">
            <span class="w-1 h-1 rounded-full bg-primary"></span>
            trigger keywords
          </h4>
          
          <div class="space-y-4">
            <div class="relative">
              <Search class="absolute left-4 top-4 w-4 h-4 text-gray-500" />
              <input 
                v-model="keywords"
                type="text" 
                placeholder="e.g. price, details, info, how to buy"
                class="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:border-primary/30 focus:outline-none transition-colors"
              />
            </div>
            <p class="text-[10px] text-gray-500 px-4 italic-none">enter keywords separated by commas. automation will trigger if any keyword is found in a comment.</p>
          </div>
        </div>

        <!-- Step 3: Response -->
        <div class="glass-card">
          <h4 class="text-xs font-bold text-white/40 tracking-widest uppercase mb-6 flex items-center gap-2">
            <span class="w-1 h-1 rounded-full bg-primary"></span>
            direct message response
          </h4>
          
          <div class="space-y-4">
            <textarea 
              v-model="dmTemplate"
              rows="5"
              placeholder="hey! here are the details you requested..."
              class="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-sm text-white focus:border-primary/30 focus:outline-none transition-colors resize-none"
            ></textarea>
            
            <div class="flex items-center gap-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <Sparkles class="w-5 h-5 text-primary shrink-0" />
              <p class="text-[10px] text-gray-400 italic-none">
                <span class="text-primary font-bold">pro tip:</span> personalization tags like {username} will be supported soon for elite members.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview / Summary -->
      <div class="space-y-6">
        <div class="glass-card sticky top-8">
           <h4 class="text-xs font-bold text-white tracking-widest uppercase mb-8">automation summary</h4>
           
           <div class="space-y-8">
              <div class="flex gap-4">
                <div class="w-0.5 bg-primary/30 rounded-full"></div>
                <div>
                  <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">when someone says</p>
                  <p class="text-xs text-white break-words">{{ keywords || '...' }}</p>
                </div>
              </div>

              <div class="flex gap-4">
                <div class="w-0.5 bg-primary/30 rounded-full"></div>
                <div>
                  <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">replysuite will dm</p>
                  <p class="text-xs text-white italic-none line-clamp-4">{{ dmTemplate || '...' }}</p>
                </div>
              </div>
           </div>

           <button 
              @click="handleSave"
              :disabled="isSaving || !canAddMore"
              class="w-full mt-10 flex items-center justify-center gap-3 py-4 bg-primary text-black font-black rounded-2xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
           >
              <Lock v-if="!canAddMore" class="w-5 h-5" />
              <Save v-else-if="!isSaving" class="w-5 h-5" />
              <Loader2 v-else class="w-5 h-5 animate-spin" />
              {{ isSaving ? 'forging...' : (canAddMore ? 'activate rule' : 'limit reached') }}
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
</style>
