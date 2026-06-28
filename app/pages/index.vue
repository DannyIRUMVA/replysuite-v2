<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import {
  ArrowRight,
  Play,
  CheckCircle2,
  CreditCard,
  Settings,
  Bot,
  BrainCircuit,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
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
  Zap,
  Info,
  X,
  Paperclip,
  SmilePlus,
  Quote,
  Star,
  CalendarCheck
} from 'lucide-vue-next'
import { marked } from 'marked'
import xss from 'xss'

useSeoMeta({
  title: 'AI Command Center for Customer Conversations | ReplySuite',
  ogTitle: 'ReplySuite | AI command center for customer conversations',
  description: 'Train one AI assistant and reply across supported customer channels: website chat, WhatsApp, Instagram comments, Instagram DMs, and booking workflows.',
  ogDescription: 'Train once, then reply across website chat, WhatsApp, Instagram comments, Instagram DMs, and booking workflows with ReplySuite.',
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
  'One trained assistant for support, lead capture, and booking intake',
  'Ground answers in your website, PDFs, FAQs, and business notes',
  'Start with website chat, then unlock WhatsApp, Instagram, and booking tools as you grow'
]

const proofCards = [
  {
    title: 'Missed WhatsApp messages',
    desc: 'Customers ask questions, but delayed replies mean lost sales, missed bookings, and colder leads.',
    icon: MessageCircle
  },
  {
    title: 'Repetitive support work',
    desc: 'Your team keeps answering the same pricing, service, and FAQ questions over and over.',
    icon: MessageSquare
  },
  {
    title: 'Unavailable staff',
    desc: 'When your business is closed, customers still expect quick answers and a simple way to keep talking.',
    icon: Clock3
  }
]

const steps = [
  {
    num: '01',
    title: 'Train your AI on your business',
    desc: 'Use your website, PDFs, FAQs, or custom text so your assistant answers with real business context.'
  },
  {
    num: '02',
    title: 'Connect your website and WhatsApp',
    desc: 'Launch your website chatbot first, then expand into WhatsApp support when you are ready.'
  },
  {
    num: '03',
    title: 'Reply instantly and capture leads',
    desc: 'Automate common questions, collect new leads, and give customers answers any time of day.'
  }
]

const useCases = [
  {
    title: 'Clinics',
    pain: 'Patients ask about services, appointments, pricing, and opening hours when your team is busy.',
    solution: 'ReplySuite answers common questions instantly and helps capture appointment and inquiry details.',
    icon: ShieldCheck
  },
  {
    title: 'Restaurants',
    pain: 'Customers want menus, location details, delivery info, and quick answers before ordering.',
    solution: 'Use a website chatbot and WhatsApp AI assistant to reply faster and reduce repetitive questions.',
    icon: MessageSquare
  },
  {
    title: 'Schools',
    pain: 'Parents and students keep asking about admissions, fees, documents, and schedules.',
    solution: 'ReplySuite gives instant FAQ answers and helps staff handle more important follow-up.',
    icon: FileText
  },
  {
    title: 'Hotels',
    pain: 'Guests ask about room availability, check-in times, amenities, and booking details at all hours.',
    solution: 'Automate hospitality FAQs, collect guest interest, and keep responses available 24/7.',
    icon: Globe2
  },
  {
    title: 'Real Estate',
    pain: 'Property inquiries slow down when agents cannot respond immediately to every message.',
    solution: 'Capture leads faster, answer listing questions, and keep prospects engaged while your team follows up.',
    icon: Sparkles
  }
]

const activeUseCase = ref(0)
const useCaseCardRefs = ref<HTMLElement[]>([])

const setUseCaseCardRef = (el: Element | null, index: number) => {
  if (!el) return
  useCaseCardRefs.value[index] = el as HTMLElement
}

const focusUseCase = (index: number) => {
  activeUseCase.value = index
  nextTick(() => {
    useCaseCardRefs.value[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start'
    })
  })
}

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

const beforeAfterRows = [
  {
    area: 'Answers',
    before: 'Generic replies that miss policies, pricing, files, and real business context.',
    after: 'Replies grounded in your website, PDFs, FAQs, and custom training text.'
  },
  {
    area: 'Speed',
    before: 'Customers wait for staff to repeat the same answers manually.',
    after: 'Instant first responses on your website, with WhatsApp available as you scale.'
  },
  {
    area: 'Maintenance',
    before: 'Fragile custom bots become expensive to update when the business changes.',
    after: 'Update training content from the dashboard and keep the assistant aligned.'
  },
  {
    area: 'Team workload',
    before: 'Support teams lose time to repetitive pre-sales and FAQ conversations.',
    after: 'Common questions are automated so humans can focus on high-value follow-up.'
  }
]

const demoVideoUrl = 'https://www.youtube-nocookie.com/embed/drp1wlRRSr4?autoplay=1&rel=0'
const isDemoVideoOpen = ref(false)
const demoAccent = '#D4AF37'
const demoAccentDeep = '#B78E17'
const demoAssistantBubble = 'linear-gradient(135deg, rgba(212,175,55,0.30) 0%, rgba(183,142,23,0.24) 100%)'
const demoAccentSoft = 'rgba(212,175,55,0.08)'

const openDemoVideo = () => {
  isDemoVideoOpen.value = true
}

const closeDemoVideo = () => {
  isDemoVideoOpen.value = false
}

const testimonialSamples = [
  {
    quote: 'ReplySuite helped us answer repeated questions much faster. Customers now get the basics immediately, and our team only steps in for the important follow-up.',
    name: 'Sarah Thompson',
    role: 'Founder',
    company: 'Online retail brand',
    initials: 'ST',
    channel: 'Website chatbot'
  },
  {
    quote: 'Training the assistant on our own content made a big difference. The replies feel specific to our services instead of sounding like a generic chatbot.',
    name: 'Kevin Mwangi',
    role: 'Operations manager',
    company: 'Service business',
    initials: 'KM',
    channel: 'Training sources'
  },
  {
    quote: 'We started with the website assistant, tested the most common questions, and then planned WhatsApp as the next support channel. The setup path was clear.',
    name: 'Aline Uwase',
    role: 'Customer support lead',
    company: 'Growing local team',
    initials: 'AU',
    channel: 'Support workflow'
  }
]

