<script setup lang="ts">
import { Link, CheckCircle2, MessageSquare, Plus, Terminal, Layout, Video, Send, Loader2, Bot, Trash2, HelpCircle } from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { user, setInteracting, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

onMounted(() => {
  if (planSlug.value === 'starter' || !planSlug.value) {
    navigateTo('/pricing')
  }
  fetchAccounts()
})

const isConnecting = ref(false)
const isAddingNew = ref(false)
const isLoadingAccounts = ref(true)
const accounts = ref<any[]>([])

const currentStep = computed(() => {
    if (isConnecting.value || showManualSetup.value || isAddingNew.value) return 1
    if (accounts.value.length === 0) return 1
    
    // Find first account that needs attention
    const incomplete = accounts.value.find(a => !a.chatbot_id || a.status !== 'deployed')
    if (!incomplete) return 4
    
    if (!incomplete.chatbot_id) return 2
    return 3
})

// Agents for mapping
const { data: agentsData, refresh: refreshAgents } = useAsyncData('agents-list-integrations', async () => {
    const { data } = await supabase.from('chatbots').select('id, name').is('deleted_at', null)
    return data || []
})
const agents = computed(() => agentsData.value || [])

// Review Tool State
const showReviewToolkit = ref(true)
const testPhone = ref('')
const testMessage = ref('Hello from ReplySuite! This is a test message for Meta App Review.')
const isSendingTest = ref(false)

const templateBody = ref('Thank you for contacting us. Our AI agent is currently reviewing your request.')
const templateName = ref('')
const isCreatingTemplate = ref(false)
const isDeploying = ref(false)

const fetchedNumbers = ref<any[]>([])
const isSavingNumber = ref(false)

// Manual Setup State
const showManualSetup = ref(false)
const manualPhone = ref('')
const manualPhoneId = ref('')
const manualWabaId = ref('')
const manualToken = ref('')
const manualGuideUrl = 'https://docs.replysuite.com/integrations/whatsapp'
const isSubmittingManual = ref(false)

const config = useRuntimeConfig()

// Fetch Accounts
const fetchAccounts = async () => {
    console.log('🔄 [WhatsApp] Fetching accounts...')
    isLoadingAccounts.value = true
    try {
        const { data, error } = await supabase
            .from('whatsapp_accounts')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        accounts.value = data || []
        console.log(`✅ [WhatsApp] Found ${accounts.value.length} accounts`)
    } catch (err: any) {
        console.error('❌ [WhatsApp] Error fetching accounts:', err.message)
        notify.error('Failed to load WhatsApp accounts. Please refresh the page.')
    } finally {
        isLoadingAccounts.value = false
    }
}

const sendTestMessage = async (accountId: string) => {
    if (!testPhone.value || !testMessage.value) return
    if (!accountId || accountId === 'undefined') {
        notify.error('Technical Error: WhatsApp Account ID is missing. Please refresh or reconnect.')
        return
    }
    isSendingTest.value = true
    try {
        await $fetch('/api/whatsapp/test-message', {
            method: 'POST',
            body: {
                whatsappAccountId: accountId,
                to: testPhone.value,
                message: testMessage.value
            }
        })
        notify.success('Message Sent! You can now show the recipient receiving this message in your recording.')
    } catch (err: any) {
        const msg = err.data?.statusMessage || err.statusMessage || err.message || 'Unknown Server Error'
        notify.error(`Send Failed: ${msg}`)
    } finally {
        isSendingTest.value = false
    }
}

const createReviewTemplate = async (accountId: string) => {
    if (!templateName.value || !templateBody.value) return
    if (!accountId || accountId === 'undefined') {
        notify.error('Technical Error: WhatsApp Account ID is missing. Please refresh or reconnect.')
        return
    }
    isCreatingTemplate.value = true
    try {
        await $fetch('/api/whatsapp/templates', {
            method: 'POST',
            body: {
                whatsappAccountId: accountId,
                name: templateName.value,
                category: 'UTILITY',
                language: 'en_US',
                bodyText: templateBody.value
            }
        })
        notify.success('Template Created! You can now show this template appearing in your Meta Business Suite.')
    } catch (err: any) {
        const msg = err.data?.statusMessage || err.statusMessage || err.message || 'Unknown Server Error'
        notify.error(`Template Creation Failed: ${msg}`)
    } finally {
        isCreatingTemplate.value = false
    }
}

const deleteAccount = async (id: string) => {
    if (!(await notify.confirm('Are you sure you want to disconnect this number?'))) return
    const { error } = await supabase.from('whatsapp_accounts').delete().eq('id', id)
    if (!error) fetchAccounts()
}

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
        
        console.log('Manual Connect Response:', response)
        notify.success(response.message || 'Manual Activation Successful!')
        
        // Reset all states that might block the stepper
        showManualSetup.value = false
        isAddingNew.value = false
        isConnecting.value = false
        
        // Await the fetch to ensure reactive state updates before the user looks at the screen
        await fetchAccounts()
        console.log('Accounts after refresh:', accounts.value.length)

        // If the number is already there, it should have a chatbot_id or be in Step 2.
        // We force a UI update by ensuring the list is visible.
    } catch (err: any) {
        console.error('Manual activation error:', err)
        notify.error(`Manual Activation Failed: ${err.data?.statusMessage || err.message}`)
    } finally {
        isSubmittingManual.value = false
    }
}

