<script setup lang="ts">
import { ArrowLeft, ArrowRight, Bot, Calendar, Check, ChevronDown, CreditCard, Database, Globe2, Headphones, Instagram, Languages, Loader2, Lock, MessageCircle, MessageSquare, PackageCheck, RotateCcw, Save, ShieldCheck, Sparkles, Target, Users, Zap } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Tools & Skills Directory' })

const route = useRoute()
const { userId } = useAuth()
const { canUseBusinessTools } = usePlanAccess()
const supabase = useSupabaseClient()
const notify = useNotify()

const isLoading = ref(true)
const isSaving = ref(false)
const assistants = ref<any[]>([])
const selectedAssistantId = ref('')
const assignedTools = ref<string[]>([])
const assignedSkills = ref<string[]>([])

const isPremium = canUseBusinessTools

const toolCatalog = [
  { id: 'appointments', name: 'Appointments & bookings', desc: 'Request appointments, reservations, events, preferred times, deposits, and customer details using Google Calendar.', icon: Calendar, enterprise: true, setupHref: '/dashboard/appointments/settings' },
  { id: 'payments', name: 'Paypack checkout', desc: 'Checkout for existing appointment or booking deposits. No invoices.', icon: CreditCard, enterprise: true, setupHref: '' },
]

const businessActionLinks = [
  { id: 'appointments', name: 'Appointments & bookings', desc: 'Review booking requests, connect Google Calendar, and manage services, staff, and availability.', icon: Calendar, href: '/dashboard/appointments', settingsHref: '/dashboard/appointments/settings' },
]

const skillGroups = [
  {
    title: 'Website conversations', desc: 'Turn widget visits into clear next steps.', icon: Globe2,
    skills: [
      { id: 'website_conversion_guide', name: 'Website Conversion Guide', desc: 'Identify intent, answer from training, then guide to contact, book, reserve, or handoff.', icon: Target, channels: ['Website'] },
      { id: 'lead_qualification', name: 'Lead Qualification', desc: 'Ask one short question at a time about need, budget, timeline, and contact preference.', icon: Users, channels: ['Website', 'WhatsApp'] },
      { id: 'sales_advisor', name: 'Sales Advisor', desc: 'Recommend the right option without inventing prices, discounts, or policies.', icon: Sparkles, channels: ['Website', 'Instagram'] },
      { id: 'customer_memory_context', name: 'Customer Memory Context', desc: 'Use conversation history so customers do not repeat details.', icon: Database, channels: ['All'] },
    ],
  },
  {
    title: 'WhatsApp service flow', desc: 'Keep mobile conversations short and action-oriented.', icon: MessageCircle,
    skills: [
      { id: 'whatsapp_service_closer', name: 'WhatsApp Service Closer', desc: 'Confirm details clearly and move toward one concrete next step.', icon: MessageCircle, channels: ['WhatsApp'] },
      { id: 'appointment_intake', name: 'Appointment & Booking Intake', desc: 'Collect service or reservation type, preferred time, name, phone, party size, and notes without promising availability.', icon: Calendar, channels: ['Website', 'WhatsApp'] },
      { id: 'checkout_guardrails', name: 'Checkout Guardrails', desc: 'Only discuss Paypack checkout for existing appointment or booking deposits.', icon: CreditCard, channels: ['All'] },
    ],
  },
  {
    title: 'Instagram comments and DMs', desc: 'Reply publicly, trigger from keywords, and continue privately.', icon: Instagram,
    skills: [
      { id: 'instagram_public_responder', name: 'Instagram Public Responder', desc: 'Reply to comments in one or two safe, friendly sentences.', icon: Instagram, channels: ['Comments'] },
      { id: 'instagram_comment_to_dm', name: 'Comment-to-DM Nurturer', desc: 'Acknowledge the comment context and continue privately with one clear question.', icon: MessageSquare, channels: ['DM'] },
      { id: 'keyword_trigger_router', name: 'Keyword Trigger Router', desc: 'Treat configured keywords as intent and route to the right offer, FAQ, booking, reservation, or DM.', icon: Zap, channels: ['Instagram', 'WhatsApp'] },
      { id: 'concise_follow_up', name: 'Concise Follow-up', desc: 'End with one useful next step instead of many questions.', icon: ArrowRight, channels: ['All'] },
    ],
  },
  {
    title: 'Support, trust, and handoff', desc: 'Protect the brand when conversations become sensitive.', icon: ShieldCheck,
    skills: [
      { id: 'support_triage', name: 'Support Triage', desc: 'Classify urgency, collect missing details, and keep the customer calm.', icon: Headphones, channels: ['All'] },
      { id: 'complaint_recovery', name: 'Complaint Recovery', desc: 'Acknowledge issues, collect minimum details, and route refunds or disputes to staff.', icon: RotateCcw, channels: ['All'] },
      { id: 'escalation_guardrails', name: 'Escalation Guardrails', desc: 'Hand off legal, medical, financial, refund, angry, or account-sensitive requests.', icon: ShieldCheck, channels: ['All'] },
      { id: 'multilingual_service', name: 'Multilingual Service', desc: 'Preserve customer language across local and global conversations.', icon: Languages, channels: ['All'] },
      { id: 'review_request_collector', name: 'Review Request Collector', desc: 'Ask for feedback or a review only after satisfaction or completion signals.', icon: PackageCheck, channels: ['Website', 'WhatsApp'] },
    ],
  },
]

