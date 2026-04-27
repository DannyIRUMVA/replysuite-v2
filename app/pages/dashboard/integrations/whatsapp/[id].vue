<script setup lang="ts">
import { 
  ArrowLeft, 
  MessageSquare, 
  Bot, 
  Trash2, 
  CheckCircle2, 
  Terminal, 
  Send, 
  Layout, 
  Loader2,
  Trash,
  Settings,
  Activity
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const accountId = route.params.id as string
const { user, setInteracting, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()
const config = useRuntimeConfig()

const waAccount = ref<any>(null)
const isLoading = ref(true)
const isDeploying = ref(false)
const isSendingTest = ref(false)
const isCreatingTemplate = ref(false)
const showReviewToolkit = ref(true)

// Test States
const testPhone = ref('')
const testMessage = ref('Hello from ReplySuite! This is a test message for Meta App Review.')
const templateName = ref('')
const templateBody = ref('Thank you for contacting us. Our AI agent is currently reviewing your request.')

// Agents for mapping
const { data: agentsData } = useAsyncData('agents-list-whatsapp-config', async () => {
    const { data } = await supabase.from('chatbots').select('id, name').is('deleted_at', null)
    return data || []
})
const agents = computed(() => agentsData.value || [])

const fetchAccount = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .single()
    
    if (error) throw error
    waAccount.value = data
  } catch (err: any) {
    notify.error('Failed to load WhatsApp account.')
    navigateTo('/dashboard/integrations/whatsapp')
  } finally {
    isLoading.value = false
  }
}

const updateMapping = async (chatbotId: string | null) => {
    try {
        const { error } = await supabase
            .from('whatsapp_accounts')
            .update({ chatbot_id: chatbotId })
            .eq('id', accountId)
        
        if (error) throw error
        notify.success('AI Agent mapping updated!')
        fetchAccount()
    } catch (err: any) {
        notify.error(`Mapping Failed: ${err.message}`)
    }
}

const deployNode = async () => {
    isDeploying.value = true
    try {
        const { error } = await supabase
            .from('whatsapp_accounts')
            .update({ status: 'deployed' })
            .eq('id', accountId)
        
        if (error) throw error
        notify.success('Node Deployed! Your AI agent is now live.')
        fetchAccount()
    } catch (err: any) {
        notify.error(`Deployment Failed: ${err.message}`)
    } finally {
        isDeploying.value = false
    }
}

const sendTestMessage = async () => {
    if (!testPhone.value || !testMessage.value) return
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
        notify.success('Test Message Sent!')
    } catch (err: any) {
        notify.error(`Send Failed: ${err.data?.statusMessage || err.message}`)
    } finally {
        isSendingTest.value = false
    }
}

const createReviewTemplate = async () => {
    if (!templateName.value || !templateBody.value) return
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
        notify.success('Template Created Successfully!')
    } catch (err: any) {
        notify.error(`Template Creation Failed: ${err.data?.statusMessage || err.message}`)
    } finally {
        isCreatingTemplate.value = false
    }
}

const deleteAccount = async () => {
    if (!(await notify.confirm('Are you sure you want to disconnect this number?'))) return
    const { error } = await supabase.from('whatsapp_accounts').delete().eq('id', accountId)
    if (!error) {
      notify.success('Disconnected successfully.')
      navigateTo('/dashboard/integrations/whatsapp')
    }
}

onMounted(() => {
  fetchAccount()
})

