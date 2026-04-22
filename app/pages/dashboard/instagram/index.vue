<script setup lang="ts">
import { 
  Plus, 
  Instagram, 
  Trash2, 
  RefreshCw, 
  MessageSquare, 
  Zap,
  Info,
  ExternalLink,
  Loader2,
  AlertCircle,
  MoreVertical,
  ShieldCheck,
  Crown,
  Lock
} from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { userId, limits, planSlug, canAdd, isLoading: authLoading } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const user = useSupabaseUser() // Keep user for email display if needed, but use userId for queries

const accounts = ref<any[]>([])
const triggers = ref<any[]>([])
const isConnectLoading = ref(false)

// Subscription & Limits are now provided by useAuth
const canConnectMore = computed(() => canAdd('accounts', accounts.value.length))
const canAddMoreRules = computed(() => canAdd('rules', triggers.value.length))

const dmUsage = computed(() => {
  // Mocking usage for now, this would come from a server-side counter in production
  return 12 
})

// Fetch Data using useAsyncData for robust hydration and reactivity
const { data: instagramData, pending: isDataLoading, refresh: refreshData } = useAsyncData('instagram-dashboard-data', async () => {
  const currentId = userId.value
  console.log('[DEBUG] useAsyncData fetching for user:', currentId)
  
  if (!currentId) return { accounts: [], triggers: [] }
  
  try {
    const [accountsRes, triggersRes] = await Promise.all([
      supabase.from('instagram_accounts').select('*').eq('user_id', currentId),
      supabase.from('instagram_comment_triggers').select('*, instagram_accounts(*)').eq('user_id', currentId)
    ])

    console.log('[DEBUG] Accounts fetch result:', {
      count: accountsRes.data?.length,
      error: accountsRes.error
    })

    return {
      accounts: accountsRes.data || [],
      triggers: triggersRes.data || []
    }
  } catch (err) {
    console.error('error fetching instagram data:', err)
    return { accounts: [], triggers: [] }
  }
}, { 
  watch: [userId],
  immediate: true,
  server: false
})

const isLoading = computed(() => authLoading.value || isDataLoading.value)


// Sync state when data changes
watch(instagramData, (newData) => {
  if (newData) {
    accounts.value = newData.accounts
    triggers.value = newData.triggers
  }
}, { immediate: true })

onMounted(() => {
  // 1. Clean up Facebook OAuth fragment (#_=_ at end of URL)
  if (window.location.hash === '#_=_') {
    window.history.replaceState('', document.title, window.location.pathname + window.location.search);
  }

  // 2. Check for success/error query params from OAuth
  const route = useRoute()
  if (route.query.success) {
    notify.success('successfully connected instagram account')
    refreshData()
    useRouter().replace({ query: {} })
  }
  if (route.query.error) {
    notify.error(decodeURIComponent(route.query.error as string))
    useRouter().replace({ query: {} })
  }
})

const handleConnect = async () => {
  console.log('[DEBUG] handleConnect triggered')
  errorMessage.value = ''

  if (!canConnectMore.value) {
    notify.warn(`you have reached your limit of ${limits.value.maxAccounts} account(s). please upgrade your plan to connect more.`)
    return
  }
  
  // Try to get user from ref first, then fallback to direct client call
  let userId = user.value?.id
  
  if (!userId) {
    console.log('[DEBUG] Ref-based user ID missing, trying direct client fetch...')
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    userId = supabaseUser?.id
  }

  if (!userId) {
    console.warn('[DEBUG] No user ID found in handleConnect after fallback')
    notify.warn('your session is still loading. please wait a second and try again.')
    return
  }
  
  console.log('[DEBUG] Redirecting with userId:', userId)
  isConnectLoading.value = true
  
  // Use navigateTo with external: true for more reliable redirects in Nuxt 3/4
  await navigateTo(`/api/auth/instagram?userId=${userId}`, { 
    external: true,
    replace: true 
  }).catch(err => {
    console.error('[DEBUG] Navigation failed:', err)
    notify.error('failed to initiate connection. please refresh and try again.')
    isConnectLoading.value = false
  })
}

const handleDeleteAccount = async (id: string) => {
  if (!(await notify.confirm('are you sure you want to disconnect this account? all active automations will stop.'))) return
  
  const { error } = await supabase
    .from('instagram_accounts')
    .delete()
    .eq('id', id)
  
  if (!error) {
    accounts.value = accounts.value.filter(a => a.id !== id)
    triggers.value = triggers.value.filter(t => t.instagram_account_id !== id)
    notify.success('Account successfully disconnected.')
  }
}

