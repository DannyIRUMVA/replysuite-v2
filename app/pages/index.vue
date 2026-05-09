<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Settings,
  Bot,
  BrainCircuit,
  ShieldCheck,
  MessageCircle,
  Send,
  Globe2,
  Check,
  Loader2,
  FileText,
  Clock3,
  Sparkles,
  PanelTop,
  MessageSquareMore,
  ScanSearch,
  Lock,
  X
} from 'lucide-vue-next'
import { marked } from 'marked'
import xss from 'xss'

useSeoMeta({
  title: 'ReplySuite | AI chatbot for your website and WhatsApp',
  ogTitle: 'ReplySuite | Train an AI chatbot on your business content',
  description: 'Train an AI chatbot on your website, PDFs, FAQs, and business content. Deploy it on your website and WhatsApp to answer questions faster and capture more leads.',
  ogDescription: 'ReplySuite helps businesses launch AI chatbots trained on their own content for website and WhatsApp support, lead capture, and faster replies.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://replysuite.app' }]
})

definePageMeta({
  layout: 'default'
})

const user = useSupabaseUser()

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    const html = marked.parse(text, { breaks: true, gfm: true })
    if (typeof html !== 'string') return text
    return xss(html)
  } catch (e) {
    console.error('Markdown error:', e)
    return text
  }
}

const outcomePoints = [
  'Answer customer questions instantly',
  'Train on your website, PDFs, and custom text',
  'Deploy on website and WhatsApp without changing your workflow'
]

const proofCards = [
  {
    title: 'Train on your business content',
    desc: 'Paste your website URL, upload PDFs, or add custom text so the chatbot answers using your real information.',
    icon: ScanSearch
  },
  {
    title: 'Deploy where customers already talk',
    desc: 'Launch on your website first, then connect WhatsApp for higher-value conversations and faster response times.',
    icon: MessageCircle
  },
  {
    title: 'Built for real business use',
    desc: 'Use one dashboard to create agents, manage knowledge, test replies, and control how your assistant behaves.',
    icon: PanelTop
  }
]

const steps = [
  {
    num: '01',
    title: 'Create your chatbot',
    desc: 'Start with a website chatbot and give it a name, tone, and purpose.'
  },
  {
    num: '02',
    title: 'Train it on your content',
    desc: 'Use your website URL, PDFs, FAQs, product info, or custom text so replies stay on-brand and useful.'
  },
  {
    num: '03',
    title: 'Go live on web and WhatsApp',
    desc: 'Embed the widget on your site and upgrade into WhatsApp automation when you are ready.'
  }
]

const useCases = [
  {
    title: 'Website lead capture',
    desc: 'Turn visitors into conversations by answering pricing, services, delivery, and product questions in real time.',
    icon: Globe2
  },
  {
    title: 'WhatsApp customer support',
    desc: 'Handle repetitive support and pre-sales questions faster on the channel many customers prefer most.',
    icon: MessageCircle
  },
  {
    title: 'Knowledge-based AI replies',
    desc: 'Ground answers in your own business data instead of generic AI responses.',
    icon: BrainCircuit
  }
]

const reasonsToBuy = [
  {
    title: 'Fast to launch',
    desc: 'You do not need a custom AI project to get started. Create, train, test, and deploy from one place.',
    icon: Clock3
  },
  {
    title: 'Clear business value',
    desc: 'Reply faster, miss fewer leads, and give customers instant answers outside business hours.',
    icon: Sparkles
  },
  {
    title: 'Safer control',
    desc: 'Manage training, channels, and deployment settings from your dashboard instead of relying on ad hoc prompts.',
    icon: Lock
  }
]

const beforePoints = [
  {
    title: 'Generic answers',
    desc: 'One-size-fits-all bots answer without using your real website, PDFs, FAQs, or business knowledge.'
  },
  {
    title: 'Hard to trust',
    desc: 'Generic GPT tools can sound impressive but still miss business context, policies, pricing, or service details.'
  },
  {
    title: 'Too much maintenance',
    desc: 'Custom-built bots often become expensive, fragile, and difficult to update every time the business changes.'
  },
  {
    title: 'Slow human handoff',
    desc: 'Your team still spends too much time repeating the same support and pre-sales answers.'
  },
  {
    title: 'Support overload',
    desc: 'Repetitive questions keep piling up, which slows response times and pulls staff away from higher-value work.'
  }
]