const socialProofMetrics = [
  { label: 'Supported channel path', value: 'Web, WhatsApp, Instagram' },
  { label: 'Support coverage', value: '24/7' },
  { label: 'Business languages supported', value: '10+' }
]

const socialProofRows = [
  { label: 'Website deployment', value: 'Embed chatbot on approved domains', detail: 'Included from Free Starter upward' },
  { label: 'WhatsApp chatbot', value: 'Available from Silver', detail: 'Built for higher-volume customer conversations' },
  { label: 'Instagram workflows', value: 'Available from Gold', detail: 'Automate comment replies and comment-to-DM flows' },
  { label: 'Training sources', value: 'Website, PDFs, FAQs, custom text', detail: 'Keeps answers closer to your business content' },
  { label: 'Monthly AI replies', value: '100 to 500,000', detail: 'Scale from Starter to Enterprise Ready' },
  { label: 'Training sessions', value: '10 to 1,000 / month', detail: 'Plan limits match launch, growth, and rollout needs' },
  { label: 'Supported languages', value: '10+ business languages', detail: 'Includes English, Kinyarwanda, Swahili, Kirundi, Luganda, Arabic, and more' }
]

const logoPills = ['Clinics', 'Restaurants', 'Schools', 'Hotels', 'Real Estate']

const faqItems = [
  { q: 'How fast can I launch my first chatbot?', a: 'Most businesses can create, train, and test their first assistant quickly from the dashboard, then improve it as they add more content.' },
  { q: 'Can I train it with my own business content?', a: 'Yes. You can train your assistant with website pages, PDFs, FAQs, and custom text so replies stay closer to your real business information.' },
  { q: 'Does ReplySuite support WhatsApp?', a: 'Yes. ReplySuite supports WhatsApp AI assistant workflows for businesses that want faster support and lead capture on WhatsApp.' },
  { q: 'Can it answer in local languages?', a: 'Yes. ReplySuite supports Kinyarwanda, Swahili, Kirundi, Luganda, Arabic, English, and more business languages.' },
  { q: 'Is there a free plan?', a: 'Yes. Free Starter lets you launch one website chatbot with basic monthly limits, then upgrade when you need more replies, training, or channels.' }
]

const chatbotId = 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
const chatInput = ref('')
const isChatLoading = ref(false)
const isChatbotLoading = ref(true)
const chatbot = ref<any>(null)
const demoEmbedToken = ref('')
const demoEmbedHost = ref('')
const demoSessionId = ref('')
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

const chatIconMap: Record<string, any> = {
  Bot,
  MessageSquare,
  Sparkles,
  Zap,
  HelpCircle: Info,
  Info,
  MessageSquareMore
}

const demoChatIcon = computed(() => {
  const iconName = chatbot.value?.chat_icon || 'Bot'
  return chatIconMap[iconName] || Bot
})

