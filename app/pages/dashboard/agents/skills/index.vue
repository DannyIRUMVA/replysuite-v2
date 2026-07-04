<script setup lang="ts">
import { ArrowLeft, ArrowRight, Bot, Calendar, Check, ChevronDown, CreditCard, Database, Globe2, Headphones, Instagram, Languages, Loader2, MessageCircle, MessageSquare, PackageCheck, RotateCcw, Save, ShieldCheck, Sparkles, Target, Users, Zap } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Assistant Skills | ReplySuite' })

const route = useRoute()
const { userId } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const isLoading = ref(true)
const isSaving = ref(false)
const assistants = ref<any[]>([])
const selectedAssistantId = ref('')
const assignedSkills = ref<string[]>([])

const skillGroups = [
  {
    title: 'Website conversations', desc: 'Shape website chat into confident answers and clean next steps.', icon: Globe2,
    skills: [
      { id: 'website_conversion_guide', name: 'Website Conversion Guide', desc: 'Identify intent, answer from training, then guide to contact, booking, reservation, or handoff.', icon: Target, channels: ['Website'] },
      { id: 'lead_qualification', name: 'Lead Qualification', desc: 'Ask one short question at a time about need, budget, timeline, and contact preference.', icon: Users, channels: ['Website', 'WhatsApp'] },
      { id: 'sales_advisor', name: 'Sales Advisor', desc: 'Recommend the right option without inventing prices, discounts, or policies.', icon: Sparkles, channels: ['Website', 'Instagram'] },
      { id: 'customer_memory_context', name: 'Customer Memory Context', desc: 'Use conversation history so customers do not repeat details.', icon: Database, channels: ['All'] },
    ],
  },
  {
    title: 'Appointment and booking conversations', desc: 'Collect scheduling details without promising unavailable times.', icon: Calendar,
    skills: [
      { id: 'appointment_intake', name: 'Appointment & Booking Intake', desc: 'Collect service or reservation type, preferred time, name, phone, party size, and notes before handoff or confirmation.', icon: Calendar, channels: ['Website', 'WhatsApp'] },
      { id: 'whatsapp_service_closer', name: 'WhatsApp Service Closer', desc: 'Keep mobile replies short, confirm details clearly, and move toward one concrete next step.', icon: MessageCircle, channels: ['WhatsApp'] },
      { id: 'checkout_guardrails', name: 'Deposit Checkout Guardrails', desc: 'Only discuss MTN/Airtel mobile checkout for existing appointment or booking deposits verified by the server.', icon: CreditCard, channels: ['All'] },
      { id: 'concise_follow_up', name: 'Concise Follow-up', desc: 'End with one useful next step instead of many questions.', icon: ArrowRight, channels: ['All'] },
    ],
  },
  {
    title: 'Instagram comments and DMs', desc: 'Reply publicly, trigger from keywords, and continue privately.', icon: Instagram,
    skills: [
      { id: 'instagram_public_responder', name: 'Instagram Public Responder', desc: 'Reply to comments in one or two safe, friendly sentences.', icon: Instagram, channels: ['Comments'] },
      { id: 'instagram_comment_to_dm', name: 'Comment-to-DM Nurturer', desc: 'Acknowledge the comment context and continue privately with one clear question.', icon: MessageSquare, channels: ['DM'] },
      { id: 'keyword_trigger_router', name: 'Keyword Trigger Router', desc: 'Treat configured keywords as intent and route to the right offer, FAQ, booking, reservation, or DM.', icon: Zap, channels: ['Instagram', 'WhatsApp'] },
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
  { name: 'Website lead assistant', desc: 'Best first setup for website lead capture and clear handoff.', skills: ['website_conversion_guide', 'lead_qualification', 'sales_advisor', 'customer_memory_context', 'concise_follow_up'] },
  { name: 'Bookings conversation assistant', desc: 'For clinics, salons, hotels, guest houses, lounges, and service teams that collect booking details.', skills: ['appointment_intake', 'whatsapp_service_closer', 'checkout_guardrails', 'concise_follow_up'] },
  { name: 'Instagram comment-to-DM assistant', desc: 'For keyword-triggered comments, public replies, and DM follow-up.', skills: ['instagram_public_responder', 'instagram_comment_to_dm', 'keyword_trigger_router', 'sales_advisor', 'concise_follow_up'] },
  { name: 'Support and recovery assistant', desc: 'For triage, complaints, escalation, and multilingual customers.', skills: ['support_triage', 'complaint_recovery', 'escalation_guardrails', 'multilingual_service', 'customer_memory_context'] },
]

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const activeToolsConfig = computed(() => selectedAssistant.value?.tools_config || {})
const assistantSkills = computed(() => Array.isArray(activeToolsConfig.value?.assistant_skills) ? activeToolsConfig.value.assistant_skills : [])
const assignedSkillCount = computed(() => assignedSkills.value.length)
const selectedSkillNames = computed(() => skillGroups.flatMap((group) => group.skills).filter((skill) => assignedSkills.value.includes(skill.id)).map((skill) => skill.name))

const hasChanges = computed(() => {
  const currentSkills = [...assistantSkills.value].sort().join('|')
  const nextSkills = [...assignedSkills.value].sort().join('|')
  return currentSkills !== nextSkills
})

const syncSelection = () => {
  const assistant = selectedAssistant.value
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

const toggleSkill = (skillId: string) => {
  assignedSkills.value = assignedSkills.value.includes(skillId) ? assignedSkills.value.filter((value) => value !== skillId) : [...assignedSkills.value, skillId]
}

const applyBundle = (bundle: any) => {
  assignedSkills.value = Array.from(new Set([...assignedSkills.value, ...bundle.skills]))
  notify.success('Skill bundle applied to this assistant.')
}

const saveAssignments = async () => {
  if (!selectedAssistant.value || isSaving.value) return
  isSaving.value = true
  try {
    const nextToolsConfig = { ...(selectedAssistant.value.tools_config || {}), assistant_skills: assignedSkills.value }
    const { error } = await supabase.from('chatbots').update({ tools_config: nextToolsConfig }).eq('id', selectedAssistant.value.id).eq('user_id', userId.value)
    if (error) throw error
    assistants.value = assistants.value.map((assistant) => assistant.id === selectedAssistant.value.id ? { ...assistant, tools_config: nextToolsConfig } : assistant)
    notify.success('Skills saved to assistant.')
  } catch (err: any) {
    console.error('Failed to save skills:', err)
    notify.error(err?.message || 'Failed to save skills.')
  } finally {
    isSaving.value = false
  }
}

watch(selectedAssistantId, syncSelection)
onMounted(fetchAssistants)
</script>

<template>
  <div class="w-full overflow-x-hidden space-y-5 pb-24">
    <NuxtLink to="/dashboard/agents" class="dashboard-back-link group">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Assistants
    </NuxtLink>

    <section class="overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-background-card p-5 shadow-sm md:p-7">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Skills only</span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Choose how each assistant behaves.</h1>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-foreground/55">Skills shape tone, intake questions, support handoff, Instagram replies, and booking conversations. Action tools now live on a separate Tools page.</p>
        </div>
        <NuxtLink :to="selectedAssistant ? `/dashboard/agents/tools?id=${selectedAssistant.id}` : '/dashboard/agents/tools'" class="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/15">
          Open tools
          <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </section>

    <section v-if="isLoading" class="rounded-2xl border border-foreground/10 bg-background-card p-8 text-center">
      <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" />
      <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/45">Loading skills</p>
    </section>

    <section v-else-if="assistants.length === 0" class="rounded-2xl border border-dashed border-foreground/10 bg-background-card p-10 text-center">
      <Bot class="mx-auto mb-5 h-12 w-12 text-foreground/15" />
      <h2 class="text-xl font-black text-foreground">Create an assistant first</h2>
      <p class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-foreground/50">Skills are assigned to an assistant. Create one, then return here to tune its behavior.</p>
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
          <p v-else class="mt-3 text-xs font-medium text-foreground/45">No behavior skills selected yet.</p>
        </div>

        <button @click="saveAssignments" :disabled="!hasChanges || isSaving" class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save skills
        </button>

        <NuxtLink v-if="selectedAssistant" :to="`/dashboard/agents/skills/training?id=${selectedAssistant.id}`" class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground">
          <Database class="h-4 w-4 text-primary" />
          Train knowledge
        </NuxtLink>
      </aside>

      <main class="space-y-5">
        <section class="grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-foreground/10 bg-background-card p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-primary">01</p>
            <p class="mt-2 text-sm font-black text-foreground">Train knowledge</p>
            <p class="mt-1 text-xs font-medium text-foreground/45">Add website, PDF, FAQ, and text sources.</p>
          </div>
          <div class="rounded-2xl border border-foreground/10 bg-background-card p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-primary">02</p>
            <p class="mt-2 text-sm font-black text-foreground">Assign skills</p>
            <p class="mt-1 text-xs font-medium text-foreground/45">Choose behavior patterns for conversations.</p>
          </div>
          <div class="rounded-2xl border border-foreground/10 bg-background-card p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-primary">03</p>
            <p class="mt-2 text-sm font-black text-foreground">Enable tools separately</p>
            <p class="mt-1 text-xs font-medium text-foreground/45">Appointments and bookings live on the Tools page.</p>
          </div>
        </section>

        <section class="rounded-2xl border border-foreground/10 bg-background-card p-5">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-black tracking-tight text-foreground">Quick skill bundles</h2>
              <p class="mt-1 text-sm font-medium text-foreground/50">Apply a starting set, then fine-tune individual skills below.</p>
            </div>
            <div class="rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/55">{{ assignedSkillCount }} selected</div>
          </div>
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
            <div>
              <h2 class="text-lg font-black tracking-tight text-foreground">{{ group.title }}</h2>
              <p class="mt-1 text-sm font-medium text-foreground/50">{{ group.desc }}</p>
            </div>
            <component :is="group.icon" class="h-5 w-5 text-primary" />
          </div>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button v-for="skill in group.skills" :key="skill.id" type="button" @click="toggleSkill(skill.id)" :class="['rounded-2xl border p-4 text-left transition', assignedSkills.includes(skill.id) ? 'border-primary/40 bg-primary/10 shadow-sm shadow-primary/5' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]']">
              <div class="flex items-start gap-3">
                <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', assignedSkills.includes(skill.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="skill.icon" class="h-5 w-5" /></div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-foreground">{{ skill.name }}</p>
                    <Check v-if="assignedSkills.includes(skill.id)" class="ml-auto h-4 w-4 text-primary" />
                  </div>
                  <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ skill.desc }}</p>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-1.5"><span v-for="channel in skill.channels" :key="channel" class="rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-foreground/45">{{ channel }}</span></div>
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