const recommendedBundles = [
  { name: 'Website lead assistant', desc: 'Best first setup for website lead capture and clear handoff.', skills: ['website_conversion_guide', 'lead_qualification', 'sales_advisor', 'customer_memory_context', 'concise_follow_up'], tools: [] },
  { name: 'Bookings assistant', desc: 'For assistants that request appointments, reservations, and Google Calendar bookings.', skills: ['whatsapp_service_closer', 'appointment_intake', 'checkout_guardrails', 'support_triage'], tools: ['appointments'] },
  { name: 'Instagram comment-to-DM assistant', desc: 'For keyword-triggered comments, public replies, and DM follow-up.', skills: ['instagram_public_responder', 'instagram_comment_to_dm', 'keyword_trigger_router', 'sales_advisor', 'concise_follow_up'], tools: [] },
  { name: 'Support and recovery assistant', desc: 'For triage, complaints, escalation, and multilingual customers.', skills: ['support_triage', 'complaint_recovery', 'escalation_guardrails', 'multilingual_service', 'customer_memory_context'], tools: [] },
]

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const activeToolsConfig = computed(() => selectedAssistant.value?.tools_config || {})
const assistantSkills = computed(() => Array.isArray(activeToolsConfig.value?.assistant_skills) ? activeToolsConfig.value.assistant_skills : [])
const assignedToolCount = computed(() => assignedTools.value.length)
const assignedSkillCount = computed(() => assignedSkills.value.length)
const selectedSkillNames = computed(() => skillGroups.flatMap((group) => group.skills).filter((skill) => assignedSkills.value.includes(skill.id)).map((skill) => skill.name))

const hasChanges = computed(() => {
  const currentTools = [...(selectedAssistant.value?.enabled_tools || [])].sort().join('|')
  const nextTools = [...assignedTools.value].sort().join('|')
  const currentSkills = [...assistantSkills.value].sort().join('|')
  const nextSkills = [...assignedSkills.value].sort().join('|')
  return currentTools !== nextTools || currentSkills !== nextSkills
})

const syncSelection = () => {
  const assistant = selectedAssistant.value
  assignedTools.value = Array.isArray(assistant?.enabled_tools) ? assistant.enabled_tools.filter((tool: string) => tool !== 'orders') : []
  assignedSkills.value = Array.isArray(assistant?.tools_config?.assistant_skills) ? [...assistant.tools_config.assistant_skills] : []
}

const fetchAssistants = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data, error } = await supabase.from('chatbots').select('id, name, default_language, enabled_tools, tools_config, created_at').eq('user_id', userId.value).is('deleted_at', null).order('created_at', { ascending: false })
    if (error) throw error
    assistants.value = data || []
    const requestedAssistantId = typeof route.query.id === 'string' ? route.query.id : ''
    if (requestedAssistantId && assistants.value.some((assistant) => assistant.id === requestedAssistantId)) selectedAssistantId.value = requestedAssistantId
    else if (!selectedAssistantId.value && assistants.value.length > 0) selectedAssistantId.value = assistants.value[0].id
    syncSelection()
  } catch (err) {
    console.error('Failed to load assistants:', err)
    notify.error('Failed to load assistants.')
  } finally {
    isLoading.value = false
  }
}

const toggleValue = (list: { value: string[] }, id: string) => {
  list.value = list.value.includes(id) ? list.value.filter((value) => value !== id) : [...list.value, id]
}

const normalizePaymentDependency = () => {
  assignedTools.value = assignedTools.value.filter((value) => value !== 'orders')
  if (!assignedTools.value.includes('appointments')) assignedTools.value = assignedTools.value.filter((value) => value !== 'payments')
}

const toggleTool = (tool: any) => {
  if (tool.enterprise && !isPremium.value) return notify.warn('Upgrade to Enterprise to assign AI business tools.')
  if (tool.id === 'payments' && !assignedTools.value.includes('appointments')) return notify.warn('Enable appointments & bookings before adding Paypack checkout.')
  toggleValue(assignedTools, tool.id)
  normalizePaymentDependency()
}

const toggleSkill = (skill: any) => toggleValue(assignedSkills, skill.id)

