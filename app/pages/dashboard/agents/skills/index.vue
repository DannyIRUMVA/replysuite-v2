<script setup lang="ts">
import { ArrowRight, Bot, Calendar, ChevronDown, CreditCard, Database, Globe2, Headphones, Instagram, Languages, Loader2, MessageCircle, MessageSquare, PackageCheck, RotateCcw, Save, Search, ShieldCheck, Sparkles, Target, Users, Zap } from 'lucide-vue-next'

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
const skillSearch = ref('')
const skillCategoryFilter = ref('all')
const skillStatusFilter = ref('all')
const selectedSkillId = ref('website_conversion_guide')

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

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const activeToolsConfig = computed(() => selectedAssistant.value?.tools_config || {})
const assistantSkills = computed(() => Array.isArray(activeToolsConfig.value?.assistant_skills) ? activeToolsConfig.value.assistant_skills : [])
const allSkills = computed(() => skillGroups.flatMap((group) => group.skills.map((skill) => ({ ...skill, category: group.title, groupDesc: group.desc }))))
const skillCategories = computed(() => ['all', ...skillGroups.map((group) => group.title)])
const filteredSkills = computed(() => {
  const query = skillSearch.value.trim().toLowerCase()
  return allSkills.value.filter((skill) => {
    const status = assignedSkills.value.includes(skill.id) ? 'Enabled' : 'Disabled'
    const matchesSearch = !query || [skill.name, skill.desc, skill.category, skill.channels.join(' ')].join(' ').toLowerCase().includes(query)
    const matchesCategory = skillCategoryFilter.value === 'all' || skill.category === skillCategoryFilter.value
    const matchesStatus = skillStatusFilter.value === 'all' || status === skillStatusFilter.value
    return matchesSearch && matchesCategory && matchesStatus
  })
})
const selectedSkill = computed(() => allSkills.value.find((skill) => skill.id === selectedSkillId.value) || allSkills.value[0])
const selectedSkillEnabled = computed(() => Boolean(selectedSkill.value && assignedSkills.value.includes(selectedSkill.value.id)))
const skillDotClass = (enabled: boolean) => enabled ? 'bg-emerald-400 shadow-emerald-400/30' : 'bg-foreground/25 shadow-foreground/10'

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
  <div class="w-full overflow-x-hidden space-y-4 pb-12 xl:max-h-[calc(100vh-5.5rem)]">
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

    <div v-else>
      <main class="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section class="min-w-0 rounded-2xl border border-foreground/10 bg-background-card shadow-sm">
          <div class="space-y-2 border-b border-foreground/10 p-3">
            <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div class="relative lg:w-64">
                <select v-model="selectedAssistantId" class="h-10 w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-background px-3 pr-9 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none">
                  <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">{{ assistant.name }}</option>
                </select>
                <ChevronDown class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              </div>
              <div class="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
                <label class="relative block sm:w-64">
                  <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
                  <input v-model="skillSearch" type="search" placeholder="Search skills or channels" class="h-10 w-full rounded-xl border border-foreground/10 bg-background py-2 pl-9 pr-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/40" />
                </label>
                <select v-model="skillStatusFilter" class="h-10 rounded-xl border border-foreground/10 bg-background px-3 text-xs font-black uppercase tracking-widest text-foreground/60 outline-none focus:border-primary/40">
                  <option value="all">All status</option>
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
                <select v-model="skillCategoryFilter" class="h-10 rounded-xl border border-foreground/10 bg-background px-3 text-xs font-black uppercase tracking-widest text-foreground/60 outline-none focus:border-primary/40">
                  <option v-for="category in skillCategories" :key="category" :value="category">{{ category === 'all' ? 'All categories' : category }}</option>
                </select>
                <button @click="saveAssignments" :disabled="!hasChanges || isSaving" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
                  <Save v-else class="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>

          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[820px] text-left">
              <thead class="sticky top-0 z-10 bg-background-card text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                <tr class="border-b border-foreground/10">
                  <th class="px-4 py-3">Skill name</th>
                  <th class="px-4 py-3">Category</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Channels</th>
                  <th class="px-4 py-3 text-right">Quick action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-foreground/10">
                <tr v-for="skill in filteredSkills" :key="skill.id" :class="['group cursor-pointer transition hover:bg-primary/[0.03]', selectedSkillId === skill.id ? 'bg-primary/[0.05]' : '']" @click="selectedSkillId = skill.id">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', assignedSkills.includes(skill.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']"><component :is="skill.icon" class="h-4 w-4" /></div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-black text-foreground">{{ skill.name }}</p>
                        <p class="truncate text-[10px] font-bold uppercase tracking-widest text-foreground/35">{{ skill.id }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="max-w-[15rem] px-4 py-3"><p class="truncate text-xs font-bold text-foreground/55">{{ skill.category }}</p></td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center gap-2 text-xs font-black text-foreground/70"><span :class="['h-2 w-2 rounded-full shadow-md', skillDotClass(assignedSkills.includes(skill.id))]" />{{ assignedSkills.includes(skill.id) ? 'Enabled' : 'Disabled' }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex max-w-[16rem] gap-1 overflow-hidden">
                      <span v-for="channel in skill.channels" :key="channel" class="shrink-0 rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-foreground/45">{{ channel }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button type="button" class="rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition hover:border-primary/30 hover:text-primary" @click.stop="toggleSkill(skill.id)">{{ assignedSkills.includes(skill.id) ? 'Disable' : 'Enable' }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="rounded-2xl border border-foreground/10 bg-background-card p-4 shadow-sm 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-8rem)] 2xl:overflow-y-auto">
          <div class="flex items-start justify-between gap-3 border-b border-foreground/10 pb-4">
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Detail drawer</p>
              <h2 class="mt-1 truncate text-lg font-black text-foreground">{{ selectedSkill?.name }}</h2>
              <p class="mt-1 truncate text-xs font-semibold text-foreground/45">{{ selectedSkill?.category }}</p>
            </div>
            <span :class="['mt-1 h-2.5 w-2.5 rounded-full shadow-md', skillDotClass(selectedSkillEnabled)]" />
          </div>

          <div v-if="selectedSkill" class="space-y-4 pt-4">
            <p class="text-sm font-medium leading-relaxed text-foreground/55">{{ selectedSkill.desc }}</p>
            <button type="button" class="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-black transition hover:opacity-90" @click="toggleSkill(selectedSkill.id)">{{ selectedSkillEnabled ? 'Disable skill' : 'Enable skill' }}</button>
            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
              <p class="text-[10px] font-black uppercase tracking-widest text-foreground/35">Channels</p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span v-for="channel in selectedSkill.channels" :key="channel" class="rounded-full bg-foreground/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-foreground/50">{{ channel }}</span>
              </div>
            </div>
            <div class="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
              <p class="text-[10px] font-black uppercase tracking-widest text-foreground/35">Category context</p>
              <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ selectedSkill.groupDesc }}</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  </div>
</template>