const fetchChatbot = async () => {
  isChatbotLoading.value = true

  try {
    const data = await $fetch<any>(`/api/public/config/${chatbotId}`)
    if (data?.success) {
      chatbot.value = {
        name: data.name,
        welcome_message: data.welcomeMessage,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        chat_bubble_style: data.bubbleStyle,
        widget_position: data.widgetPosition,
        ai_disclosure: data.aiDisclosure,
        chat_icon: data.chatIcon,
        chat_icon_color: data.chatIconColor,
        launcher_color: data.launcherColor,
      }
      demoEmbedToken.value = data.embedToken || ''
      demoEmbedHost.value = data.embedHost || ''
    }
  } catch (e) {
    console.error('Failed to fetch chatbot:', e)
  }

  demoSessionId.value = ''

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

  isChatbotLoading.value = false
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
    const res = await $fetch<{ success: boolean; response: string; sessionId?: string }>('/api/public/chat', {
      method: 'POST',
      body: {
        chatbotId,
        message: userMsg,
        sessionId: demoSessionId.value || undefined,
        embedToken: demoEmbedToken.value || undefined,
        embedHost: demoEmbedHost.value || undefined,
      }
    })

    if (res.success) {
      demoSessionId.value = res.sessionId || demoSessionId.value
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

const { isAuthenticated, refreshAuth } = useAuth()
const notify = useNotify()
const isProcessing = ref<string | null>(null)

const plans = [
  {
    name: 'Free Starter',
    id: 'starter',
    price: '0.00',
    desc: 'Best for launching one chatbot on one website domain.',
    features: ['1 website chatbot', '1 connected domain / chatbot', '100 AI replies / mo', '10 training sessions', 'Email support'],
    popular: false
  },
  {
    name: 'Silver',
    id: 'silver',
    productId: 'dc070937-6444-40a6-8a02-fd8b25df7aae',
    price: '17.88',
    desc: 'Best for growing businesses that want website and WhatsApp chatbots.',
    features: ['3 chatbots', 'Website + WhatsApp support', '5 connected domains / chatbot', '4,000 AI replies / mo', '30 training sessions'],
    popular: true
  },
  {
    name: 'Gold',
    id: 'gold',
    productId: 'd0493f6f-16bc-4d3c-97bb-7be920840f12',
    price: '26.88',
    desc: 'Best for businesses ready for Instagram workflows and higher-volume conversations.',
    features: ['5 chatbots', 'Website + WhatsApp support', 'Instagram workflows', '10,000 AI replies / mo', '100 training sessions'],
    popular: false
  },
  {
    name: 'Enterprise Ready',
    id: 'enterprise-ready',
    productId: '3e478611-c444-46e5-9827-7450a1c8d046',
    price: '350.00',
    desc: 'Self-serve Enterprise for larger rollouts that need every channel plus AI business tools.',
    features: ['50 chatbots', 'All supported channels', '500,000 AI replies / mo', 'AI business tools', 'Appointments, bookings, Google Calendar, Paypack checkout'],
    popular: false
  }
]

const paidPlans = computed(() => plans.filter((plan) => plan.id !== 'starter'))
const freeStarterPlan = computed(() => plans.find((plan) => plan.id === 'starter'))

onMounted(() => {
  fetchChatbot()
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
        // Use full-page Polar checkout so the dashboard returns cleanly after payment.
        window.location.href = res.url
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
  <div class="relative overflow-x-hidden">
    <section class="relative pt-14 pb-20 md:pt-24 md:pb-24 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <div class="flex items-center gap-3 mb-8 opacity-80 group cursor-default">
            <div class="h-[1px] w-10 bg-primary/40 group-hover:w-14 transition-all duration-500"></div>
            <span class="text-[11px] font-bold tracking-[0.3em] text-primary uppercase">AI command center for customer conversations</span>
          </div>

          <h1 class="text-4xl md:text-6xl font-black mb-8 leading-[0.92] text-foreground max-w-3xl">
            Train once.
            <span class="text-gradient"> Reply across every supported channel.</span>
          </h1>

          <p class="text-lg md:text-xl text-foreground/60 mb-10 max-w-2xl leading-relaxed font-semibold">
            Train one AI assistant on your website, FAQs, files, and business notes, then use it for website chat, WhatsApp, Instagram comments and DMs, plus appointment booking workflows as your plan grows.
          </p>

          <div class="grid sm:grid-cols-1 gap-2.5 mb-10 max-w-xl">
            <div v-for="point in outcomePoints" :key="point"
              class="flex items-start gap-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
              <CheckCircle2 class="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span class="text-xs md:text-sm text-foreground/75 font-semibold leading-snug">{{ point }}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 relative z-10 items-center">
            <NuxtLink :to="user ? '/dashboard' : '/register'"
              class="btn-gradient px-10 py-5 text-lg flex items-center justify-center gap-3 group w-full sm:w-auto">
              {{ user ? 'Go to Dashboard' : 'Start Free' }}
              <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </NuxtLink>

            <button @click="openDemoVideo"
              class="px-8 py-5 text-foreground/70 hover:text-foreground transition-all text-base font-bold flex items-center justify-center gap-3 group border border-foreground/10 rounded-full hover:bg-foreground/[0.02] w-full sm:w-auto">
              <div
                class="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                <Play class="w-3 h-3 fill-current ml-0.5" />
              </div>
              Watch Demo
            </button>
          </div>

          <div
            class="mt-10 flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-widest text-foreground/60">
            <span class="inline-flex items-center gap-2">
              <ShieldCheck class="w-4 h-4 text-primary" /> Train on your own content
            </span>
            <span class="inline-flex items-center gap-2">
              <Globe2 class="w-4 h-4 text-primary" /> Website widget
            </span>
            <span class="inline-flex items-center gap-2">
              <MessageCircle class="w-4 h-4 text-primary" /> WhatsApp
            </span>
            <span class="inline-flex items-center gap-2">
              <MessageSquareMore class="w-4 h-4 text-primary" /> Instagram comments + DMs
            </span>
            <span class="inline-flex items-center gap-2">
              <CalendarCheck class="w-4 h-4 text-primary" /> Bookings + Google Calendar
            </span>
          </div>
        </div>

        <div id="demo" class="relative hidden lg:block">
          <div class="relative transition-all duration-1000">
            <div
              class="bg-background-card dark:bg-zinc-900 rounded-[28px] overflow-hidden h-[700px] flex flex-col relative border border-foreground/6 dark:border-white/5 shadow-[0_32px_90px_-28px_rgba(15,23,42,0.22)] dark:shadow-[0_32px_90px_-28px_rgba(0,0,0,0.62)]">
              <div
                class="px-5 pt-5 pb-4 border-b border-foreground/6 dark:border-white/5 bg-background-card dark:bg-zinc-900">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="relative flex-shrink-0">
                      <div
                        class="w-11 h-11 rounded-2xl flex items-center justify-center text-foreground shadow-sm border border-primary/10"
                        :style="{ background: demoAccentSoft }">
                        <component :is="demoChatIcon" class="w-5 h-5"
                          :style="chatbot?.chat_icon_color ? { color: chatbot.chat_icon_color } : {}" />
                      </div>
                      <div
                        class="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-emerald-500 border-2 border-background-card rounded-full">
                      </div>
                    </div>
                    <div class="min-w-0">
                      <template v-if="isChatbotLoading">
                        <div class="h-3.5 w-36 rounded-full bg-foreground/10 animate-pulse"></div>
                        <div class="h-2.5 w-28 rounded-full bg-foreground/8 animate-pulse mt-2"></div>
                      </template>
                      <template v-else>
                        <div class="text-sm font-black leading-none text-foreground truncate">{{ chatbot?.name ||
                          'ReplySuite Assistant' }}</div>
                        <div class="text-[11px] text-foreground/55 font-semibold mt-1">Typically replies in seconds</div>
                      </template>
                    </div>
                  </div>

                  <button type="button"
                    aria-label="Close demo chat preview"
                    class="w-9 h-9 rounded-xl bg-foreground/[0.03] border border-foreground/8 flex items-center justify-center text-foreground/70 hover:bg-foreground/[0.05] transition-colors">
                    <X class="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div
                class="relative flex-1 min-h-0 overflow-hidden bg-background-card dark:bg-zinc-900">
                <div
                  class="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background-card via-background-card/92 to-transparent dark:from-zinc-900 dark:via-zinc-900/92 z-10 pointer-events-none">
                </div>
                <div ref="scrollRef"
                  class="h-full p-4 space-y-3.5 overflow-y-hidden flex flex-col scroll-smooth select-none"
                  @wheel.prevent="forwardDemoWheel">
                  <template v-if="isChatbotLoading">
                    <div class="self-start max-w-[84%] rounded-2xl border border-foreground/8 dark:border-white/5 bg-background dark:bg-zinc-900 px-4 py-3 shadow-sm dark:shadow-none animate-pulse">
                      <div class="flex items-center gap-2 mb-3">
                        <div class="w-7 h-7 rounded-xl bg-foreground/10"></div>
                        <div class="space-y-2">
                          <div class="h-2.5 w-24 rounded-full bg-foreground/10"></div>
                          <div class="h-2 w-36 rounded-full bg-foreground/8"></div>
                        </div>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <div class="h-7 w-16 rounded-full bg-foreground/8"></div>
                        <div class="h-7 w-20 rounded-full bg-foreground/8"></div>
                        <div class="h-7 w-24 rounded-full bg-foreground/8"></div>
                      </div>
                    </div>

                    <div class="flex flex-col items-start gap-2 animate-pulse">
                      <div class="flex items-center gap-2 px-1">
                        <div class="w-7 h-7 rounded-full bg-foreground/10"></div>
                        <div class="h-2.5 w-28 rounded-full bg-foreground/8"></div>
                      </div>
                      <div class="w-[78%] rounded-2xl rounded-bl-md border border-foreground/6 dark:border-white/5 bg-background dark:bg-zinc-900 px-4 py-3 space-y-2">
                        <div class="h-2.5 w-[88%] rounded-full bg-foreground/8"></div>
                        <div class="h-2.5 w-[70%] rounded-full bg-foreground/8"></div>
                      </div>
                    </div>

                    <div class="flex flex-col items-end gap-2 animate-pulse">
                      <div class="flex items-center gap-2 px-1 flex-row-reverse">
                        <div class="w-7 h-7 rounded-full bg-sky-500/20"></div>
                        <div class="h-2.5 w-16 rounded-full bg-foreground/8"></div>
                      </div>
                      <div class="w-[62%] rounded-2xl rounded-br-md bg-sky-500/75 px-4 py-3 space-y-2">
                        <div class="h-2.5 w-[80%] rounded-full bg-white/40"></div>
                        <div class="h-2.5 w-[58%] rounded-full bg-white/35"></div>
                      </div>
                    </div>

                    <div class="flex flex-col items-start gap-2 animate-pulse">
                      <div class="flex items-center gap-2 px-1">
                        <div class="w-7 h-7 rounded-full bg-foreground/10"></div>
                        <div class="h-2.5 w-28 rounded-full bg-foreground/8"></div>
                      </div>
                      <div class="w-[82%] rounded-2xl rounded-bl-md border border-foreground/6 dark:border-white/5 bg-background dark:bg-zinc-900 px-4 py-3 space-y-2">
                        <div class="h-2.5 w-[84%] rounded-full bg-foreground/8"></div>
                        <div class="h-2.5 w-[76%] rounded-full bg-foreground/8"></div>
                        <div class="h-2.5 w-[52%] rounded-full bg-foreground/8"></div>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div
                      class="self-start max-w-[84%] rounded-2xl border border-foreground/8 dark:border-white/5 bg-background dark:bg-zinc-900 px-4 py-3 shadow-sm dark:shadow-none">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-7 h-7 rounded-xl flex items-center justify-center border border-primary/10"
                          :style="{ background: demoAccentSoft }">
                          <component :is="demoChatIcon" class="w-3.5 h-3.5 text-foreground"
                            :style="chatbot?.chat_icon_color ? { color: chatbot.chat_icon_color } : {}" />
                        </div>
                        <div>
                          <p class="text-[11px] font-black text-foreground">Hi there 👋</p>
                          <p class="text-[10px] text-foreground/65 font-semibold">Ask about setup, pricing, training, or
                            WhatsApp.</p>
                        </div>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <button type="button" @click="chatInput = 'How does setup work?'"
                          class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5 text-[10px] font-bold text-foreground/65 hover:border-primary/15 hover:text-foreground transition-colors">
                          Setup
                        </button>
                        <button type="button" @click="chatInput = 'Can I train it on my website and PDFs?'"
                          class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5 text-[10px] font-bold text-foreground/65 hover:border-primary/15 hover:text-foreground transition-colors">
                          Training
                        </button>
                        <button type="button" @click="chatInput = 'How does WhatsApp integration work?'"
                          class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-3 py-1.5 text-[10px] font-bold text-foreground/65 hover:border-primary/15 hover:text-foreground transition-colors">
                          WhatsApp
                        </button>
                      </div>
                    </div>
                    <div v-for="(msg, idx) in chatMessages" :key="idx" class="flex flex-col gap-2"
                      :class="msg.role === 'user' ? 'items-end' : 'items-start'">
                    <div class="flex items-center gap-2 px-1" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm"
                        :class="msg.role === 'user' ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-500/20' : 'text-foreground border border-primary/10'"
                        :style="msg.role === 'assistant' ? { background: demoAccentSoft } : {}">
                        <template v-if="msg.role === 'user'">You</template>
                        <component v-else :is="demoChatIcon" class="w-3.5 h-3.5"
                          :style="chatbot?.chat_icon_color ? { color: chatbot.chat_icon_color } : {}" />
                      </div>
                      <span class="text-[10px] font-bold tracking-wide"
                        :class="msg.role === 'user' ? 'text-foreground/60' : 'text-foreground/65'">
                        {{ msg.role === 'user' ? 'Visitor' : 'ReplySuite assistant' }}
                      </span>
                    </div>

                    <div :class="[
                      'px-4 py-3 rounded-2xl text-[12px] transition-all animate-in fade-in slide-in-from-bottom-3 duration-500 prose-sm prose-p:my-1 prose-strong:text-inherit leading-relaxed shadow-sm',
                      msg.role === 'user'
                        ? 'bg-sky-500 rounded-br-md max-w-[76%] text-white font-semibold border border-sky-600/70 shadow-[0_10px_24px_rgba(14,165,233,0.22)]'
                        : 'bg-background dark:bg-zinc-900 border border-foreground/6 dark:border-white/5 rounded-bl-md max-w-[84%] text-foreground'
                    ]">
                      <div v-html="renderMarkdown(msg.content)" class="widget-markdown"></div>

                      <div v-if="msg.actions" class="mt-4 flex flex-wrap gap-2">
                        <button v-for="action in msg.actions" :key="action.label"
                          @click="handleQuickAction(action.action)"
                          class="px-3 py-2 bg-background hover:bg-background rounded-full text-[9px] font-black uppercase tracking-widest transition-all border border-foreground/10 text-foreground/75">
                          {{ action.label }}
                        </button>
                      </div>
                    </div>
                  </div>

                    <div v-if="isChatLoading" class="flex flex-col items-start gap-2 animate-pulse">
                      <div class="flex items-center gap-2 px-1">
                        <div
                          class="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-foreground border border-primary/10 shadow-sm"
                          :style="{ background: demoAccentSoft }">
                          <component :is="demoChatIcon" class="w-3.5 h-3.5"
                            :style="chatbot?.chat_icon_color ? { color: chatbot.chat_icon_color } : {}" />
                        </div>
                        <span class="text-[10px] font-bold tracking-wide text-foreground/65">ReplySuite assistant</span>
                      </div>
                      <div
                        class="border border-foreground/6 dark:border-white/5 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm dark:shadow-none bg-background dark:bg-zinc-900">
                        <div class="flex gap-1.5">
                          <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div
                class="p-4 pt-3 mt-auto border-t border-foreground/6 dark:border-white/5 bg-background-card dark:bg-zinc-900">
                <div class="flex items-center gap-2 mb-3 text-foreground/60">
                  <button type="button"
                    aria-label="Attach a file in the demo chat"
                    class="w-9 h-9 rounded-xl border border-foreground/8 dark:border-white/5 bg-foreground/[0.02] dark:bg-white/[0.02] flex items-center justify-center hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05] transition-colors">
                    <Paperclip class="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button type="button"
                    aria-label="Open emoji picker in the demo chat"
                    class="w-9 h-9 rounded-xl border border-foreground/8 dark:border-white/5 bg-foreground/[0.02] dark:bg-white/[0.02] flex items-center justify-center hover:bg-foreground/[0.04] dark:hover:bg-white/[0.05] transition-colors">
                    <SmilePlus class="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <form @submit.prevent="sendDemoMessage" class="relative flex items-center group/form">
                  <input v-model="chatInput" :disabled="isChatbotLoading" :placeholder="isChatbotLoading ? 'Loading chatbot…' : 'Send us a message...'"
                    class="w-full bg-background dark:bg-zinc-900 rounded-2xl pl-4 pr-14 py-4 border border-foreground/8 dark:border-white/5 text-sm text-foreground placeholder:text-foreground/55 focus:outline-none focus:border-primary/20 focus:bg-background-card dark:focus:bg-zinc-900 transition-all font-semibold shadow-[0_4px_18px_rgba(15,23,42,0.04)] dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed" />
                  <button type="submit" :disabled="isChatbotLoading || !chatInput.trim() || isChatLoading"
                    class="absolute right-2 w-10 h-10 text-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed border border-primary/8"
                    :style="{ background: demoAssistantBubble }">
                    <Send class="w-4 h-4" />
                  </button>
                </form>

                <div class="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold text-foreground/60">
                  <span>Usually replies in a few seconds</span>
                  <span class="text-primary/60">ReplySuite</span>
                </div>
              </div>
            </div>
          </div>

          <div class="absolute -z-10 -right-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]"></div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-8 md:py-12">
      <div class="text-center mb-12 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">The problem</span>
        <h2 class="text-4xl md:text-5xl font-extrabold text-foreground mb-5">
          Businesses lose customers when replies take too long.
        </h2>
        <p class="text-foreground/65 font-semibold leading-relaxed">
          Slow responses create missed leads, frustrated customers, and more repetitive work for your team.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        <div v-for="card in proofCards" :key="card.title"
          class="glass-card p-8 border-foreground/10 bg-foreground/[0.02]">
          <div
            class="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <component :is="card.icon" class="w-7 h-7 text-primary" />
          </div>
          <h3 class="text-xl font-black text-foreground mb-3 tracking-tight">{{ card.title }}</h3>
          <p class="text-sm text-foreground/55 leading-relaxed font-semibold">{{ card.desc }}</p>
        </div>
      </div>
    </section>

    <section id="how-it-works" class="max-w-7xl mx-auto px-6 py-20 md:py-24 border-t border-foreground/5">
      <div class="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <div class="max-w-2xl">
          <span class="badge-gradient mb-6">The solution</span>
          <h2 class="text-4xl md:text-6xl font-extrabold leading-tight text-foreground">
            ReplySuite answers customers instantly
            <span class="text-gradient">using AI trained on your business.</span>
          </h2>
        </div>
        <p class="text-foreground/65 max-w-xl font-semibold leading-relaxed">
          Use one assistant across your website and WhatsApp to automate customer support, multilingual replies, FAQs, and lead capture.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="step in steps" :key="step.num"
          class="glass-card p-10 border-foreground/10 relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
          <div class="text-[11px] font-black tracking-[0.35em] text-primary uppercase mb-6">Step {{ step.num }}</div>
          <h3 class="text-2xl font-black mb-4 text-foreground tracking-tight">{{ step.title }}</h3>
          <p class="text-foreground/55 text-sm leading-relaxed font-semibold">{{ step.desc }}</p>
          <div class="mt-8 h-1 w-full bg-foreground/5 rounded-full overflow-hidden">
            <div class="h-full w-0 bg-primary group-hover:w-full transition-all duration-1000"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 border-t border-foreground/5">
      <div class="text-center mb-16 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">Use cases</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
          Built for businesses that need faster replies
          <span class="text-gradient">every day.</span>
        </h2>
        <p class="text-foreground/65 font-semibold leading-relaxed">
          Start with the industry that looks most like yours, then train your assistant on the exact information your customers need.
        </p>
      </div>

      <div class="flex items-center justify-center gap-2 mb-8 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">
        <span>Click a card to focus</span>
        <div class="h-px w-8 bg-foreground/10"></div>
        <span>Slide to explore more</span>
      </div>

      <div class="-mx-6 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="flex gap-5 w-max snap-x snap-mandatory">
          <button
            v-for="(item, index) in useCases"
            :key="item.title"
            :ref="(el) => setUseCaseCardRef(el, index)"
            @click="focusUseCase(index)"
            class="glass-card snap-start p-8 text-left border-foreground/10 bg-foreground/[0.02] transition-all duration-500 shrink-0 basis-[86vw] sm:basis-[68vw] lg:basis-[42vw] xl:basis-[38vw] 2xl:basis-[34vw]"
            :class="activeUseCase === index ? 'border-primary/15 bg-primary/[0.025] shadow-[0_18px_50px_rgba(212,175,55,0.05)] dark:border-primary/20 dark:bg-primary/[0.05] dark:shadow-[0_18px_50px_rgba(212,175,55,0.10)]' : 'hover:border-primary/15'"
          >
            <div class="flex items-start justify-between gap-4 mb-6">
              <div
                class="w-12 h-12 rounded-2xl border flex items-center justify-center"
                :class="activeUseCase === index ? 'bg-primary/8 border-primary/15 dark:bg-primary/15 dark:border-primary/25' : 'bg-primary/6 border-primary/12 dark:bg-primary/10 dark:border-primary/20'"
              >
                <component :is="item.icon" class="w-6 h-6 text-primary/85 dark:text-primary" />
              </div>
              <span class="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
                :class="activeUseCase === index ? 'bg-primary/8 text-primary/80 border border-primary/15 dark:bg-primary/15 dark:text-primary dark:border-primary/20' : 'bg-foreground/5 text-foreground/60 border border-foreground/10'">
                {{ index + 1 }}/{{ useCases.length }}
              </span>
            </div>
            <h3 class="text-xl font-black mb-3 text-foreground tracking-tight">{{ item.title }}</h3>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/60 mb-2">Customer pain</p>
            <p class="text-[13px] text-foreground/55 leading-6 font-semibold mb-4">{{ item.pain }}</p>
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-primary mb-2">How ReplySuite helps</p>
            <p class="text-[13px] text-foreground/70 leading-6 font-semibold">{{ item.solution }}</p>
          </button>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/5 overflow-hidden">
      <div class="text-center mb-12 max-w-4xl mx-auto relative">
        <div class="absolute inset-0 bg-primary/5 blur-[90px] -z-10"></div>
        <span class="badge-gradient mb-6">Before vs after</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight">
          From slow manual replies to
          <span class="text-gradient">instant trained support.</span>
        </h2>
        <p class="text-foreground/65 font-semibold leading-relaxed max-w-3xl mx-auto">
          See how ReplySuite replaces generic answers, delayed follow-up, and repetitive support tasks with a chatbot trained on your real business content.
        </p>
      </div>

      <div class="glass-card border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-[0.52fr_1fr_1fr] border-b border-foreground/10 bg-foreground/[0.03]">
          <div class="hidden md:block p-5 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Area</div>
          <div class="p-5 border-t md:border-t-0 md:border-l border-foreground/10">
            <div class="inline-flex items-center gap-3 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2">
              <X class="w-4 h-4 text-rose-300" />
              <span class="text-[10px] font-black uppercase tracking-widest text-rose-200">Before</span>
            </div>
          </div>
          <div class="p-5 border-t md:border-t-0 md:border-l border-foreground/10">
            <div class="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Check class="w-4 h-4 text-primary" />
              <span class="text-[10px] font-black uppercase tracking-widest text-primary">After</span>
            </div>
          </div>
        </div>

        <div v-for="row in beforeAfterRows" :key="row.area" class="grid grid-cols-1 md:grid-cols-[0.52fr_1fr_1fr] border-b border-foreground/10 last:border-b-0">
          <div class="p-5 bg-foreground/[0.025]">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60 md:hidden mb-2">Area</p>
            <h3 class="text-base font-black text-foreground tracking-tight">{{ row.area }}</h3>
          </div>
          <div class="p-5 md:border-l border-foreground/10 bg-rose-500/[0.035]">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80 md:hidden mb-2">Before</p>
            <p class="text-sm text-foreground/62 leading-relaxed font-semibold">{{ row.before }}</p>
          </div>
          <div class="p-5 md:border-l border-foreground/10 bg-primary/[0.035]">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary md:hidden mb-2">After</p>
            <p class="text-sm text-foreground/72 leading-relaxed font-semibold">{{ row.after }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 border-t border-foreground/5">
      <div class="grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <span class="badge-gradient mb-6">Why businesses buy</span>
          <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight">
            Built to save time and
            <span class="text-gradient">win more conversations.</span>
          </h2>
          <p class="text-foreground/65 font-semibold leading-relaxed max-w-2xl">
            ReplySuite gives you the tools to train, test, and deploy one AI customer support assistant across your website and WhatsApp.
            The value is simple: faster replies, fewer missed leads, and better customer coverage.
          </p>
        </div>

        <div class="space-y-6">
          <div v-for="item in reasonsToBuy" :key="item.title"
            class="glass-card p-8 border-foreground/10 bg-foreground/[0.02] flex gap-5 items-start">
            <div
              class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
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

    <section class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/5">
      <div class="text-center mb-12 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">Plan data</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-6">
          Clear limits for launch,
          <span class="text-gradient">growth, and scale.</span>
        </h2>
        <p class="text-foreground/65 font-semibold leading-relaxed">
          Review the practical details buyers care about: supported channels, AI reply volume, training capacity, Enterprise tools, and multilingual coverage.
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-4 mb-8">
        <div v-for="metric in socialProofMetrics" :key="metric.label" class="glass-card p-6 border-foreground/10 bg-foreground/[0.02] text-center">
          <p class="text-3xl font-black text-foreground tracking-tight">{{ metric.value }}</p>
          <p class="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">{{ metric.label }}</p>
        </div>
      </div>

      <div class="glass-card border border-foreground/10 bg-foreground/[0.02] overflow-hidden mb-8">
        <div class="grid grid-cols-[0.8fr_1fr_1.2fr] max-md:hidden bg-foreground/[0.03] border-b border-foreground/10">
          <div class="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Data point</div>
          <div class="p-4 border-l border-foreground/10 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">Current value</div>
          <div class="p-4 border-l border-foreground/10 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">What it means</div>
        </div>
        <div v-for="row in socialProofRows" :key="row.label" class="grid md:grid-cols-[0.8fr_1fr_1.2fr] border-b border-foreground/10 last:border-b-0">
          <div class="p-5 bg-foreground/[0.025]">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 md:hidden mb-2">Data point</p>
            <h3 class="text-sm font-black text-foreground tracking-tight">{{ row.label }}</h3>
          </div>
          <div class="p-5 md:border-l border-foreground/10">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 md:hidden mb-2">Current value</p>
            <p class="text-sm font-black text-primary tracking-tight">{{ row.value }}</p>
          </div>
          <div class="p-5 md:border-l border-foreground/10">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60 md:hidden mb-2">What it means</p>
            <p class="text-sm text-foreground/60 leading-relaxed font-semibold">{{ row.detail }}</p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <span v-for="logo in logoPills" :key="logo" class="rounded-full border border-foreground/10 bg-foreground/[0.02] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/60">
          {{ logo }}
        </span>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 border-t border-foreground/5 relative overflow-hidden">
      <div class="absolute left-1/2 top-16 h-72 w-[70%] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px] -z-10"></div>
      <div class="grid lg:grid-cols-[0.82fr_1.18fr] gap-8 lg:gap-12 items-start">
        <div class="lg:sticky lg:top-28">
          <span class="badge-gradient mb-6">Customer feedback</span>
          <h2 class="text-3xl md:text-5xl font-extrabold text-foreground mb-5 leading-tight">
            Businesses use ReplySuite to reply faster and
            <span class="text-gradient">miss fewer conversations.</span>
          </h2>
          <p class="text-foreground/55 font-semibold leading-relaxed max-w-xl">
            Testimonials from teams using AI support to reduce repetitive questions, improve first replies, and create a clearer support workflow.
          </p>

          <div class="mt-8 grid sm:grid-cols-3 lg:grid-cols-1 gap-3">
            <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">Customer goal</p>
              <p class="mt-1 text-sm font-bold text-foreground">Faster first replies</p>
            </div>
            <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">Best for</p>
              <p class="mt-1 text-sm font-bold text-foreground">Support + sales teams</p>
            </div>
            <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">Common win</p>
              <p class="mt-1 text-sm font-bold text-foreground">Less repeated work</p>
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-5 lg:gap-6">
          <article v-for="(item, index) in testimonialSamples" :key="item.name" class="glass-card border border-foreground/10 bg-foreground/[0.02] p-6 md:p-7 relative overflow-hidden" :class="index === 0 ? 'md:col-span-2' : ''">
            <div class="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-[70px]"></div>
            <div class="relative flex items-center justify-between gap-4 mb-6">
              <div class="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5" role="img" aria-label="Five star rating">
                <Star v-for="n in 5" :key="n" class="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
              </div>
              <span class="rounded-full border border-foreground/10 bg-background/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/60 backdrop-blur-xl">
                {{ item.channel }}
              </span>
            </div>

            <Quote class="relative h-9 w-9 text-primary/70 mb-5" />
            <p class="relative text-base md:text-lg text-foreground/72 leading-relaxed font-semibold mb-7">
              “{{ item.quote }}”
            </p>

            <div class="relative flex items-center gap-4 pt-5 border-t border-foreground/10">
              <div class="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-sm font-black text-primary">
                {{ item.initials }}
              </div>
              <div>
                <h3 class="text-sm font-black text-foreground tracking-tight">{{ item.name }}</h3>
                <p class="text-xs text-foreground/65 font-semibold">{{ item.role }} · {{ item.company }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 py-20 md:py-24 border-t border-foreground/5">
      <div class="relative overflow-hidden rounded-[40px] border border-foreground/10 bg-foreground/[0.025] p-6 md:p-8 lg:p-10">
        <div class="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-primary/15 blur-[100px]"></div>
        <div class="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-sky-400/10 blur-[110px]"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-primary/[0.035]"></div>

        <div class="relative grid lg:grid-cols-[0.85fr_1.35fr] gap-8 lg:gap-12 items-start">
          <div class="lg:sticky lg:top-28">
            <span class="badge-gradient mb-6">FAQ</span>
            <h2 class="text-3xl md:text-5xl font-extrabold text-foreground mb-5 leading-tight">
              Common questions before you
              <span class="text-gradient">get started.</span>
            </h2>
            <p class="text-foreground/55 font-semibold leading-relaxed max-w-xl">
              Quick answers about setup, WhatsApp, languages, training sources, and how ReplySuite fits into your customer support workflow.
            </p>
            <div class="mt-8 grid sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">Setup</p>
                <p class="mt-1 text-sm font-bold text-foreground">Website first</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">Channels</p>
                <p class="mt-1 text-sm font-bold text-foreground">Web + WhatsApp</p>
              </div>
              <div class="rounded-2xl border border-foreground/10 bg-background/50 px-4 py-3 backdrop-blur-xl">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/60">Languages</p>
                <p class="mt-1 text-sm font-bold text-foreground">10+ supported</p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <details v-for="(item, index) in faqItems" :key="item.q" class="group rounded-3xl border border-foreground/10 bg-background/55 p-5 md:p-6 backdrop-blur-xl transition-all open:border-primary/25 open:bg-primary/[0.035]">
              <summary class="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                <span class="flex items-start gap-4">
                  <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xs font-black text-primary">
                    {{ String(index + 1).padStart(2, '0') }}
                  </span>
                  <span class="text-base md:text-lg font-black tracking-tight text-foreground">{{ item.q }}</span>
                </span>
                <span class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.03] text-foreground/60 transition-transform group-open:rotate-45 group-open:text-primary">
                  +
                </span>
              </summary>
              <p class="mt-4 pl-0 md:pl-[52px] text-sm md:text-base text-foreground/55 leading-relaxed font-semibold">
                {{ item.a }}
              </p>
            </details>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="max-w-7xl mx-auto px-6 py-24 border-t border-foreground/5">
      <div class="text-center mb-14 max-w-3xl mx-auto">
        <span class="badge-gradient mb-6">Pricing</span>
        <h2 class="text-4xl md:text-6xl font-extrabold text-foreground">
          Paid plans first, with
          <span class="text-gradient">Free Starter below.</span>
        </h2>
        <p class="text-foreground/65 mt-6 font-semibold leading-relaxed">
          Choose from three paid subscriptions: Silver for WhatsApp, Gold for Instagram workflows, and Enterprise Ready for AI business tools. If you are not ready to pay, the Free Starter subscription is still available below.
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-8 mb-8">
        <div v-for="plan in paidPlans" :key="plan.name"
          class="glass-card p-8 md:p-10 flex flex-col relative transition-all duration-500 hover:-translate-y-3 border-foreground/10"
          :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : 'bg-foreground/[0.02]'">
          <div v-if="plan.popular"
            class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-[10px] font-bold tracking-widest rounded-full uppercase">
            Best Value
          </div>

          <div class="mb-8">
            <h3 class="text-2xl font-black mb-2 text-foreground tracking-tight">{{ plan.name }}</h3>
            <p class="text-sm text-foreground/65 font-semibold">{{ plan.desc }}</p>
          </div>

          <div class="mb-8 flex items-baseline gap-2">
            <span class="text-5xl font-extrabold text-foreground">${{ plan.price }}</span>
            <span class="text-foreground/65 font-bold tracking-widest text-[10px] uppercase">/mo</span>
          </div>

          <button @click="handleSelect(plan)" :disabled="isProcessing === plan.id"
            class="w-full py-5 rounded-full font-bold text-center mb-8 transition-all tracking-widest text-xs flex items-center justify-center gap-2"
            :class="plan.popular ? 'btn-gradient' : 'bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20'">
            <template v-if="isProcessing === plan.id">
              <Loader2 class="w-4 h-4 animate-spin" />
              Processing...
            </template>
            <template v-else>
              {{ plan.id === 'enterprise-ready' ? 'Start Enterprise' : 'Select Plan' }}
            </template>
          </button>

          <div class="space-y-4 flex-grow">
            <div v-for="feat in plan.features" :key="feat"
              class="flex items-center gap-3 text-xs font-semibold text-foreground/55">
              <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check class="w-2.5 h-2.5 text-primary" />
              </div>
              {{ feat }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="freeStarterPlan" class="glass-card border border-foreground/10 bg-foreground/[0.02] p-6 md:p-8 mb-8">
        <div class="grid lg:grid-cols-[0.85fr_1.35fr_auto] gap-6 items-center">
          <div>
            <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-4">
              Free Starter subscription
            </span>
            <h3 class="text-2xl md:text-3xl font-black text-foreground tracking-tight">{{ freeStarterPlan.name }}</h3>
            <p class="mt-2 text-sm text-foreground/55 font-semibold leading-relaxed">{{ freeStarterPlan.desc }}</p>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div v-for="feat in freeStarterPlan.features" :key="feat"
              class="rounded-2xl border border-foreground/10 bg-background/40 px-4 py-3 flex items-center gap-3 text-xs font-semibold text-foreground/60">
              <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check class="w-2.5 h-2.5 text-primary" />
              </div>
              {{ feat }}
            </div>
          </div>

          <div class="lg:text-right">
            <div class="mb-4 flex lg:justify-end items-baseline gap-2">
              <span class="text-4xl font-extrabold text-foreground">${{ freeStarterPlan.price }}</span>
              <span class="text-foreground/65 font-bold tracking-widest text-[10px] uppercase">/mo</span>
            </div>
            <button @click="handleSelect(freeStarterPlan)" :disabled="isProcessing === freeStarterPlan.id"
              class="w-full lg:w-auto px-8 py-4 rounded-full font-bold text-center transition-all tracking-widest text-xs flex items-center justify-center gap-2 bg-foreground/5 hover:bg-foreground/10 text-foreground border border-foreground/10 hover:border-foreground/20">
              <template v-if="isProcessing === freeStarterPlan.id">
                <Loader2 class="w-4 h-4 animate-spin" />
                Processing...
              </template>
              <template v-else>
                {{ isAuthenticated ? 'Activate Free' : 'Start Free' }}
              </template>
            </button>
          </div>
        </div>
      </div>

    </section>

    <section class="max-w-5xl mx-auto px-6 py-20 md:py-24">
      <div
        class="bg-foreground/[0.03] p-12 md:p-20 rounded-[40px] border border-foreground/10 text-center relative overflow-hidden backdrop-blur-sm">
        <div class="absolute inset-0 bg-primary/5 blur-[120px]"></div>

        <h2 class="text-4xl md:text-6xl font-extrabold mb-8 relative z-10 leading-tight text-foreground">
          Launch your first AI customer support assistant
          <span class="text-foreground/55">today.</span>
        </h2>

        <p class="text-foreground/55 max-w-2xl mx-auto mb-10 relative z-10 font-semibold leading-relaxed">
          Start with your website, expand to WhatsApp on Silver, add Instagram workflows on Gold, and unlock Enterprise AI tools for appointments, bookings, Google Calendar, and Paypack checkout when you are ready.
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
          <NuxtLink to="/register"
            class="bg-foreground text-background px-10 py-5 rounded-full font-bold text-lg inline-flex items-center justify-center gap-3 hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-foreground/10">
            Start Free
            <ArrowRight class="w-5 h-5" />
          </NuxtLink>
          <NuxtLink to="/contact"
            class="px-10 py-5 rounded-full font-bold text-lg inline-flex items-center justify-center gap-3 border border-foreground/10 text-foreground hover:bg-foreground/[0.04] transition-all">
            Talk to Founder
            <MessageCircle class="w-5 h-5" />
          </NuxtLink>
          <button @click="scrollToSection('pricing')"
            class="px-10 py-5 rounded-full font-bold text-lg inline-flex items-center justify-center gap-3 border border-foreground/10 text-foreground hover:bg-foreground/[0.04] transition-all">
            View Pricing
            <FileText class="w-5 h-5" />
          </button>
        </div>

        <p class="text-foreground/65 mt-10 text-xs relative z-10 tracking-[0.2em] font-bold uppercase">
          No credit card required • Start with one assistant • Upgrade when you need more
        </p>
      </div>
    </section>

    <div v-if="isDemoVideoOpen" class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button class="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-label="Close demo video"
        @click="closeDemoVideo"></button>
      <div
        class="relative z-10 w-full max-w-5xl rounded-[28px] border border-foreground/10 bg-background shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-foreground/10 bg-foreground/[0.02]">
          <div>
            <p class="text-sm font-black text-foreground tracking-tight">ReplySuite demo video</p>
            <p class="text-[11px] font-semibold text-foreground/65 uppercase tracking-widest">Watch without leaving the
              site
            </p>
          </div>
          <button @click="closeDemoVideo"
            class="w-10 h-10 rounded-xl border border-foreground/10 bg-foreground/[0.03] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.06] transition-all flex items-center justify-center"
            aria-label="Close demo video">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="aspect-video bg-black">
          <iframe v-if="isDemoVideoOpen" class="w-full h-full" :src="demoVideoUrl" title="ReplySuite demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
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

@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