const applyBundle = (bundle: any) => {
  assignedSkills.value = Array.from(new Set([...assignedSkills.value, ...bundle.skills]))
  const nextTools = new Set(assignedTools.value)
  let skippedPremiumTool = false
  for (const toolId of bundle.tools || []) {
    const tool = toolCatalog.find((item) => item.id === toolId)
    if (tool?.enterprise && !isPremium.value) skippedPremiumTool = true
    else nextTools.add(toolId)
  }
  assignedTools.value = Array.from(nextTools)
  normalizePaymentDependency()
  notify.success(skippedPremiumTool ? 'Bundle skills added. Upgrade to Enterprise to enable its AI tools.' : 'Bundle applied to this assistant.')
}

const saveAssignments = async () => {
  if (!selectedAssistant.value || isSaving.value) return
  isSaving.value = true
  try {
    const nextToolsConfig = { ...(selectedAssistant.value.tools_config || {}), assistant_skills: assignedSkills.value }
    const { error } = await supabase.from('chatbots').update({ enabled_tools: assignedTools.value, tools_config: nextToolsConfig }).eq('id', selectedAssistant.value.id).eq('user_id', userId.value)
    if (error) throw error
    assistants.value = assistants.value.map((assistant) => assistant.id === selectedAssistant.value.id ? { ...assistant, enabled_tools: [...assignedTools.value], tools_config: nextToolsConfig } : assistant)
    notify.success('Tools and skills assigned to assistant.')
  } catch (err: any) {
    console.error('Failed to save assignments:', err)
    notify.error(err?.message || 'Failed to save assignments.')
  } finally {
    isSaving.value = false
  }
}

watch(selectedAssistantId, syncSelection)
onMounted(fetchAssistants)
</script>