const afterPoints = [
  {
    title: 'Trained on your content',
    desc: 'ReplySuite learns from your website, PDFs, FAQs, and custom text so answers stay closer to your real business.'
  },
  {
    title: 'Instant first responses',
    desc: 'Provide 24/7 replies on your website and expand into WhatsApp when you want another high-value support channel.'
  },
  {
    title: 'Less repetitive support work',
    desc: 'Answer common questions automatically before they become another manual support task for your team.'
  },
  {
    title: 'A stronger support team',
    desc: 'Free your current team to focus on harder conversations, better follow-up, and more valuable customer work.'
  }
]

const demoVideoUrl = 'https://www.youtube-nocookie.com/embed/drp1wlRRSr4?autoplay=1&rel=0'
const isDemoVideoOpen = ref(false)

const openDemoVideo = () => {
  isDemoVideoOpen.value = true
}

const closeDemoVideo = () => {
  isDemoVideoOpen.value = false
}

const testimonialSamples = [
  {
    quote: 'We added ReplySuite to our website and within a few days it was handling the same questions my team answers over and over. It saved us a lot of time.',
    name: 'Sarah Thompson',
    role: 'Founder, online store'
  },
  {
    quote: 'What I liked most was how easy it was to train the chatbot on our own content. The replies felt much closer to how we actually talk to customers.',
    name: 'Kevin Mwangi',
    role: 'Operations manager, service business'
  },
  {
    quote: 'We started with the website chatbot and later looked at WhatsApp integration. It gave us a simple path instead of trying to set up everything at once.',
    name: 'Aline Uwase',
    role: 'Customer support lead'
  }
]

const chatbotId = 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
const chatInput = ref('')
const isChatLoading = ref(false)
const chatbot = ref<any>(null)
const chatMessages = ref<any[]>([])
const scrollRef = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

const forwardDemoWheel = (event: WheelEvent) => {
  if (typeof window === 'undefined') return
  window.scrollBy({ top: event.deltaY, left: 0, behavior: 'auto' })
}

watch(chatMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: 'smooth' })
}

const fetchChatbot = async () => {
  const supabase = useSupabaseClient()
  try {
    const { data } = await supabase.from('chatbots').select('*').eq('id', chatbotId).single()
    if (data) {
      chatbot.value = data
    }
  } catch (e) {
    console.error('Failed to fetch chatbot:', e)
  }

  chatMessages.value = [
    {
      role: 'assistant',
      content: chatbot.value?.welcome_message || 'Welcome to ReplySuite. I can help you launch an AI chatbot trained on your website, FAQs, PDFs, and business content. Want to see pricing or start free?',
      actions: [
        { label: 'VIEW PRICING', action: 'pricing' },
        { label: 'START FREE', action: 'register' }
      ]
    },
    {
      role: 'user',
      content: 'What can ReplySuite do for my business?'
    },
    {
      role: 'assistant',
      content: 'It helps you answer customer questions faster on your website and WhatsApp using your own business content.'
    }
  ]
}

const handleQuickAction = (action: string) => {
  if (action === 'pricing') {
    scrollToSection('pricing')
  } else if (action === 'register') {
    navigateTo('/register')
  }
}

const sendDemoMessage = async () => {
  if (!chatInput.value.trim() || isChatLoading.value) return

  const userMsg = chatInput.value
  chatMessages.value.push({ role: 'user', content: userMsg })
  chatInput.value = ''
  isChatLoading.value = true

  try {
    const res = await $fetch<{ success: boolean; response: string }>('/api/public/chat', {
      method: 'POST',
      body: { chatbotId, message: userMsg }
    })

    if (res.success) {
      chatMessages.value.push({ role: 'assistant', content: res.response })
    }
  } catch (err) {
    chatMessages.value.push({
      role: 'assistant',
      content: 'I hit an error in the live demo. You can still start free and build your chatbot from the dashboard.'
    })
  } finally {
    isChatLoading.value = false
  }
}

const { isAuthenticated, refreshAuth, syncWithPolar } = useAuth()
const notify = useNotify()
const isProcessing = ref<string | null>(null)

