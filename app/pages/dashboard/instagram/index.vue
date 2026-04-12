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
  MoreVertical
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

// State
const accounts = ref<any[]>([])
const triggers = ref<any[]>([])
const isLoading = ref(true)
const isConnectLoading = ref(false)

// Fetch Data
const fetchData = async () => {
  if (!user.value?.id) return
  
  isLoading.value = true
  try {
    const [accountsRes, triggersRes] = await Promise.all([
      supabase.from('instagram_accounts').select('*').eq('user_id', user.value.id),
      supabase.from('instagram_comment_triggers').select('*, instagram_accounts(*)').eq('user_id', user.value.id)
    ])

    if (accountsRes.data) accounts.value = accountsRes.data
    if (triggersRes.data) triggers.value = triggersRes.data
  } catch (err) {
    console.error('error fetching instagram data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
  
  // Check for success/error query params from OAuth
  const route = useRoute()
  if (route.query.success) {
    // Show success notification or toast (could implement later)
    useRouter().replace({ query: {} })
  }
})

const handleConnect = () => {
  isConnectLoading.value = true
  window.location.href = '/api/auth/instagram'
}

const handleDeleteAccount = async (id: string) => {
  if (!confirm('are you sure you want to disconnect this account? all active automations will stop.')) return
  
  const { error } = await supabase
    .from('instagram_accounts')
    .delete()
    .eq('id', id)
  
  if (!error) {
    accounts.value = accounts.value.filter(a => a.id !== id)
    triggers.value = triggers.value.filter(t => t.instagram_account_id !== id)
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
  if (!confirm('delete this automation rule?')) return
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
    <!-- Header/CTA -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="max-w-xl">
        <h2 class="text-xl font-bold tracking-tight text-white mb-2 italic-none">connected accounts</h2>
        <p class="text-gray-500 text-sm italic-none">link your instagram business accounts to enable comment-to-dm automation.</p>
      </div>
      
      <button 
        @click="handleConnect"
        :disabled="isConnectLoading"
        class="flex items-center gap-3 px-6 py-3 bg-primary text-black font-bold rounded-2xl hover:bg-primary-accent transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
      >
        <Plus v-if="!isConnectLoading" class="w-5 h-5" />
        <Loader2 v-else class="w-5 h-5 animate-spin" />
        {{ isConnectLoading ? 'connecting...' : 'connect account' }}
      </button>
    </div>

    <!-- Accounts Grid -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
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

    <!-- Automations Section -->
    <div v-if="accounts.length > 0" class="space-y-8 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white mb-2">automation rules</h2>
          <p class="text-gray-500 text-sm">manage your active comment-to-dm triggers.</p>
        </div>
        <NuxtLink 
          to="/dashboard/instagram/new-rule"
          class="flex items-center gap-2 text-[11px] font-bold tracking-widest text-primary hover:text-primary-accent transition-colors"
        >
          <Plus class="w-4 h-4" />
          create rule
        </NuxtLink>
      </div>

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
    </div>

    <!-- Info Banner -->
    <div class="glass-card bg-primary-dark/10 border-primary/10 p-6 flex flex-col md:flex-row items-start gap-4">
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
  </div>
</template>

<style scoped>
.italic-none {
  font-style: normal !important;
}
</style>