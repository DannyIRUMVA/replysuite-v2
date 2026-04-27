<script setup lang="ts">
import { 
  MessageSquare, 
  Plus, 
  Loader2, 
  HelpCircle,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Zap
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { user, setInteracting, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const manualPhone = ref('')
const manualPhoneId = ref('')
const manualWabaId = ref('')
const manualToken = ref('')
const isSubmittingManual = ref(false)
const manualGuideUrl = 'https://docs.replysuite.com/integrations/whatsapp'

const submitManualSetup = async () => {
    if (!manualPhone.value || !manualPhoneId.value || !manualWabaId.value || !manualToken.value) {
        notify.warn('Please fill in all manual mapping attributes.')
        return
    }

    isSubmittingManual.value = true
    try {
        const response: any = await $fetch('/api/whatsapp/connect', {
            method: 'POST',
            body: {
                phone_number: manualPhone.value,
                phone_number_id: manualPhoneId.value,
                waba_id: manualWabaId.value,
                accessToken: manualToken.value
            }
        })
        
        notify.success(response.message || 'Manual Activation Successful!')
        navigateTo('/dashboard/integrations/whatsapp')
    } catch (err: any) {
        console.error('Manual activation error:', err)
        notify.error(`Manual Activation Failed: ${err.data?.statusMessage || err.message}`)
    } finally {
        isSubmittingManual.value = false
    }
}
</script>

<template>
  <div class="w-full max-w-4xl mx-auto space-y-8 pb-20">
    <NuxtLink to="/dashboard/integrations/whatsapp" class="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest mb-2 group w-fit">
        <ArrowLeft class="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to WhatsApp Hub
    </NuxtLink>

    <div class="flex items-center gap-6 mb-12">
      <div class="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Zap class="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 class="text-2xl font-black text-foreground uppercase tracking-tighter">Connection Wizard</h2>
        <p class="text-xs text-foreground/50 font-bold uppercase tracking-widest mt-1">Manual API Node Configuration</p>
      </div>
    </div>

    <div class="grid md:grid-cols-3 gap-8">
      <!-- Form Section -->
      <div class="md:col-span-2 space-y-8">
        <section class="glass-card p-10 bg-foreground/5 border-foreground/10 relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
          
          <div class="relative z-10 space-y-8">
            <div class="grid gap-8">
              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">WhatsApp Business Account ID (WABA)</label>
                <input v-model="manualWabaId" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="Found in WhatsApp Manager Settings" class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all" />
              </div>
              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Phone Number ID</label>
                <input v-model="manualPhoneId" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="Found in API Setup tab" class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all" />
              </div>
              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Display Phone Number</label>
                <input v-model="manualPhone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="+250..." class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all" />
              </div>
              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-foreground/50 mb-2">Permanent Access Token</label>
                <input v-model="manualToken" @focus="setInteracting(true)" @blur="setInteracting(false)" type="password" placeholder="System User Token" class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-sm font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all" />
              </div>
            </div>

            <div class="pt-8 border-t border-foreground/10 flex items-center justify-between">
              <button 
                @click="submitManualSetup"
                :disabled="isSubmittingManual"
                class="bg-primary text-black px-12 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 flex items-center gap-3"
              >
                <Loader2 v-if="isSubmittingManual" class="w-4 h-4 animate-spin" />
                Verify and Connect
              </button>
              
              <a :href="manualGuideUrl" target="_blank" class="text-[10px] font-black uppercase tracking-widest text-foreground/50 hover:text-primary transition-all flex items-center gap-2">
                <HelpCircle class="w-4 h-4" />
                Help Guide
              </a>
            </div>
          </div>
        </section>
      </div>

      <!-- Info Section -->
      <div class="space-y-6">
        <div class="glass-card p-8 border-foreground/10 bg-foreground/5">
          <h4 class="text-[11px] font-black uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-primary" />
            Meta Requirements
          </h4>
          <ul class="space-y-4">
            <li v-for="req in [
              'Verified Meta Business Account',
              'WhatsApp Business API Enabled',
              'System User Access Token',
              'Clean Phone Number (No active WhatsApp)'
            ]" :key="req" class="flex items-start gap-3">
              <div class="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1"></div>
              <span class="text-[10px] font-bold text-foreground/50 uppercase tracking-tighter">{{ req }}</span>
            </li>
          </ul>
        </div>

        <div class="glass-card p-8 border-foreground/10 bg-primary/5">
          <Zap class="w-8 h-8 text-primary mb-4" />
          <h4 class="text-xs font-black uppercase tracking-widest text-foreground mb-2">Automated Node</h4>
          <p class="text-[10px] font-bold text-foreground/50 uppercase tracking-tight leading-relaxed">
            Once connected, your line becomes a protocol node capable of handling thousands of AI interactions per second.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[24px];
}
</style>