const plans = [
  {
    name: 'Free',
    id: 'starter',
    price: '0.00',
    desc: 'Best for testing your first website chatbot.',
    features: ['1 website chatbot', '100 AI replies / mo', '10 training sessions', 'Trainable AI agent', 'Email support'],
    popular: false
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    desc: 'Best for growing businesses that want more training and more conversations.',
    features: ['3 website chatbots', '4,000 AI replies / mo', '30 training sessions', 'Advanced bot training', 'Priority support'],
    popular: true
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    desc: 'Best for businesses ready for higher volume and WhatsApp automation.',
    features: ['5 website chatbots', '10,000 AI replies / mo', '100 training sessions', 'WhatsApp integration', 'Dedicated manager'],
    popular: false
  }
]

onMounted(() => {
  fetchChatbot()
  if (window.PolarEmbedCheckout) {
    window.PolarEmbedCheckout.init()
  }

  window.addEventListener('polar:checkout:confirmed', async (event) => {
    console.log('[Index] Checkout confirmed:', event)
    notify.success('Payment successful! Redirecting to your dashboard...')
    await syncWithPolar()
    setTimeout(() => {
      navigateTo('/dashboard/analytics')
    }, 1500)
  })
})

const handleSelect = async (plan: any) => {
  if (!isAuthenticated.value) {
    return navigateTo(`/register?plan=${plan.id}`)
  }

  isProcessing.value = plan.id

  try {
    if (plan.id === 'starter') {
      const res = await $fetch('/api/billing/onboard-free', { method: 'POST' })
      if (res.success) {
        await refreshAuth()
        return navigateTo('/dashboard/analytics')
      }
    } else {
      const res = await $fetch('/api/billing/checkout', {
        method: 'POST',
        body: { productId: plan.productId }
      })

      if (res.url) {
        if (window.PolarEmbedCheckout) {
          window.PolarEmbedCheckout.open(res.url)
        } else {
          window.location.href = res.url
        }
      }
    }
  } catch (err: any) {
    console.error('[Index Pricing] Action failed:', err)
    notify.error('Failed to process request. Please try again.')
  } finally {
    isProcessing.value = null
  }
}
</script>