const toggleTrigger = async (trigger: any) => {
  const { error } = await supabase
    .from('instagram_comment_triggers')
    .update({ is_active: !trigger.is_active })
    .eq('id', trigger.id)
  
  if (!error) {
    trigger.is_active = !trigger.is_active
  }
}

const deleteTrigger = async (id: string) => {
  if (!(await notify.confirm('delete this automation rule?'))) return
  const { error } = await supabase
    .from('instagram_comment_triggers')
    .delete()
    .eq('id', id)
  
  if (!error) {
    triggers.value = triggers.value.filter(t => t.id !== id)
  }
}
</script>

<template>
  <div class="space-y-12 pb-24 lg:pb-0">
    <!-- Feedback Messages -->
    <div v-if="false"> <!-- legacy banners removed --> </div>

    <!-- Header/CTA -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <div class="flex items-center gap-2 mb-2">
          <h2 class="text-xl font-bold tracking-tight text-white italic-none uppercase tracking-[0.2em]">connected accounts</h2>
          <div class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 translate-y-[-1px]">
            <Crown v-if="planSlug === 'gold'" class="w-3 h-3" />
            <ShieldCheck v-else-if="planSlug === 'silver'" class="w-3 h-3" />
            <Zap v-else class="w-3 h-3" />
            {{ planSlug }}
          </div>
        </div>
        <p class="text-gray-500 text-sm italic-none">link your instagram business accounts. current usage: <span class="text-white font-bold">{{ accounts.length }}/{{ limits.maxAccounts }}</span></p>
      </div>
      
      <div class="flex items-center gap-4">
        <NuxtLink v-if="!canConnectMore" to="/dashboard/settings" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
          Upgrade Plan
        </NuxtLink>
        <button 
          type="button"
          @click="handleConnect"
          :disabled="isConnectLoading || !canConnectMore"
          class="flex items-center gap-3 px-6 py-3 bg-primary text-black font-bold rounded-2xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer z-20"
        >
          <Lock v-if="!canConnectMore" class="w-4 h-4" />
          <Plus v-else-if="!isConnectLoading" class="w-5 h-5" />
          <Loader2 v-else class="w-5 h-5 animate-spin" />
          {{ isConnectLoading ? 'connecting...' : (canConnectMore ? 'connect account' : 'limit reached') }}
        </button>
      </div>
    </div>

    <!-- Accounts Grid -->
    <ClientOnly>
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="glass-card p-8 border-white/5 bg-[#0a0a0a] min-h-[300px] flex flex-col">
          <div class="flex items-center gap-4 mb-8">
            <Skeleton width="4rem" height="4rem" circle />
            <div class="space-y-2 flex-1">
              <Skeleton width="60%" height="1rem" />
              <Skeleton width="30%" height="0.6rem" />
            </div>
          </div>
          <div class="mt-auto space-y-4 pt-10">
             <Skeleton width="100%" height="1rem" />
             <div class="flex gap-4 pt-2">
                <Skeleton width="80%" height="2.5rem" radius="0.75rem" />
                <Skeleton width="2.5rem" height="2.5rem" radius="0.5rem" />
             </div>
          </div>
        </div>
      </div>

      <div v-else-if="accounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="account in accounts" 
          :key="account.id"
          class="glass-card group relative overflow-hidden flex flex-col"
        >
          <!-- Background Accent -->
          <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Instagram class="w-20 h-20 text-white" />
          </div>

          <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 p-0.5">
              <img :src="account.profile_picture || '/placeholder-avatar.png'" class="w-full h-full rounded-full object-cover" />
            </div>
            <div>
              <h4 class="font-bold text-white tracking-tight">{{ account.username }}</h4>
              <div class="flex items-center gap-1.5 mt-1">
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span class="text-[10px] font-bold tracking-widest text-gray-500">active</span>
              </div>
            </div>
          </div>

          <div class="mt-auto flex items-center gap-3 border-t border-white/5 pt-4">
            <button 
              @click="handleDeleteAccount(account.id)"
              class="flex-1 py-2 text-[10px] font-bold tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
            >
              disconnect
            </button>
            <NuxtLink 
              :to="`https://instagram.com/${account.username}`" 
              target="_blank"
              class="p-2 text-gray-500 hover:text-white transition-colors"
            >
              <ExternalLink class="w-4 h-4" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <div v-else class="glass-card flex flex-col items-center py-16 text-center border-dashed border-white/10">
        <div class="w-16 h-16 bg-white/[0.02] rounded-2xl flex items-center justify-center mb-6 border border-white/5">
          <Instagram class="w-8 h-8 text-gray-500" />
        </div>
        <h3 class="text-lg font-bold text-white mb-2">no accounts linked yet</h3>
        <p class="text-gray-500 text-sm max-w-sm mb-8">connect your first account to start automating your instagram engagement.</p>
      </div>
    </ClientOnly>

    <!-- Automations Section -->
    <div v-if="accounts.length > 0" class="space-y-8 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white mb-2 uppercase tracking-[0.2em]">automation rules</h2>
          <p class="text-gray-500 text-sm">manage your active triggers. usage: <span class="text-white font-bold">{{ triggers.length }}/{{ limits.maxRules }}</span></p>
        </div>
        <div class="flex items-center gap-4">
           <NuxtLink v-if="!canAddMoreRules" to="/dashboard/settings" class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
            Increase Limit
          </NuxtLink>
          <NuxtLink 
            v-if="canAddMoreRules"
            to="/dashboard/instagram/new-rule"
            class="flex items-center gap-2 text-[11px] font-bold tracking-widest text-primary hover:text-primary-accent transition-colors"
          >
            <Plus class="w-4 h-4" />
            create rule
          </NuxtLink>
          <div v-else class="flex items-center gap-2 text-[11px] font-bold tracking-widest text-gray-600 cursor-not-allowed">
            <Lock class="w-4 h-4" />
            limit reached
          </div>
        </div>
      </div>

      <ClientOnly>
        <div v-if="triggers.length > 0" class="space-y-4">
          <div 
            v-for="trigger in triggers" 
            :key="trigger.id"
            class="glass-card hover:border-white/10 transition-all"
          >
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap class="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div class="flex items-center gap-3 mb-1">
                    <span class="text-xs font-bold text-white tracking-tight">keywords: </span>
                    <div class="flex gap-2">
                      <span 
                        v-for="kw in trigger.keywords" 
                        :key="kw"
                        class="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400"
                      >
                        #{{ kw }}
                      </span>
                    </div>
                  </div>
                  <p class="text-[11px] text-gray-500 line-clamp-1 italic-none">
                    response: {{ trigger.dm_template }}
                  </p>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-[9px] font-bold tracking-widest text-gray-600 uppercase">account:</span>
                    <span class="text-[10px] text-primary">@{{ trigger.instagram_accounts?.username }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4 md:border-l border-white/5 md:pl-6">
                <div class="flex items-center gap-3 pr-4 border-r border-white/5">
                  <span class="text-[10px] font-bold tracking-widest text-gray-500">{{ trigger.is_active ? 'active' : 'paused' }}</span>
                  <button 
                    @click="toggleTrigger(trigger)"
                    class="w-10 h-5 rounded-full relative transition-colors"
                    :class="trigger.is_active ? 'bg-primary' : 'bg-white/10'"
                  >
                    <div 
                      class="absolute top-1 left-1 w-3 h-3 bg-black rounded-full transition-transform"
                      :class="trigger.is_active ? 'translate-x-5' : ''"
                    ></div>
                  </button>
                </div>
                <button @click="deleteTrigger(trigger.id)" class="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center glass-card border-dashed border-white/5">
          <p class="text-xs text-gray-500">no active triggers found. create one to start automating.</p>
        </div>
      </ClientOnly>
    </div>

    <!-- Info Banner -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="glass-card bg-primary-dark/10 border-primary/10 p-6 flex items-start gap-4">
        <div class="p-2 bg-primary/10 rounded-lg shrink-0">
          <Info class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-white mb-1 tracking-tight">instagram guidelines requirement</h4>
          <p class="text-xs text-gray-500 leading-relaxed italic-none">
            to ensure your account safety, avoid sending identical automated messages to more than 50 people per hour. 
            we automatically space out messages to stay within platform limits.
          </p>
        </div>
      </div>

      <div class="glass-card bg-primary-dark/10 border-primary/10 p-6 flex items-start gap-4">
        <div class="p-2 bg-primary/10 rounded-lg shrink-0">
          <Zap class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-white mb-1 tracking-tight uppercase tracking-widest">monthly automation usage</h4>
          <div class="flex items-end gap-2 mt-2">
            <span class="text-2xl font-black text-white leading-none">{{ dmUsage }}</span>
            <span class="text-xs text-gray-500 font-bold uppercase tracking-widest pb-1">/ {{ limits.maxDms === -1 ? 'unlimited' : limits.maxDms }} dms sent</span>
          </div>
          <p class="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-widest">resets in {{ 30 - new Date().getDate() }} days</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.italic-none {
  font-style: normal !important;
}
</style>