<template>
  <div class="w-full space-y-5 pb-24">
    <NuxtLink to="/dashboard/agents" class="dashboard-back-link group">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Assistants
    </NuxtLink>

    <section class="rounded-2xl border border-foreground/10 bg-background-card p-5 shadow-sm md:p-6">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Tools & Skills</span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Design what each assistant can do.</h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Enable action tools, then add customer-interaction skills for website chat, WhatsApp, Instagram comments, keyword triggers, and comment-to-DM flows.</p>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest sm:flex">
          <div class="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-primary">{{ assignedToolCount }} tools</div>
          <div class="rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2 text-foreground/60">{{ assignedSkillCount }} skills</div>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="rounded-2xl border border-foreground/10 bg-background-card p-8 text-center">
      <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" />
      <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/45">Loading directory</p>
    </section>

    <section v-else-if="assistants.length === 0" class="rounded-2xl border border-dashed border-foreground/10 bg-background-card p-10 text-center">
      <Bot class="mx-auto mb-5 h-12 w-12 text-foreground/15" />
      <h2 class="text-xl font-black text-foreground">Create an assistant first</h2>
      <p class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-foreground/50">Tools and skills are assigned to an assistant. Create one, then return here to configure what it can do.</p>
      <NuxtLink to="/dashboard/agents" class="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black">Open assistants</NuxtLink>
    </section>

    <div v-else class="grid gap-5 xl:grid-cols-[19rem_1fr]">
      <aside class="rounded-2xl border border-foreground/10 bg-background-card p-5 xl:sticky xl:top-24 xl:self-start">
        <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Assistant</label>
        <div class="relative">
          <select v-model="selectedAssistantId" class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-background px-4 py-3 pr-10 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none">
            <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">{{ assistant.name }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        </div>

        <div v-if="selectedAssistant" class="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p class="text-sm font-bold text-foreground">{{ selectedAssistant.name }}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-foreground/45">{{ selectedAssistant.default_language || 'English' }} assistant</p>
          <div v-if="selectedSkillNames.length" class="mt-3 flex flex-wrap gap-1.5">
            <span v-for="name in selectedSkillNames.slice(0, 4)" :key="name" class="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-primary">{{ name }}</span>
            <span v-if="selectedSkillNames.length > 4" class="rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-foreground/45">+{{ selectedSkillNames.length - 4 }}</span>
          </div>
        </div>

        <button @click="saveAssignments" :disabled="!hasChanges || isSaving" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save assignments
        </button>

        <NuxtLink v-if="selectedAssistant" :to="`/dashboard/agents/skills/training?id=${selectedAssistant.id}`" class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground">
          <Database class="h-4 w-4 text-primary" />
          Train knowledge
        </NuxtLink>
      </aside>

      <main class="space-y-5">
        <section class="grid gap-3 md:grid-cols-4">
          <div v-for="(step, index) in ['Connect channels', 'Enable tools', 'Assign skills', 'Review actions']" :key="step" class="rounded-2xl border border-foreground/10 bg-background-card p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-primary">0{{ index + 1 }}</p>
            <p class="mt-2 text-sm font-black text-foreground">{{ step }}</p>
          </div>
        </section>

        <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black tracking-tight text-foreground">Business action workspaces</h2>
              <p class="mt-1 text-sm font-medium text-foreground/50">Enterprise queues and setup pages for appointment, booking, Google Calendar, and checkout tools.</p>
            </div>
            <Database class="h-5 w-5 text-primary" />
          </div>
          <div v-if="!isPremium" class="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p class="text-xs font-black uppercase tracking-widest text-primary">Enterprise tools</p>
            <p class="mt-1 text-sm font-medium leading-relaxed text-foreground/55">Appointments, bookings, Google Calendar, and Paypack checkout are available on Enterprise. Silver includes website and WhatsApp chatbots; Gold adds Instagram workflows.</p>
            <NuxtLink to="/dashboard/pricing" class="mt-3 inline-flex rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary">Upgrade to Enterprise</NuxtLink>
          </div>
          <div class="grid gap-3 md:grid-cols-1">
            <article v-for="action in businessActionLinks" :key="action.id" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
              <div class="flex items-start gap-4">
                <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', assignedTools.includes(action.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="action.icon" class="h-5 w-5" /></div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2"><h3 class="text-sm font-black text-foreground">{{ action.name }}</h3><span :class="['ml-auto rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest', assignedTools.includes(action.id) ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground/40']">{{ assignedTools.includes(action.id) ? 'Enabled' : 'Tool off' }}</span></div>
                  <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ action.desc }}</p>
                  <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                    <NuxtLink :to="isPremium ? action.href : '/dashboard/pricing'" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black">{{ isPremium ? 'Open queue' : 'Upgrade' }} <ArrowRight class="h-3.5 w-3.5" /></NuxtLink>
                    <NuxtLink :to="isPremium ? action.settingsHref : '/dashboard/pricing'" class="inline-flex flex-1 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground/60">Setup</NuxtLink>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div><h2 class="text-lg font-black tracking-tight text-foreground">Action tools</h2><p class="mt-1 text-sm font-medium text-foreground/50">Tools create records. Skills shape the conversation around them.</p></div>
            <Zap class="h-5 w-5 text-primary" />
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <button v-for="tool in toolCatalog" :key="tool.id" type="button" @click="toggleTool(tool)" :class="['rounded-2xl border p-4 text-left transition', assignedTools.includes(tool.id) ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]', tool.enterprise && !isPremium ? 'opacity-60' : '']">
              <div class="flex items-start gap-3"><div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', assignedTools.includes(tool.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="tool.icon" class="h-5 w-5" /></div><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="text-sm font-black text-foreground">{{ tool.name }}</p><Lock v-if="tool.enterprise && !isPremium" class="h-3.5 w-3.5 text-amber-400" /><Check v-if="assignedTools.includes(tool.id)" class="ml-auto h-4 w-4 text-primary" /></div><p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ tool.desc }}</p></div></div>
            </button>
          </div>
        </section>

        <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="mb-4"><h2 class="text-lg font-black tracking-tight text-foreground">Quick skill bundles</h2><p class="mt-1 text-sm font-medium text-foreground/50">Apply a starting set, then fine-tune individual skills below.</p></div>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button v-for="bundle in recommendedBundles" :key="bundle.name" type="button" class="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4 text-left transition hover:border-primary/30 hover:bg-primary/[0.04]" @click="applyBundle(bundle)">
              <p class="text-sm font-black text-foreground">{{ bundle.name }}</p>
              <p class="mt-2 text-xs font-medium leading-relaxed text-foreground/50">{{ bundle.desc }}</p>
              <p class="mt-3 text-[10px] font-black uppercase tracking-widest text-primary">Apply bundle</p>
            </button>
          </div>
        </section>

        <section v-for="group in skillGroups" :key="group.title" class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div><h2 class="text-lg font-black tracking-tight text-foreground">{{ group.title }}</h2><p class="mt-1 text-sm font-medium text-foreground/50">{{ group.desc }}</p></div>
            <component :is="group.icon" class="h-5 w-5 text-primary" />
          </div>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button v-for="skill in group.skills" :key="skill.id" type="button" @click="toggleSkill(skill)" :class="['rounded-2xl border p-4 text-left transition', assignedSkills.includes(skill.id) ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']">
              <div class="flex items-start gap-3"><div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', assignedSkills.includes(skill.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="skill.icon" class="h-5 w-5" /></div><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="text-sm font-black text-foreground">{{ skill.name }}</p><Check v-if="assignedSkills.includes(skill.id)" class="ml-auto h-4 w-4 text-primary" /></div><p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ skill.desc }}</p></div></div>
              <div class="mt-3 flex flex-wrap gap-1.5"><span v-for="channel in skill.channels" :key="channel" class="rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-foreground/45">{{ channel }}</span></div>
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
