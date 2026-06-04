<script setup lang="ts">
import {
  ArrowLeft,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  Database,
  FileSpreadsheet,
  Headphones,
  Languages,
  Loader2,
  Lock,
  MessageSquare,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Tools & Skills Directory'
})

const route = useRoute()
const { userId, planSlug } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const isLoading = ref(true)
const isSaving = ref(false)
const assistants = ref<any[]>([])
const selectedAssistantId = ref('')
const assignedTools = ref<string[]>([])
const assignedSkills = ref<string[]>([])

const isPremium = computed(() => ['silver', 'gold', 'enterprise-ready'].includes(planSlug.value || ''))

const toolCatalog = [
  { id: 'orders', name: 'Order Management', desc: 'Let the assistant show products and place customer orders.', icon: ShoppingBag, premium: true },
  { id: 'appointments', name: 'Appointment Setter', desc: 'Collect booking details and help schedule consultations.', icon: Calendar, premium: true },
  { id: 'payments', name: 'MTN/Airtel Payments', desc: 'Request local payments through your configured Paypack account.', icon: CreditCard, premium: true },
  { id: 'invoices', name: 'Automated Invoices', desc: 'Generate simple invoice-style summaries for customer requests.', icon: FileSpreadsheet, premium: true },
]

const skillCatalog = [
  { id: 'lead_qualification', name: 'Lead Qualification', desc: 'Ask focused questions to qualify serious prospects.', icon: Users },
  { id: 'support_triage', name: 'Support Triage', desc: 'Understand urgency, collect missing details, and guide next steps.', icon: Headphones },
  { id: 'sales_advisor', name: 'Sales Advisor', desc: 'Recommend the best option using your trained business content.', icon: Sparkles },
  { id: 'escalation_guardrails', name: 'Escalation Guardrails', desc: 'Know when to hand sensitive or blocked requests to a human.', icon: ShieldCheck },
  { id: 'multilingual_service', name: 'Multilingual Service', desc: 'Stay careful with language choice across local and global customers.', icon: Languages },
  { id: 'concise_follow_up', name: 'Concise Follow-up', desc: 'Keep replies short and end with one clear next step.', icon: MessageSquare },
]

const selectedAssistant = computed(() => assistants.value.find((assistant) => assistant.id === selectedAssistantId.value) || null)
const activeToolsConfig = computed(() => selectedAssistant.value?.tools_config || {})
const assistantSkills = computed(() => Array.isArray(activeToolsConfig.value?.assistant_skills) ? activeToolsConfig.value.assistant_skills : [])

const assignedToolCount = computed(() => assignedTools.value.length)
const assignedSkillCount = computed(() => assignedSkills.value.length)

const hasChanges = computed(() => {
  const currentTools = [...(selectedAssistant.value?.enabled_tools || [])].sort().join('|')
  const nextTools = [...assignedTools.value].sort().join('|')
  const currentSkills = [...assistantSkills.value].sort().join('|')
  const nextSkills = [...assignedSkills.value].sort().join('|')
  return currentTools !== nextTools || currentSkills !== nextSkills
})

const syncSelection = () => {
  const assistant = selectedAssistant.value
  assignedTools.value = Array.isArray(assistant?.enabled_tools) ? [...assistant.enabled_tools] : []
  assignedSkills.value = Array.isArray(assistant?.tools_config?.assistant_skills) ? [...assistant.tools_config.assistant_skills] : []
}

const fetchAssistants = async () => {
  if (!userId.value) return

  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('chatbots')
      .select('id, name, default_language, enabled_tools, tools_config, created_at')
      .eq('user_id', userId.value)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    assistants.value = data || []
    const requestedAssistantId = typeof route.query.id === 'string' ? route.query.id : ''
    if (requestedAssistantId && assistants.value.some((assistant) => assistant.id === requestedAssistantId)) {
      selectedAssistantId.value = requestedAssistantId
    } else if (!selectedAssistantId.value && assistants.value.length > 0) {
      selectedAssistantId.value = assistants.value[0].id
    }
    syncSelection()
  } catch (err) {
    console.error('Failed to load assistants:', err)
    notify.error('Failed to load assistants.')
  } finally {
    isLoading.value = false
  }
}

const toggleValue = (list: { value: string[] }, id: string) => {
  list.value = list.value.includes(id)
    ? list.value.filter((value) => value !== id)
    : [...list.value, id]
}

const toggleTool = (tool: any) => {
  if (tool.premium && !isPremium.value) {
    notify.warn('Upgrade to Silver or higher to assign advanced tools.')
    return
  }
  toggleValue(assignedTools, tool.id)
}

const toggleSkill = (skill: any) => {
  toggleValue(assignedSkills, skill.id)
}