useHead({
  script: [
    {
      src: 'https://connect.facebook.net/en_US/sdk.js',
      async: true,
      defer: true,
      onload: () => {
        if ((window as any).FB) {
          (window as any).FB.init({
            appId: config.public.metaAppId,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v21.0'
          })
        }
      }
    }
  ]
})

const updateMapping = async (accountId: string, chatbotId: string | null) => {
    try {
        const { error } = await supabase
            .from('whatsapp_accounts')
            .update({ chatbot_id: chatbotId })
            .eq('id', accountId)
        
        if (error) throw error
        notify.success('AI Agent mapping updated successfully!')
        fetchAccounts()
    } catch (err: any) {
        notify.error(`Mapping Failed: ${err.message}`)
    }
}

const deployNode = async (accountId: string) => {
    isDeploying.value = true
    try {
        const { error } = await supabase
            .from('whatsapp_accounts')
            .update({ status: 'deployed' })
            .eq('id', accountId)
        
        if (error) throw error
        notify.success('Node Deployed! Your AI agent is now officially live.')
        fetchAccounts()
    } catch (err: any) {
        notify.error(`Deployment Failed: ${err.message}`)
    } finally {
        isDeploying.value = false
    }
}
</script>

<template>
  <div class="w-full space-y-8 pb-20">
    <!-- Workflow Stepper -->
    <div class="grid grid-cols-4 gap-4 mb-12">
      <div v-for="step in [
        { id: 1, name: 'Connect', desc: 'Secure Handshake' },
        { id: 2, name: 'Mind Map', desc: 'Attach AI Agent' },
        { id: 3, name: 'Verification', desc: 'Send Test Proof' },
        { id: 4, name: 'Deployment', desc: 'Node Active' }
      ]" :key="step.id" 
      :class="['p-6 rounded-[2rem] border transition-all duration-500', 
        currentStep >= step.id ? 'bg-primary/10 border-primary/20 shadow-lg shadow-primary/5' : 'bg-white/[0.01] border-white/5 opacity-40']"
      >
        <div class="flex items-center gap-4">
          <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm', 
            currentStep >= step.id ? 'bg-primary text-black' : 'bg-white/5 text-gray-700']">
            {{ currentStep > step.id ? '✓' : step.id }}
          </div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest leading-tight" :class="currentStep >= step.id ? 'text-white' : 'text-gray-700'">{{ step.name }}</h4>
            <p class="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mt-1">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <main class="w-full space-y-12 relative z-50 pointer-events-auto">
      <!-- Step 1: Connection HUB -->
      <section v-if="accounts.length === 0 || isAddingNew" class="glass-card p-10 bg-black/40 border-white/5 relative overflow-hidden group animate-in fade-in slide-in-from-top-4 duration-700">
        <div class="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
        
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-10">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-[24px] bg-primary/10 flex items-center justify-center border border-primary/20">
                <MessageSquare class="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <h2 class="text-2xl font-black text-white tracking-tighter uppercase mb-1">Step 1: Link WhatsApp Line</h2>
                <p class="text-xs text-gray-500 font-medium uppercase tracking-widest">Manual API Configuration</p>
              </div>
            </div>
            <button v-if="accounts.length > 0" @click="isAddingNew = false" class="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
              Cancel
            </button>
          </div>

          <!-- Manual Fields -->
          <div class="grid md:grid-cols-2 gap-8 mb-10">
            <div class="space-y-2">
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">WhatsApp Business Account ID (WABA)</label>
              <input v-model="manualWabaId" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="Found in WhatsApp Manager Settings" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Phone Number ID</label>
              <input v-model="manualPhoneId" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="Found in API Setup tab" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Display Phone Number</label>
              <input v-model="manualPhone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="+250..." class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div class="space-y-2">
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Permanent Access Token</label>
              <input v-model="manualToken" @focus="setInteracting(true)" @blur="setInteracting(false)" type="password" placeholder="System User Token" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>

          <div class="flex items-center justify-between gap-4 pt-8 border-t border-white/5">
            <div class="flex items-center gap-6">
              <button 
                @click="submitManualSetup"
                :disabled="isSubmittingManual"
                class="bg-primary text-black px-12 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 flex items-center gap-3"
              >
                <Loader2 v-if="isSubmittingManual" class="w-4 h-4 animate-spin" />
                Verify and Continue
              </button>
              
              <button v-if="accounts.length === 0" @click="fetchAccounts" class="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2">
                <Loader2 v-if="isLoadingAccounts" class="w-3 h-3 animate-spin" />
                Check Connection
              </button>
            </div>
            <a :href="manualGuideUrl" target="_blank" class="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary transition-all flex items-center gap-2">
              <HelpCircle class="w-4 h-4" />
              Configuration Guide
            </a>
          </div>
        </div>
      </section>

      <!-- Steps 2-4: Active Node Management -->
      <section v-if="accounts.length > 0 && !isAddingNew" class="space-y-12">
        <div class="flex justify-between items-end mb-8">
            <div>
                <h2 class="text-4xl font-black text-white tracking-tighter uppercase">Active Nodes</h2>
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Managing {{ accounts.length }} Connected WhatsApp Line(s)</p>
            </div>
            <button @click="isAddingNew = true" class="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Add Another Line
            </button>
        </div>

        <div v-for="wa in accounts" :key="wa.id" class="space-y-8">
            <!-- Account Card -->
            <div class="glass-card p-10 bg-[#0a0a0a] border-white/5 relative overflow-hidden group">
                <div class="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div class="relative z-10">
                    <div class="flex flex-col md:flex-row justify-between gap-8 mb-10">
                        <div class="flex items-start gap-6">
                            <div :class="['w-16 h-16 rounded-[24px] flex items-center justify-center border transition-all', 
                                wa.chatbot_id ? 'bg-green-500/10 border-green-500/20 shadow-lg shadow-green-500/10' : 'bg-orange-500/10 border-orange-500/20 shadow-lg shadow-orange-500/10']">
                                <MessageSquare :class="['w-8 h-8', wa.chatbot_id ? 'text-green-500' : 'text-orange-500']" />
                            </div>
                            <div>
                                <h3 class="text-3xl font-black text-white tracking-tighter mb-2 uppercase">{{ wa.phone_number }}</h3>
                                <div class="flex flex-wrap items-center gap-4">
                                    <span :class="['text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5', 
                                        wa.chatbot_id ? 'text-green-500' : 'text-orange-500']">
                                        <div :class="['w-1.5 h-1.5 rounded-full animate-pulse', wa.status === 'deployed' ? 'bg-green-500' : 'bg-orange-500']"></div>
                                        {{ wa.status === 'deployed' ? 'Node Live-Deployment' : (wa.chatbot_id ? 'Verification Stage' : 'Pending AI Mind Map') }}
                                    </span>
                                    <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                        Asset ID: {{ wa.waba_id }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-4">
                            <button @click="deleteAccount(wa.id)" class="p-4 rounded-2xl bg-white/5 text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5">
                                <Trash2 class="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <!-- Step 2: Mind Map Selection -->
                    <div v-if="!wa.chatbot_id" class="p-8 rounded-[2rem] bg-orange-500/5 border border-orange-500/20 animate-in fade-in zoom-in-95 duration-500">
                        <div class="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div class="space-y-2">
                                <h4 class="text-sm font-black text-white uppercase tracking-widest">Connect an AI Brain</h4>
                                <p class="text-[11px] text-gray-500 font-medium">This number is currently dormant. Link it to an agent to start automating.</p>
                            </div>
                            <div class="relative w-full md:w-64">
                                <select 
                                    :value="wa.chatbot_id"
                                    @change="(e: any) => updateMapping(wa.id, e.target.value || null)"
                                    @focus="setInteracting(true)"
                                    @blur="setInteracting(false)"
                                    class="w-full bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white focus:outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer pr-12 shadow-2xl"
                                >
                                    <option :value="null" class="bg-[#0a0a0a]">Select Agent...</option>
                                    <option v-for="agent in agents" :key="agent.id" :value="agent.id" class="bg-[#0a0a0a]">
                                        {{ agent.name }}
                                    </option>
                                </select>
                                <Bot class="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <!-- Step 3 & 4: Verification & Deployment -->
                    <div v-else class="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                        <!-- Deployment Success Toast (Subtle) -->
                        <div class="flex items-center gap-4 p-6 bg-green-500/10 border border-green-500/20 rounded-[2rem]">
                            <div class="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 class="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <h4 class="text-xs font-black text-white uppercase tracking-widest">Node Deployment Active</h4>
                                <p class="text-[10px] font-bold text-green-500/60 uppercase tracking-tighter mt-1">Traffic is being routed through {{ agents.find(a => a.id === wa.chatbot_id)?.name || 'AI' }}</p>
                            </div>
                        </div>

                        <div class="flex items-center justify-between px-2">
                            <div class="flex items-center gap-3">
                                <Terminal class="w-4 h-4 text-primary/60" />
                                <h4 class="text-[11px] font-black text-white uppercase tracking-widest">Verification & Compliance Proofs</h4>
                            </div>
                            <button @click="showReviewToolkit = !showReviewToolkit" class="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-primary/20">
                                {{ showReviewToolkit ? 'Hide Toolkit' : 'Show Review Helpers' }}
                            </button>
                        </div>

                        <div v-if="showReviewToolkit" class="grid lg:grid-cols-2 gap-8">
                            <div class="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6 hover:bg-white/[0.04] transition-all">
                                <div class="flex items-center gap-3">
                                    <Send class="w-5 h-5 text-primary/60" />
                                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Proof 1: Live Responder</span>
                                </div>
                                <div class="space-y-4">
                                    <input v-model="testPhone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="Recipient: +123..." class="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all font-mono" />
                                    <textarea v-model="testMessage" @focus="setInteracting(true)" @blur="setInteracting(false)" rows="2" class="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all resize-none"></textarea>
                                    <button @click="sendTestMessage(wa.id)" :disabled="isSendingTest" class="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
                                        <Loader2 v-if="isSendingTest" class="w-4 h-4 animate-spin" />
                                        <Send v-else class="w-4 h-4" />
                                        Generate Evidence
                                    </button>
                                </div>
                            </div>

                            <div class="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-6 hover:bg-white/[0.04] transition-all">
                                <div class="flex items-center gap-3">
                                    <Layout class="w-5 h-5 text-primary/60" />
                                    <span class="text-[10px] font-black uppercase tracking-widest text-white">Proof 2: Utility Protocol</span>
                                </div>
                                <div class="space-y-4">
                                    <input v-model="templateName" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all font-mono" />
                                    <textarea v-model="templateBody" @focus="setInteracting(true)" @blur="setInteracting(false)" rows="2" class="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all resize-none"></textarea>
                                    <button @click="createReviewTemplate(wa.id)" :disabled="isCreatingTemplate" class="w-full py-4 bg-white/5 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                                        Deploy Template Proof
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Finalize Deployment Cta -->
                        <div v-if="wa.status !== 'deployed'" class="p-10 rounded-[3rem] bg-primary/10 border border-primary/20 flex flex-col items-center text-center space-y-6">
                            <div class="w-16 h-16 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
                                <CheckCircle2 class="text-black w-8 h-8" />
                            </div>
                            <div class="max-w-md space-y-2">
                                <h3 class="text-xl font-black text-white uppercase tracking-widest leading-tight">Ready to Go Live?</h3>
                                <p class="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">You can now finalize your deployment. This will activate your AI node and move it to the production phase.</p>
                            </div>
                            <button @click="deployNode(wa.id)" :disabled="isDeploying" class="px-12 py-5 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20 flex items-center gap-3">
                                <Loader2 v-if="isDeploying" class="w-4 h-4 animate-spin" />
                                Finalize & Activate Node
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <!-- Helpful Prerequisites Footer -->
      <section v-if="accounts.length === 0" class="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div class="p-10 rounded-[3rem] bg-primary/5 border border-primary/20 relative overflow-hidden group">
             <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
             <div class="relative z-10">
                 <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <HelpCircle class="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h4 class="text-lg font-black uppercase tracking-widest text-white">Ready for Production?</h4>
                        <p class="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Official Meta Compliance Checklist</p>
                    </div>
                 </div>
                 <div class="grid md:grid-cols-2 gap-12 items-end">
                     <p class="text-sm text-gray-400 font-medium leading-relaxed max-w-xl lowercase first-letter:uppercase">
                        To activate official broadcasting, ensure you have a verified **Meta Business Suite** and a valid **WABA Asset**. Our AI deployment layer will automatically register its mapping targets once verified.
                     </p>
                     <div class="flex flex-col sm:flex-row gap-4">
                         <button @click="navigateTo('https://developers.facebook.com', { external: true })" class="px-8 py-4 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10">
                            Meta Dev Portal
                         </button>
                     </div>
                 </div>
             </div>
          </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[48px];
}
</style>