<template>
  <div class="relative overflow-hidden">
    <section class="relative pt-20 pb-20 md:pt-32 md:pb-24 overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>

      <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <div class="flex items-center gap-3 mb-8 opacity-80 group cursor-default">
            <div class="h-[1px] w-10 bg-primary/40 group-hover:w-14 transition-all duration-500"></div>
            <span class="text-[11px] font-bold tracking-[0.3em] text-primary uppercase">AI chatbot for website + WhatsApp</span>
          </div>

          <h1 class="text-4xl md:text-6xl font-black mb-8 leading-[0.92] text-foreground max-w-3xl">
            Train an AI chatbot on your business content and deploy it in
            <span class="text-gradient">minutes.</span>
          </h1>

          <p class="text-lg md:text-xl text-foreground/60 mb-10 max-w-2xl leading-relaxed font-semibold">
            ReplySuite helps you answer customer questions faster, capture more leads, and support customers on your website and WhatsApp using your own website content, PDFs, FAQs, and custom text.
          </p>

          <div class="grid sm:grid-cols-1 gap-3 mb-10 max-w-2xl">
            <div v-for="point in outcomePoints" :key="point" class="flex items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3">
              <CheckCircle2 class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span class="text-sm md:text-base text-foreground/75 font-semibold">{{ point }}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 relative z-10 items-center">
            <NuxtLink
              :to="user ? '/dashboard' : '/register'"
              class="btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3 group w-full sm:w-auto"
            >
              {{ user ? 'Go to Dashboard' : 'Start Free' }}
              <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </NuxtLink>

            <button
              @click="openDemoVideo"
              class="px-8 py-5 text-foreground/70 hover:text-foreground transition-all text-base font-bold flex items-center justify-center gap-3 group border border-foreground/10 rounded-full hover:bg-foreground/[0.02] w-full sm:w-auto"
            >
              <div class="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                <Play class="w-3 h-3 fill-current ml-0.5" />
              </div>
              Watch Demo Video
            </button>
          </div>

          <div class="mt-10 flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-widest text-foreground/45">
            <span class="inline-flex items-center gap-2"><ShieldCheck class="w-4 h-4 text-primary" /> Train on your own data</span>
            <span class="inline-flex items-center gap-2"><Globe2 class="w-4 h-4 text-primary" /> Website widget</span>
            <span class="inline-flex items-center gap-2"><MessageCircle class="w-4 h-4 text-primary" /> WhatsApp ready</span>
          </div>
        </div>

        <div id="demo" class="relative hidden lg:block">
          <div class="glass-card p-3 border-foreground/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] transition-all duration-1000">
            <div class="bg-background-card rounded-[28px] overflow-hidden h-[650px] flex flex-col relative border border-foreground/5 shadow-inner">
              <div class="p-6 border-b border-foreground/10 flex items-center justify-between bg-foreground/[0.01]">
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <div class="w-12 h-12 rounded-2xl p-0.5 border border-foreground/5 shadow-sm"
                      :style="{ background: `linear-gradient(to top right, ${chatbot?.primary_color || '#D4AF37'}, ${chatbot?.primary_color || '#D4AF37'}dd)` }">
                      <div class="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                          :style="{ color: chatbot?.primary_color || '#D4AF37' }">
                          <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" stroke-width="2" />
                          <path d="M8 12H8.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          <path d="M16 12H16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                          <path d="M9 16C9 16 10.5 17.5 12 17.5C13.5 17.5 15 16 15 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                      </div>
                    </div>
                    <div class="absolute -right-1 -bottom-1 w-3.5 h-3.5 bg-green-500 border-4 border-background-card rounded-full shadow-sm"></div>
                  </div>
                  <div>
                    <div class="text-sm font-black uppercase text-foreground leading-none">{{ chatbot?.name || 'REPLYSUITE DEMO BOT' }}</div>
                    <div class="text-[9px] text-foreground/30 font-bold uppercase tracking-widest mt-1.5 leading-none">
                      Live demo • trained business assistant
                    </div>
                  </div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-foreground/5 flex items-center justify-center hover:bg-foreground/10 transition-colors cursor-pointer">
                  <Settings class="w-5 h-5 text-foreground/30" />
                </div>
              </div>

              <div class="relative flex-1 min-h-0 overflow-hidden">
                <div class="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background-card to-transparent z-10 pointer-events-none"></div>
                <div
                  ref="scrollRef"
                  class="h-full p-8 space-y-6 overflow-y-hidden flex flex-col scroll-smooth select-none"
                  @wheel.prevent="forwardDemoWheel"
                >
                  <div v-for="(msg, idx) in chatMessages" :key="idx" :class="['flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start']">
                    <div :class="[
                      'p-6 rounded-[2.5rem] text-[13px] transition-all animate-in fade-in slide-in-from-bottom-3 duration-500 prose-sm prose-p:my-1 prose-strong:text-inherit leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-foreground/[0.04] border border-foreground/5 rounded-tr-none max-w-[80%] text-foreground font-bold'
                        : 'text-black font-bold rounded-tl-none max-w-[85%] shadow-2xl shadow-black/10'
                    ]"
                      :style="msg.role === 'assistant' ? { background: `linear-gradient(135deg, ${chatbot?.primary_color || '#D4AF37'} 0%, ${chatbot?.primary_color || '#D4AF37'}ee 100%)` } : {}">
                      <div v-html="renderMarkdown(msg.content)" class="widget-markdown"></div>

                      <div v-if="msg.actions" class="mt-6 flex flex-wrap gap-2">
                        <button
                          v-for="action in msg.actions"
                          :key="action.label"
                          @click="handleQuickAction(action.action)"
                          class="px-4 py-2.5 bg-black/5 hover:bg-black/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-black/10"
                        >
                          {{ action.label }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div v-if="isChatLoading" class="flex justify-end animate-pulse">
                    <div class="bg-primary/10 border border-primary/20 px-6 py-4 rounded-3xl rounded-tr-none">
                      <div class="flex gap-2">
                        <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-8 pt-0 mt-auto">
                <p class="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-3">Ask about pricing, setup, training, or deployment</p>
                <form @submit.prevent="sendDemoMessage" class="relative flex items-center group/form">
                  <input
                    v-model="chatInput"
                    placeholder="Ask the demo bot a question..."
                    class="w-full bg-foreground/[0.04] rounded-2xl pl-6 pr-14 py-4 border border-foreground/10 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/40 focus:bg-background-card transition-all font-bold shadow-inner"
                  />
                  <button
                    type="submit"
                    :disabled="!chatInput.trim() || isChatLoading"
                    class="absolute right-2 w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                  >
                    <Send class="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div class="absolute -z-10 -right-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-8 md:py-12">
      <div class="grid md:grid-cols-3 gap-6">
        <div v-for="card in proofCards" :key="card.title" class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <component :is="card.icon" class="w-7 h-7 text-primary" />
          </div>
          <h3 class="text-xl font-black text-foreground mb-3 tracking-tight">{{ card.title }}</h3>
          <p class="text-sm text-foreground/55 leading-relaxed font-semibold">{{ card.desc }}</p>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="max-w-7xl mx-auto px-6 py-28 border-t border-foreground/5">
      <div class="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <div class="max-w-2xl">
          <span class="badge-gradient mb-6">How it works</span>
          <h2 class="text-4xl md:text-6xl font-extrabold leading-tight text-foreground">
            From business content to
            <span class="text-gradient">live chatbot.</span>
          </h2>
        </div>
        <p class="text-foreground/50 max-w-xl font-semibold leading-relaxed">
          This is the simplest way to get a business-trained AI assistant live without building a custom AI stack from scratch.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="step in steps" :key="step.num" class="glass-card p-10 border-foreground/10 relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
          <div class="text-[11px] font-black tracking-[0.35em] text-primary uppercase mb-6">Step {{ step.num }}</div>
          <h3 class="text-2xl font-black mb-4 text-foreground tracking-tight">{{ step.title }}</h3>
          <p class="text-foreground/55 text-sm leading-relaxed font-semibold">{{ step.desc }}</p>
          <div class="mt-8 h-1 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div class="h-full w-0 bg-primary group-hover:w-full transition-all duration-1000"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-28 border-t border-foreground/5">
      <div class="text-center mb-16 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">Use cases</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
          Built to help you sell, support, and respond
          <span class="text-gradient">faster.</span>
        </h2>
        <p class="text-foreground/50 font-semibold leading-relaxed">
          ReplySuite is easiest to buy when the outcome is obvious: faster answers, fewer missed leads, and better customer response coverage.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="item in useCases" :key="item.title" class="glass-card p-10 border-foreground/10 bg-foreground/[0.02] hover:border-primary/20 transition-all duration-500">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
            <component :is="item.icon" class="w-7 h-7 text-primary" />
          </div>
          <h3 class="text-2xl font-black mb-4 text-foreground tracking-tight">{{ item.title }}</h3>
          <p class="text-sm text-foreground/55 leading-relaxed font-semibold">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-28 border-t border-foreground/5 overflow-hidden">
      <div class="text-center mb-16 max-w-4xl mx-auto relative">
        <div class="absolute inset-0 bg-primary/5 blur-[90px] -z-10"></div>
        <span class="badge-gradient mb-6">Before vs after</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight">
          Imagine what you could do if you had an expert chatbot
          <span class="text-gradient">answering questions 24/7.</span>
        </h2>
        <p class="text-foreground/50 font-semibold leading-relaxed max-w-3xl mx-auto">
          The difference is not just "having AI." It is having a chatbot trained on your real business content, deployed where customers already talk, and designed to reduce repetitive support work.
        </p>
      </div>

      <div class="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-stretch">
        <div class="glass-card relative p-10 md:p-12 border border-rose-500/20 bg-[linear-gradient(180deg,rgba(244,63,94,0.10),rgba(255,255,255,0.02))] overflow-hidden">
          <div class="absolute -top-16 -left-10 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl"></div>
          <div class="relative">
            <div class="inline-flex items-center gap-3 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 mb-8">
              <X class="w-4 h-4 text-rose-300" />
              <span class="text-[10px] font-black uppercase tracking-widest text-rose-200">Before</span>
            </div>
            <h3 class="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-3">
              Fickle, one-size-fits-all chatbots that do more harm than good
            </h3>
            <p class="text-sm text-foreground/55 font-semibold leading-relaxed mb-8 max-w-xl">
              Too generic, too hard to maintain, and not grounded in the real information your customers actually need.
            </p>
            <div class="space-y-4">
              <div v-for="item in beforePoints" :key="item.title" class="rounded-[24px] border border-white/5 bg-black/15 p-5">
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X class="w-4 h-4 text-rose-300" />
                  </div>
                  <div>
                    <h4 class="text-base font-black text-foreground tracking-tight mb-1">{{ item.title }}</h4>
                    <p class="text-sm text-foreground/60 leading-relaxed font-semibold">{{ item.desc }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden lg:flex items-center justify-center">
          <div class="w-16 h-16 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.18)]">
            <ArrowRight class="w-7 h-7 text-primary" />
          </div>
        </div>

        <div class="glass-card relative p-10 md:p-12 border border-primary/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.12),rgba(255,255,255,0.02))] overflow-hidden">
          <div class="absolute -bottom-16 -right-10 w-44 h-44 rounded-full bg-primary/10 blur-3xl"></div>
          <div class="relative">
            <div class="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 mb-8">
              <Check class="w-4 h-4 text-primary" />
              <span class="text-[10px] font-black uppercase tracking-widest text-primary">After</span>
            </div>
            <h3 class="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-3">
              An automated resource that strengthens your support team
            </h3>
            <p class="text-sm text-foreground/55 font-semibold leading-relaxed mb-8 max-w-xl">
              Train once on your business content, answer faster on your website, and grow into WhatsApp support when you are ready.
            </p>
            <div class="grid sm:grid-cols-2 gap-3 mb-8">
              <div class="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-primary text-center">Train on website + PDFs</div>
              <div class="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-primary text-center">Website first, WhatsApp next</div>
            </div>
            <div class="space-y-4">
              <div v-for="item in afterPoints" :key="item.title" class="rounded-[24px] border border-white/5 bg-black/15 p-5">
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check class="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 class="text-base font-black text-foreground tracking-tight mb-1">{{ item.title }}</h4>
                    <p class="text-sm text-foreground/60 leading-relaxed font-semibold">{{ item.desc }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-28 border-t border-foreground/5">
      <div class="grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <span class="badge-gradient mb-6">Why businesses buy</span>
          <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight">
            Built to save time and
            <span class="text-gradient">win more conversations.</span>
          </h2>
          <p class="text-foreground/50 font-semibold leading-relaxed max-w-2xl">
            ReplySuite gives you the tools to train, test, and deploy one business chatbot across your website and WhatsApp. The value is simple: faster replies, fewer missed leads, and better customer coverage.
          </p>
        </div>

        <div class="space-y-6">
          <div v-for="item in reasonsToBuy" :key="item.title" class="glass-card p-8 border-foreground/10 bg-foreground/[0.02] flex gap-5 items-start">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <component :is="item.icon" class="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 class="text-xl font-black text-foreground mb-2 tracking-tight">{{ item.title }}</h3>
              <p class="text-sm text-foreground/55 leading-relaxed font-semibold">{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-28 border-t border-foreground/5">
      <div class="text-center mb-16 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">What customers are saying</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
          The kind of feedback
          <span class="text-gradient">business owners care about.</span>
        </h2>
        <p class="text-foreground/50 font-semibold leading-relaxed">
          Simple, human feedback focused on setup speed, better replies, and less repetitive work.
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-8">
        <div v-for="item in testimonialSamples" :key="item.name" class="glass-card p-10 border-foreground/10 bg-foreground/[0.02]">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
            <MessageSquareMore class="w-7 h-7 text-primary" />
          </div>
          <p class="text-foreground/75 leading-relaxed font-semibold text-sm mb-8">
            “{{ item.quote }}”
          </p>
          <div class="pt-6 border-t border-foreground/10">
            <p class="text-foreground font-black tracking-tight">{{ item.name }}</p>
            <p class="text-foreground/50 text-xs font-semibold uppercase tracking-widest mt-2">{{ item.role }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="max-w-7xl mx-auto px-6 py-28 border-t border-foreground/5">
      <div class="text-center mb-20 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">Pricing</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground">
          Start free, then scale into more training,
          <span class="text-gradient">more replies, and WhatsApp.</span>
        </h2>
        <p class="text-foreground/50 mt-6 font-semibold leading-relaxed">
          Same pricing, clearer fit: choose the plan that matches your volume and channel needs.
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-8">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="glass-card p-10 flex flex-col relative transition-all duration-500 hover:-translate-y-4 border-foreground/10"
          :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : 'bg-foreground/[0.02]'"
        >
          <div
            v-if="plan.popular"
            class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-[10px] font-bold tracking-widest rounded-full uppercase"
          >
            Best Value
          </div>

          <div class="mb-8">
            <h3 class="text-2xl font-black mb-2 text-foreground tracking-tight">{{ plan.name }}</h3>
            <p class="text-sm text-foreground/50 font-semibold">{{ plan.desc }}</p>
          </div>

          <div class="mb-10 flex items-baseline gap-2">
            <span class="text-5xl font-extrabold text-foreground">${{ plan.price }}</span>
            <span class="text-foreground/50 font-bold tracking-widest text-[10px] uppercase">/mo</span>
          </div>

          <button
            @click="handleSelect(plan)"
            :disabled="isProcessing === plan.id"
            class="w-full py-5 rounded-full font-bold text-center mb-10 transition-all tracking-widest text-xs flex items-center justify-center gap-2"
            :class="plan.popular ? 'btn-gradient' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20'"
          >
            <template v-if="isProcessing === plan.id">
              <Loader2 class="w-4 h-4 animate-spin" />
              Processing...
            </template>
            <template v-else>
              {{ isAuthenticated ? (plan.id === 'starter' ? 'Activate Free' : 'Select Plan') : (plan.id === 'gold' ? 'Get Started' : 'Start Free') }}
            </template>
          </button>

          <div class="space-y-4 flex-grow">
            <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-3 text-xs font-semibold text-foreground/55">
              <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check class="w-2.5 h-2.5 text-primary" />
              </div>
              {{ feat }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-5xl mx-auto px-6 py-28">
      <div class="bg-foreground/[0.03] p-12 md:p-20 rounded-[40px] border border-foreground/10 text-center relative overflow-hidden backdrop-blur-sm">
        <div class="absolute inset-0 bg-primary/5 blur-[120px]"></div>

        <h2 class="text-4xl md:text-6xl font-extrabold mb-8 relative z-10 leading-tight text-foreground">
          Launch your first business-trained chatbot
          <span class="text-foreground/55">today.</span>
        </h2>

        <p class="text-foreground/55 max-w-2xl mx-auto mb-10 relative z-10 font-semibold leading-relaxed">
          Start with your website, train the bot on your content, and expand into WhatsApp when you want more revenue and support automation.
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
          <NuxtLink
            to="/register"
            class="bg-foreground text-background px-10 py-5 rounded-full font-bold text-lg inline-flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-foreground/10"
          >
            Start Free
            <ArrowRight class="w-5 h-5" />
          </NuxtLink>
          <button
            @click="scrollToSection('pricing')"
            class="px-10 py-5 rounded-full font-bold text-lg inline-flex items-center justify-center gap-3 border border-foreground/10 text-foreground hover:bg-foreground/[0.04] transition-all"
          >
            View Pricing
            <FileText class="w-5 h-5" />
          </button>
        </div>

        <p class="text-foreground/50 mt-10 text-xs relative z-10 tracking-[0.2em] font-bold uppercase">
          No credit card required • Start with one chatbot • Upgrade when you need more
        </p>
      </div>
    </section>

    <div v-if="isDemoVideoOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        class="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close demo video"
        @click="closeDemoVideo"
      ></button>
      <div class="relative z-10 w-full max-w-5xl rounded-[28px] border border-foreground/10 bg-background shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-foreground/10 bg-foreground/[0.02]">
          <div>
            <p class="text-sm font-black text-foreground tracking-tight">ReplySuite demo video</p>
            <p class="text-[11px] font-semibold text-foreground/50 uppercase tracking-widest">Watch without leaving the site</p>
          </div>
          <button
            @click="closeDemoVideo"
            class="w-10 h-10 rounded-xl border border-foreground/10 bg-foreground/[0.03] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.06] transition-all flex items-center justify-center"
            aria-label="Close demo video"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="aspect-video bg-black">
          <iframe
            v-if="isDemoVideoOpen"
            class="w-full h-full"
            :src="demoVideoUrl"
            title="ReplySuite demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[28px];
}

.perspective-1000 {
  perspective: 1000px;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-20px);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 3s;
}
</style>