const saveAssignments = async () => {
  if (!selectedAssistant.value || isSaving.value) return

  isSaving.value = true
  try {
    const nextToolsConfig = {
      ...(selectedAssistant.value.tools_config || {}),
      assistant_skills: assignedSkills.value,
    }

    const { error } = await supabase
      .from('chatbots')
      .update({
        enabled_tools: assignedTools.value,
        tools_config: nextToolsConfig,
      })
      .eq('id', selectedAssistant.value.id)
      .eq('user_id', userId.value)

    if (error) throw error

    assistants.value = assistants.value.map((assistant) => assistant.id === selectedAssistant.value.id
      ? {
          ...assistant,
          enabled_tools: [...assignedTools.value],
          tools_config: nextToolsConfig,
        }
      : assistant)

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
  <div class="w-full space-y-6 pb-24">
    <NuxtLink to="/dashboard/agents" class="dashboard-back-link group">
      <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
      Back to Assistants
    </NuxtLink>

    <section class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur-xl md:p-7">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span class="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Tools & Skills directory
          </span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Assign capabilities to each assistant.
          </h1>
          <p class="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-foreground/55">
            Tools let assistants perform actions. Skills shape how they qualify leads, triage support, sell, escalate, and reply.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest sm:flex">
          <div class="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
            {{ assignedToolCount }} tools
          </div>
          <div class="rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2 text-foreground/60">
            {{ assignedSkillCount }} skills
          </div>
        </div>
      </div>
    </section>

    <section v-if="isLoading" class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-8 text-center backdrop-blur-xl">
      <Loader2 class="mx-auto h-7 w-7 animate-spin text-primary" />
      <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-foreground/45">Loading directory</p>
    </section>

    <section v-else-if="assistants.length === 0" class="rounded-[22px] border border-dashed border-foreground/10 bg-foreground/[0.03] p-10 text-center backdrop-blur-xl">
      <Bot class="mx-auto mb-5 h-12 w-12 text-foreground/15" />
      <h2 class="text-xl font-black text-foreground">Create an assistant first</h2>
      <p class="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-foreground/50">
        Tools and skills are assigned to an assistant. Create one, then return here to configure what it can do.
      </p>
      <NuxtLink to="/dashboard/agents" class="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black">
        Open assistants
      </NuxtLink>
    </section>

    <div v-else class="grid gap-6 xl:grid-cols-[18rem_1fr]">
      <aside class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-xl xl:sticky xl:top-24 xl:self-start">
        <label class="mb-3 block text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45">Assistant</label>
        <div class="relative">
          <select
            v-model="selectedAssistantId"
            class="w-full cursor-pointer appearance-none rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 pr-10 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none"
          >
            <option v-for="assistant in assistants" :key="assistant.id" :value="assistant.id" class="bg-background">
              {{ assistant.name }}
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        </div>

        <div v-if="selectedAssistant" class="mt-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
          <p class="text-sm font-bold text-foreground">{{ selectedAssistant.name }}</p>
          <p class="mt-1 text-[10px] font-bold uppercase tracking-widest text-foreground/45">
            {{ selectedAssistant.default_language || 'English' }} assistant
          </p>
        </div>

        <button
          @click="saveAssignments"
          :disabled="!hasChanges || isSaving"
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save assignments
        </button>

        <NuxtLink
          v-if="selectedAssistant"
          :to="`/dashboard/agents/skills/training?id=${selectedAssistant.id}`"
          class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/10 bg-foreground/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/10 hover:text-foreground"
        >
          <Database class="h-4 w-4 text-primary" />
          Train knowledge
        </NuxtLink>
      </aside>

      <main class="space-y-6">
        <section class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-xl md:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-black tracking-tight text-foreground">Tools</h2>
              <p class="mt-1 text-sm font-medium text-foreground/50">Action capabilities the assistant can call during conversations.</p>
            </div>
            <Zap class="h-5 w-5 text-primary" />
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <button
              v-for="tool in toolCatalog"
              :key="tool.id"
              type="button"
              @click="toggleTool(tool)"
              :class="[
                'rounded-2xl border p-4 text-left transition-all',
                assignedTools.includes(tool.id) ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]',
                tool.premium && !isPremium ? 'opacity-60' : ''
              ]"
            >
              <div class="flex items-start gap-4">
                <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', assignedTools.includes(tool.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']">
                  <component :is="tool.icon" class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-foreground">{{ tool.name }}</p>
                    <Lock v-if="tool.premium && !isPremium" class="h-3.5 w-3.5 text-amber-400" />
                    <Check v-if="assignedTools.includes(tool.id)" class="ml-auto h-4 w-4 text-primary" />
                  </div>
                  <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ tool.desc }}</p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section class="rounded-[22px] border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-xl md:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-black tracking-tight text-foreground">Skills</h2>
              <p class="mt-1 text-sm font-medium text-foreground/50">Behavior packages that are injected into the assistant instructions at runtime.</p>
            </div>
            <Sparkles class="h-5 w-5 text-primary" />
          </div>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <button
              v-for="skill in skillCatalog"
              :key="skill.id"
              type="button"
              @click="toggleSkill(skill)"
              :class="[
                'rounded-2xl border p-4 text-left transition-all',
                assignedSkills.includes(skill.id) ? 'border-primary/40 bg-primary/10' : 'border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04]'
              ]"
            >
              <div class="flex items-start gap-4">
                <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', assignedSkills.includes(skill.id) ? 'bg-primary text-black' : 'bg-foreground/5 text-foreground/50']">
                  <component :is="skill.icon" class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-black text-foreground">{{ skill.name }}</p>
                    <Check v-if="assignedSkills.includes(skill.id)" class="ml-auto h-4 w-4 text-primary" />
                  </div>
                  <p class="mt-1 text-xs font-medium leading-relaxed text-foreground/50">{{ skill.desc }}</p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
