<script setup lang="ts">
import { Link, CheckCircle2, MessageSquare, Plus, Terminal, Layout, Video, Send, Loader2, Bot, Trash2, HelpCircle } from 'lucide-vue-next'
import Skeleton from '~~/app/components/Skeleton.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { user, setInteracting } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const currentStep = computed(() => {
    if (accounts.value.length === 0) return 1
    const unmapped = accounts.value.find(a => !a.chatbot_id)
    if (unmapped) return 2
    const undeployed = accounts.value.find(a => a.status !== 'deployed')
    if (undeployed) return 3
    return 4 // Fully Deployed
})

const isConnecting = ref(false)
const isLoadingAccounts = ref(true)
const accounts = ref<any[]>([])

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
    isLoadingAccounts.value = true
    try {
        const { data } = await supabase.from('whatsapp_accounts').select('*').order('created_at', { ascending: false })
        accounts.value = data || []
    } catch (err) {
        console.error('Error fetching WA accounts:', err)
    } finally {
        isLoadingAccounts.value = false
    }
}

onMounted(fetchAccounts)

const sendTestMessage = async (accountId: string) => {
    if (!testPhone.value || !testMessage.value) return
    if (!accountId || accountId === 'undefined') {
        notify.error('Technical Error: WhatsApp Account ID is missing. Please refresh or reconnect.')
        return
    }
    isSendingTest.value = true
    try {
        const res = await $fetch('/api/whatsapp/test-message', {
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
        const res = await $fetch('/api/whatsapp/templates', {
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
        const res = await $fetch('/api/whatsapp/connect', {
            method: 'POST',
            body: {
                phone_number: manualPhone.value,
                phone_number_id: manualPhoneId.value,
                waba_id: manualWabaId.value,
                accessToken: manualToken.value
            }
        })
        notify.success('Manual Activation Successful!')
        showManualSetup.value = false
        fetchAccounts()
    } catch (err: any) {
        notify.error(`Manual Activation Failed: ${err.statusMessage || err.message}`)
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

const startWhatsAppEmbeddedSignup = () => {
  isConnecting.value = true
  
  if (!(window as any).FB) {
    notify.warn('Meta SDK layer is pending. Please ensure no adblockers are halting the script and try again seconds later.')
    isConnecting.value = false
    return
  }

  // Invoke the genuine Meta Embedded Signup Protocol natively
  (window as any).FB.login(async (response: any) => {
    if (response.authResponse) {
      // The Access Token and signed code arrives here natively!
      console.log('✅ Meta Embedded Sequence Successful', response)
      
      try {
          notify.success("Meta Authorized! Extracting phone numbers...")
          const res = await $fetch('/api/whatsapp/fetch-numbers', {
              method: 'POST',
              body: { accessToken: response.authResponse.accessToken }
          })
          
          fetchedNumbers.value = res.numbers.map((n: any) => ({ ...n, accessToken: response.authResponse.accessToken }))
          
          if (fetchedNumbers.value.length === 0) {
             notify.warn("No phone numbers found connected to this specific FB structure! Falling back to Manual Setup.")
             showManualSetup.value = true
          }
      } catch (err) {
          notify.error("Failed to map Meta Graph automatically.")
          showManualSetup.value = true
      } finally {
          isConnecting.value = false
          fetchAccounts()
      }
    } else {
      console.warn('Authentication aborted or unfulfilled securely.')
      isConnecting.value = false
    }
  }, {
    scope: 'whatsapp_business_management,whatsapp_business_messaging',
    response_type: 'token,code',
    override_default_response_type: true,
    extras: {
      feature: 'whatsapp_embedded_signup'
    }
  })
}

const saveFetchedNumber = async (num: any) => {
    isSavingNumber.value = true
    try {
        await $fetch('/api/whatsapp/connect', {
            method: 'POST',
            body: {
                waba_id: num.waba_id,
                phone_number_id: num.phone_number_id,
                phone_number: num.display_phone_number,
                accessToken: num.accessToken
            }
        })
        notify.success('Number Successfully Bound! Access Token saved natively.')
        fetchedNumbers.value = [] // Clear selection
        fetchAccounts()
    } catch (err: any) {
        notify.error(`Secure Bind Failed: ${err.data?.statusMessage || err.message}`)
    } finally {
        isSavingNumber.value = false
    }
}

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
      <section v-if="accounts.length === 0 || showManualSetup" class="glass-card p-10 bg-black/40 border-white/5 relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
        
        <!-- Embedded Selector -->
        <div v-if="!showManualSetup" class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 rounded-[24px] bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <MessageSquare class="w-8 h-8 text-green-500/60" />
                </div>
                <div>
                    <h2 class="text-2xl font-black text-white tracking-tighter uppercase mb-1">Step 1: Link physical line</h2>
                    <p class="text-xs text-gray-500 font-medium lowercase first-letter:uppercase">Secure your entry point via Meta's genuine handoff protocol.</p>
                </div>
            </div>
            
            <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <button 
                @click="startWhatsAppEmbeddedSignup"
                :disabled="isConnecting"
                class="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-black px-10 py-5 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    <Loader2 v-if="isConnecting" class="w-4 h-4 animate-spin" />
                    {{ isConnecting ? 'Authenticating...' : 'Connect Number' }}
                </button>

                <button 
                @click="showManualSetup = true"
                class="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white px-8 py-5 rounded-[24px] text-xs font-bold uppercase tracking-widest transition-all"
                >
                    Manual Override
                </button>
            </div>
        </div>

        <!-- Fetched Numbers Selection UI -->
        <div v-if="fetchedNumbers.length > 0 && !showManualSetup" class="mt-8 animate-in fade-in slide-in-from-top-4 duration-500 p-8 rounded-[2rem] bg-green-500/5 border border-green-500/20 relative z-20">
             <h3 class="text-sm font-black text-white uppercase tracking-widest mb-6 border-b border-green-500/20 pb-4">Select Associated Line Extract</h3>
             <div class="space-y-4">
                 <div v-for="num in fetchedNumbers" :key="num.phone_number_id" class="flex flex-col sm:flex-row items-center justify-between p-5 bg-[#0a0a0a] rounded-2xl border border-white/5 hover:border-green-500/30 transition-all group">
                     <div>
                         <p class="font-bold text-white tracking-widest">{{ num.display_phone_number }} <span class="text-xs text-green-500 ml-2 uppercase">({{ num.verified_name }})</span></p>
                         <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-2 flex items-center gap-3">
                            <span>Quality: <strong class="text-gray-300">{{ num.quality_rating }}</strong></span>
                            <span class="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <span>Asset ID: <strong class="text-gray-300">{{ num.waba_id }}</strong></span>
                         </p>
                     </div>
                     <button @click="saveFetchedNumber(num)" :disabled="isSavingNumber" class="mt-4 sm:mt-0 bg-green-600 text-black hover:bg-green-500 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-green-500/10 disabled:opacity-50">
                        <Loader2 v-if="isSavingNumber" class="w-3 h-3 animate-spin" />
                        {{ isSavingNumber ? 'Binding...' : 'Bind Number' }}
                     </button>
                 </div>
             </div>
        </div>

        <!-- Manual Form -->
        <div v-else class="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8 relative z-10">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-black text-white tracking-tighter uppercase mb-1">Manual Mapping</h2>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500 italic-none">Direct node activation via meta asset IDs.</p>
                </div>
                <button @click="showManualSetup = false" class="text-gray-600 hover:text-white transition-all p-2 bg-white/5 rounded-full"> 
                    <Plus class="w-5 h-5 rotate-45" />
                </button>
            </div>

            <div class="grid sm:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500">Phone Number</label>
                    <input v-model="manualPhone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="+1234567890" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all font-mono" />
                </div>
                <div class="space-y-2">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                        Phone Number ID
                        <HelpCircle class="w-3 h-3 text-gray-700" />
                    </label>
                    <input v-model="manualPhoneId" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all font-mono" />
                </div>
                <div class="space-y-2">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">WABA ID</label>
                    <input v-model="manualWabaId" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all font-mono" />
                </div>
                <div class="space-y-2">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Graph Access Token</label>
                    <input v-model="manualToken" @focus="setInteracting(true)" @blur="setInteracting(false)" type="password" class="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-all" />
                </div>
            </div>

            <div class="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5">
                <button 
                    @click="submitManualSetup"
                    :disabled="isSubmittingManual"
                    class="w-full sm:w-auto bg-primary text-black px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                    <Loader2 v-if="isSubmittingManual" class="w-4 h-4 animate-spin inline-block mr-2" />
                    Verify & Activate Node
                </button>
            </div>
        </div>
      </section>

      <!-- Steps 2-4: Active Node Management -->
      <section v-if="accounts.length > 0" class="space-y-12">
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