useHead({
  title: computed(() => waAccount.value ? `${waAccount.value.phone_number} | WhatsApp Configuration` : 'WhatsApp Config'),
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
</script>

<template>
  <div class="w-full space-y-12 pb-20">
    <NuxtLink to="/dashboard/integrations/whatsapp" class="flex items-center gap-2 text-foreground/50 hover:text-foreground transition-all text-[10px] font-black uppercase tracking-widest mb-2 group w-fit">
        <ArrowLeft class="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to WhatsApp Hub
    </NuxtLink>

    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
      <div class="flex items-center gap-6">
        <div class="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <MessageSquare class="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 class="text-3xl font-black text-foreground tracking-tighter uppercase">{{ waAccount?.phone_number || 'Protocol Loading...' }}</h2>
          <p class="text-xs text-foreground/50 font-bold uppercase tracking-widest mt-1">Live Node Configuration</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <button @click="sendTestMessage" class="px-8 py-4 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground font-bold uppercase tracking-widest text-[10px] hover:bg-foreground/10 transition-all flex items-center gap-3">
          <Send class="w-3.5 h-3.5" />
          Quick Test
        </button>
        <button @click="deleteAccount" class="px-8 py-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-foreground transition-all flex items-center gap-3">
          <Trash2 class="w-3.5 h-3.5" />
          Disconnect
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="space-y-12">
        <div class="h-64 bg-foreground/5 rounded-[3rem] animate-pulse"></div>
        <div class="grid md:grid-cols-2 gap-8">
            <div class="h-48 bg-foreground/5 rounded-[2rem] animate-pulse"></div>
            <div class="h-48 bg-foreground/5 rounded-[2rem] animate-pulse"></div>
        </div>
    </div>

    <main v-else-if="waAccount" class="space-y-12">
      <!-- Node Configuration Section -->
      <section class="grid lg:grid-cols-3 gap-8">
        <!-- AI Brain Mapping -->
        <div class="lg:col-span-2 glass-card p-10 bg-background border-foreground/10 relative overflow-hidden">
          <div class="flex items-center gap-4 mb-10">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Bot class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 class="text-xl font-black text-foreground uppercase tracking-tighter">AI Agent Mapping</h3>
              <p class="text-[10px] text-foreground/50 font-bold uppercase tracking-widest">Connect an AI Mind to this number</p>
            </div>
          </div>

          <div class="space-y-8">
            <div class="relative">
              <select 
                :value="waAccount.chatbot_id"
                @change="(e: any) => updateMapping(e.target.value || null)"
                class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-6 py-5 text-sm font-black text-foreground focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer pr-12"
              >
                <option :value="null" class="bg-background">Select Agent...</option>
                <option v-for="agent in agents" :key="agent.id" :value="agent.id" class="bg-background">
                  {{ agent.name }}
                </option>
              </select>
              <Settings class="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
            </div>

            <div v-if="waAccount.chatbot_id" class="p-6 bg-green-500/10 border border-green-500/20 rounded-[2rem] flex items-center gap-4">
              <CheckCircle2 class="w-6 h-6 text-green-500" />
              <div>
                <p class="text-[11px] font-black text-foreground uppercase tracking-widest">Connection Active</p>
                <p class="text-[9px] font-bold text-green-500/60 uppercase tracking-tighter">Inbound traffic is now being routed to the AI agent.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Node Status -->
        <div class="glass-card p-10 bg-foreground/[0.02] border-foreground/10 flex flex-col justify-between">
           <div class="space-y-6">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black text-foreground/50 uppercase tracking-widest">Current Status</span>
                <span :class="['px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest', 
                  waAccount.status === 'deployed' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500']">
                  {{ waAccount.status }}
                </span>
              </div>
              <div class="w-full h-px bg-foreground/5"></div>
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black text-foreground/50 uppercase tracking-widest">Asset Category</span>
                <span class="text-[10px] font-black text-foreground uppercase tracking-widest italic">Official WABA</span>
              </div>
           </div>

           <button v-if="waAccount.status !== 'deployed'" @click="deployNode" :disabled="isDeploying" class="w-full py-4 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl mt-12 hover:scale-105 transition-all shadow-xl shadow-primary/20">
              <Loader2 v-if="isDeploying" class="w-4 h-4 animate-spin inline mr-2" />
              Finalize Deployment
           </button>
           <div v-else class="mt-12 flex items-center gap-3 text-green-500/40">
              <Activity class="w-4 h-4 animate-pulse" />
              <span class="text-[9px] font-black uppercase tracking-widest">Node Heartbeat Active</span>
           </div>
        </div>
      </section>

      <!-- Meta Review Toolkit -->
      <section class="space-y-8">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <Terminal class="w-5 h-5 text-primary/60" />
                <h2 class="text-2xl font-black text-foreground uppercase tracking-tighter">Meta Review Toolkit</h2>
            </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-8">
            <!-- Test Messenger -->
            <div class="glass-card p-10 bg-foreground/5 border-foreground/10 space-y-8">
                <div class="flex items-center gap-3">
                    <Send class="w-5 h-5 text-primary/60" />
                    <span class="text-[10px] font-black uppercase tracking-widest text-foreground">Live Message Testing</span>
                </div>
                <div class="space-y-4">
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-foreground/50 uppercase tracking-widest ml-1">Recipient Number</label>
                      <input v-model="testPhone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="+123..." class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-foreground/50 uppercase tracking-widest ml-1">Message Payload</label>
                      <textarea v-model="testMessage" @focus="setInteracting(true)" @blur="setInteracting(false)" rows="3" class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all resize-none"></textarea>
                    </div>
                    <button @click="sendTestMessage" :disabled="isSendingTest" class="w-full py-5 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/20">
                        <Loader2 v-if="isSendingTest" class="w-4 h-4 animate-spin" />
                        <Send v-else class="w-4 h-4" />
                        Send Live Test
                    </button>
                </div>
            </div>

            <!-- Template Deployer -->
            <div class="glass-card p-10 bg-foreground/5 border-foreground/10 space-y-8">
                <div class="flex items-center gap-3">
                    <Layout class="w-5 h-5 text-primary/60" />
                    <span class="text-[10px] font-black uppercase tracking-widest text-foreground">Review Template Proof</span>
                </div>
                <div class="space-y-4">
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-foreground/50 uppercase tracking-widest ml-1">Template Name</label>
                      <input v-model="templateName" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" placeholder="meta_review_v1" class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[9px] font-black text-foreground/50 uppercase tracking-widest ml-1">Template Body</label>
                      <textarea v-model="templateBody" @focus="setInteracting(true)" @blur="setInteracting(false)" rows="3" class="w-full bg-foreground/5 border border-foreground/10 rounded-2xl px-5 py-4 text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 transition-all resize-none"></textarea>
                    </div>
                    <button @click="createReviewTemplate" :disabled="isCreatingTemplate" class="w-full py-5 bg-foreground/5 text-foreground border border-foreground/10 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-foreground/10 transition-all flex items-center justify-center gap-3">
                        <Loader2 v-if="isCreatingTemplate" class="w-4 h-4 animate-spin" />
                        Deploy to Meta
                    </button>
                </div>
            </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[24px];
}
</style>
