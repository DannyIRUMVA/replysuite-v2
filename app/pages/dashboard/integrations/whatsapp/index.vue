<script setup lang="ts">
import { 
  Plus, 
  MessageSquare, 
  Smartphone, 
  ArrowRight, 
  Activity, 
  ShieldCheck,
  Zap,
  Globe,
  Settings,
  MoreVertical,
  Trash2,
  Loader2
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { user, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

onMounted(() => {
  if (planSlug.value === 'starter' || !planSlug.value) {
    navigateTo('/pricing')
  }
})

const { data: accounts, pending: isLoading, refresh } = useAsyncData('whatsapp-accounts-list', async () => {
    const { data } = await supabase
        .from('whatsapp_accounts')
        .select('*, chatbots(name)')
        .order('created_at', { ascending: false })
    return data || []
})

const deleteAccount = async (id: string) => {
    if (!(await notify.confirm('Disconnect this number?'))) return
    const { error } = await supabase.from('whatsapp_accounts').delete().eq('id', id)
    if (!error) {
      notify.success('Disconnected.')
      refresh()
    }
}
</script>

<template>
  <div class="w-full space-y-12 pb-20">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <MessageSquare class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-foreground uppercase tracking-tight">Active Deployments</h2>
          <p class="text-[10px] font-black text-foreground/50 uppercase tracking-widest">Managed API Nodes</p>
        </div>
      </div>

      <NuxtLink to="/dashboard/integrations/whatsapp/setup" class="bg-primary text-black px-10 py-5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 flex items-center gap-3">
        <Plus class="w-4 h-4" />
        Connect New Number
      </NuxtLink>
    </div>

    <!-- Stats / Overview Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="stat in [
            { label: 'Active Nodes', value: accounts?.length || 0, icon: Zap },
            { label: 'System Health', value: '100%', icon: Activity },
            { label: 'Protocol', value: 'V21.0', icon: ShieldCheck }
        ]" :key="stat.label" class="glass-card p-8 border-foreground/10 bg-foreground/5 flex items-center gap-6">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <component :is="stat.icon" class="w-6 h-6 text-primary" />
            </div>
            <div>
                <p class="text-[9px] font-black text-foreground/50 uppercase tracking-widest">{{ stat.label }}</p>
                <p class="text-2xl font-black text-foreground tracking-tighter">{{ stat.value }}</p>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div v-if="isLoading" class="grid gap-6">
        <div v-for="i in 3" :key="i" class="h-32 bg-foreground/5 rounded-2xl animate-pulse"></div>
    </div>

    <div v-else-if="accounts && accounts.length > 0" class="grid gap-6">
        <div v-for="wa in accounts" :key="wa.id" class="group relative">
            <NuxtLink :to="`/dashboard/integrations/whatsapp/${wa.id}`" class="block glass-card p-10 bg-background border-foreground/10 hover:border-primary/20 hover:bg-foreground/[0.03] transition-all duration-500 overflow-hidden relative">
                <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                
                <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                            <MessageSquare class="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h3 class="text-3xl font-black text-foreground tracking-tighter uppercase">{{ wa.phone_number }}</h3>
                            <div class="flex items-center gap-4 mt-2">
                                <span class="text-[10px] font-black text-foreground/50 uppercase tracking-widest flex items-center gap-2">
                                    <div :class="['w-1.5 h-1.5 rounded-full', wa.status === 'deployed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]']"></div>
                                    {{ wa.status }}
                                </span>
                                <div class="w-px h-3 bg-foreground/10"></div>
                                <span class="text-[10px] font-black text-primary uppercase tracking-widest">
                                    {{ wa.chatbots?.name || 'No Agent Linked' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-6">
                        <div class="text-right hidden lg:block">
                            <p class="text-[9px] font-black text-foreground/50 uppercase tracking-[0.2em] mb-1">Asset Reference</p>
                            <p class="text-[10px] font-mono text-foreground/50">{{ wa.waba_id }}</p>
                        </div>
                        <div class="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center border border-foreground/10 group-hover:bg-primary group-hover:text-black transition-all duration-500">
                            <ArrowRight class="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </NuxtLink>
        </div>
    </div>

    <!-- Empty State -->
    <div v-else class="glass-card p-20 bg-foreground/[0.01] border-foreground/10 border-dashed flex flex-col items-center text-center space-y-8">
        <div class="w-24 h-24 rounded-2xl bg-foreground/5 flex items-center justify-center">
            <Smartphone class="w-10 h-10 text-foreground/50" />
        </div>
        <div class="max-w-md space-y-2">
            <h3 class="text-2xl font-black text-foreground uppercase tracking-tighter">No Active Protocols</h3>
            <p class="text-xs text-foreground/50 font-bold uppercase tracking-widest">Connect your first WhatsApp Business Line to begin AI automation.</p>
        </div>
        <NuxtLink to="/dashboard/integrations/whatsapp/setup" class="bg-primary text-black px-12 py-5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-primary/20">
            Establish Connection
        </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[28px];
}
</style>
