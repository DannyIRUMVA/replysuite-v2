<script setup lang="ts">
import {
 ArrowLeft,
 Bot,
 Save,
 Loader2,
 Info,
 Globe,
 Lock,
 MessageSquare,
 Shield,
 ShieldCheck,
 Trash2,
 Palette,
 Monitor,
 Pipette,
 RotateCcw,
 Sparkles,
 Zap,
 ExternalLink,
 CreditCard,
 Calendar,
 Database,
 Plus
} from 'lucide-vue-next'
import CustomSelect from '~~/app/components/CustomSelect.vue'
import { chatbotLanguageCodeOptions, chatbotLanguageOptions, getChatbotLanguageCode, getChatbotLanguageName, normalizeChatbotLanguageName } from '~~/app/utils/chatbotLanguages'
import ToolSelector from '~/components/agents/tools/ToolSelector.vue'
import MobilePaymentConfig from '~/components/agents/tools/MobilePaymentConfig.vue'

definePageMeta({
 middleware: 'auth',
 layout: 'dashboard'
})

const route = useRoute()
const chatbotId = route.params.id as string
const { userId, planSlug, limits } = useAuth()
const { canUseBusinessTools } = usePlanAccess()
const isPremium = computed(() => ['silver', 'gold', 'enterprise-ready'].includes(planSlug.value || ''))
const canUseAiTools = canUseBusinessTools
const supabase = useSupabaseClient()
const router = useRouter()
const notify = useNotify()

// State
const isLoading = ref(true)
const isSaving = ref(false)
const agent = ref<any>(null)
const activeTab = ref<'identity' | 'design' | 'conversation' | 'security' | 'tools' | 'skills'>('identity')
const newDomainInput = ref<string>('')

useHead({
 title: computed(() => agent.value?.name ? `${agent.value.name} | Assistant Settings` : 'Assistant Settings | ReplySuite'),
})

const launcherIcons = [
 { name: 'Bot', icon: Bot, label: 'Robot' },
 { name: 'MessageSquare', icon: MessageSquare, label: 'Message' },
 { name: 'Sparkles', icon: Sparkles, label: 'Sparkles' },
 { name: 'Zap', icon: Zap, label: 'Lightning' },
 { name: 'HelpCircle', icon: Info, label: 'Help' }
]

const defaultConversationSettings = {
 tone: 'friendly',
 responseLength: 'balanced',
 greetOncePerSession: true,
 avoidRepeatingQuestions: true,
 askOneQuestionAtATime: true,
 continueFromPreviousAnswer: true,
 sessionMemoryEnabled: true,
 contactMemoryEnabled: true,
 websiteReplyStyle: 'guided',
 whatsappReplyStyle: 'short',
 leadCaptureMode: 'when-needed',
}

// Forms
const form = ref({
 name: '',
 system_prompt: '',
 is_public: false,
 default_language: 'English',
 primary_color: '#D4AF37',
 secondary_color: '#1a1a1a',
 chat_bubble_style: 'rounded',
 widget_position: 'bottom-right',
 welcome_message: 'Hello! How can I help you today?',
 allowed_domains: [] as string[],
 allow_localhost_testing: true,
 ai_disclosure: true,
 launcher_color: '#D4AF37',
 launcher_icon: 'MessageSquare',
 launcher_style: 'circle',
 launcher_icon_color: '',
 chat_icon: 'Bot',
 chat_icon_color: '',
 enabled_tools: [] as string[],
 tools_config: {
 conversation_settings: { ...defaultConversationSettings }
 } as any,
})

const languageOptions = chatbotLanguageOptions
const languageCodeOptions = chatbotLanguageCodeOptions
const languageSettings = ref({
 supportedCodes: ['en'] as string[],
 fallbackLanguage: 'English',
 tableAvailable: false,
})

const selectedLanguageCodes = computed({
 get: () => languageSettings.value.supportedCodes,
 set: (codes: string[]) => {
 const uniqueCodes = Array.from(new Set(codes.length ? codes : ['en']))
 const primaryCode = getChatbotLanguageCode(form.value.default_language)
 const fallbackCode = getChatbotLanguageCode(languageSettings.value.fallbackLanguage)

 if (!uniqueCodes.includes(primaryCode)) uniqueCodes.unshift(primaryCode)
 if (!uniqueCodes.includes(fallbackCode)) uniqueCodes.push(fallbackCode)
 languageSettings.value.supportedCodes = uniqueCodes
 }
})

const fallbackLanguageOptions = computed(() => languageCodeOptions
 .filter((language) => selectedLanguageCodes.value.includes(language.code))
 .map((language) => ({ label: language.label, value: language.label })))

const primaryLanguageCode = computed(() => getChatbotLanguageCode(form.value.default_language))
const fallbackLanguageCode = computed(() => getChatbotLanguageCode(languageSettings.value.fallbackLanguage))

const toggleSupportedLanguage = (code: string) => {
 const current = new Set(selectedLanguageCodes.value)
 if (current.has(code)) {
 if (code === primaryLanguageCode.value || code === fallbackLanguageCode.value) return
 current.delete(code)
 } else {
 current.add(code)
 }
 selectedLanguageCodes.value = Array.from(current)
}

watch(() => form.value.default_language, (language) => {
 const code = getChatbotLanguageCode(language)
 if (!selectedLanguageCodes.value.includes(code)) {
 selectedLanguageCodes.value = [code, ...selectedLanguageCodes.value]
 }
})

watch(() => languageSettings.value.fallbackLanguage, (language) => {
 const code = getChatbotLanguageCode(language)
 if (!selectedLanguageCodes.value.includes(code)) {
 selectedLanguageCodes.value = [...selectedLanguageCodes.value, code]
 }
})

const bubbleStyleOptions = [
 { label: 'Rounded (Soft)', value: 'rounded' },
 { label: 'Pill (Minimal)', value: 'pill' },
 { label: 'Sharp (Corporate)', value: 'sharp' },
]

const positionOptions = [
 { label: 'Bottom Right', value: 'bottom-right' },
 { label: 'Bottom Left', value: 'bottom-left' },
]

// Preset color palettes
const colorPresets = [
 { name: 'Gold', primary: '#D4AF37', secondary: '#1a1a1a' },
 { name: 'Indigo', primary: '#6366f1', secondary: '#0f0f1a' },
 { name: 'Emerald', primary: '#10b981', secondary: '#0a1a12' },
 { name: 'Rose', primary: '#f43f5e', secondary: '#1a0a0f' },
 { name: 'Sky', primary: '#0ea5e9', secondary: '#0a1520' },
 { name: 'Amber', primary: '#f59e0b', secondary: '#1a1200' },
 { name: 'Purple', primary: '#a855f7', secondary: '#120a1a' },
 { name: 'White', primary: '#ffffff', secondary: '#111111' },
]

// Live preview computed
const bubbleRadius = computed(() => {
 if (form.value.chat_bubble_style === 'pill') return '9999px'
 if (form.value.chat_bubble_style === 'sharp') return '6px'
 return '18px'
})

const previewMessages = [
 { role: 'user', text: 'Hi, can you help me?' },
 { role: 'bot', text: form },
]

const maxWebsiteDomains = computed(() => limits.value.maxWebsiteDomains || 1)
const websiteConnectionIsActive = computed(() => form.value.is_public && form.value.allowed_domains.length > 0)
const canDisableLocalhostTesting = computed(() => websiteConnectionIsActive.value)

const normalizeDomainInput = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/:\d+$/, '')

const addAllowedDomain = () => {
 const normalized = normalizeDomainInput(newDomainInput.value)

 if (!normalized) {
 notify.warn('Enter a valid domain first.')
 return
 }

 if (normalized === 'localhost' || normalized === '127.0.0.1') {
 notify.warn('Use localhost testing instead of adding localhost as an approved production domain.')
 return
 }

 if (form.value.allowed_domains.includes(normalized)) {
 notify.warn('This domain is already in your allowlist.')
 return
 }

 if (form.value.allowed_domains.length >= maxWebsiteDomains.value) {
 notify.error(`Your current plan allows up to ${maxWebsiteDomains.value} website domain${maxWebsiteDomains.value === 1 ? '' : 's'} per assistant.`)
 return
 }

 form.value.allowed_domains.push(normalized)
 newDomainInput.value = ''
}

const setFallbackLanguageDefaults = () => {
 const primaryCode = getChatbotLanguageCode(form.value.default_language)
 const fallbackCode = getChatbotLanguageCode(languageSettings.value.fallbackLanguage)
 selectedLanguageCodes.value = Array.from(new Set([primaryCode, ...selectedLanguageCodes.value, fallbackCode, 'en']))
}

const fetchChatbotLanguages = async () => {
 try {
 const { data, error } = await (supabase as any)
 .from('chatbot_languages')
 .select('language_code, is_primary, is_fallback, is_enabled')
 .eq('chatbot_id', chatbotId)
 .eq('is_enabled', true)

 if (error) throw error

 const rows = Array.isArray(data) ? data : []
 if (!rows.length) {
 languageSettings.value.tableAvailable = true
 setFallbackLanguageDefaults()
 return
 }

 const primary = rows.find((row: any) => row.is_primary) || rows[0]
 const fallback = rows.find((row: any) => row.is_fallback) || rows.find((row: any) => row.language_code === 'en') || primary

 form.value.default_language = getChatbotLanguageName(primary.language_code)
 languageSettings.value = {
 supportedCodes: Array.from(new Set(rows.map((row: any) => row.language_code).filter(Boolean))),
 fallbackLanguage: getChatbotLanguageName(fallback.language_code),
 tableAvailable: true,
 }
 setFallbackLanguageDefaults()
 } catch (err) {
 console.warn('[Languages] chatbot_languages unavailable, using legacy default_language only:', err)
 languageSettings.value.tableAvailable = false
 setFallbackLanguageDefaults()
 }
}

const saveChatbotLanguages = async () => {
 const primaryCode = getChatbotLanguageCode(form.value.default_language)
 const fallbackCode = getChatbotLanguageCode(languageSettings.value.fallbackLanguage)
 const codes = Array.from(new Set([primaryCode, ...selectedLanguageCodes.value, fallbackCode]))

 try {
 const table = (supabase as any).from('chatbot_languages')
 const { error: clearError } = await table
 .update({ is_primary: false, is_fallback: false, is_enabled: false })
 .eq('chatbot_id', chatbotId)

 if (clearError) throw clearError

 const rows = codes.map((code) => ({
 chatbot_id: chatbotId,
 language_code: code,
 is_primary: code === primaryCode,
 is_fallback: code === fallbackCode,
 is_enabled: true,
 }))

 const { error: upsertError } = await (supabase as any)
 .from('chatbot_languages')
 .upsert(rows, { onConflict: 'chatbot_id,language_code' })

 if (upsertError) throw upsertError
 languageSettings.value.tableAvailable = true
 } catch (err) {
 console.warn('[Languages] Could not persist chatbot language mappings yet:', err)
 languageSettings.value.tableAvailable = false
 }
}

// Fetch Data
const fetchData = async () => {
 if (!chatbotId || !userId.value) return
 isLoading.value = true
 try {
 const { data, error } = await supabase
 .from('chatbots')
 .select('*')
 .eq('id', chatbotId)
 .eq('user_id', userId.value)
 .single()

 if (error) throw error
 if (data) {
 agent.value = data
 form.value = {
 name: data.name || '',
 system_prompt: data.system_prompt || '',
 is_public: data.is_public || false,
 default_language: normalizeChatbotLanguageName(data.default_language || 'English'),
 primary_color: data.primary_color || '#D4AF37',
 secondary_color: data.secondary_color || '#1a1a1a',
 chat_bubble_style: data.chat_bubble_style || 'rounded',
 widget_position: data.widget_position || 'bottom-right',
 welcome_message: data.welcome_message || 'Hello! How can I help you today?',
 allowed_domains: data.allowed_domains || [],
 allow_localhost_testing: data.allow_localhost_testing ?? true,
 ai_disclosure: data.ai_disclosure ?? true,
 launcher_color: data.launcher_color || data.primary_color || '#D4AF37',
 launcher_icon: data.launcher_icon || 'MessageSquare',
 launcher_style: data.launcher_style || 'circle',
 launcher_icon_color: data.launcher_icon_color || '',
 chat_icon: data.chat_icon || 'Bot',
 chat_icon_color: data.chat_icon_color || '',
 enabled_tools: Array.isArray(data.enabled_tools) ? data.enabled_tools.filter((tool: string) => tool !== 'orders') : [],
 tools_config: {
 ...(data.tools_config || {}),
 conversation_settings: {
 ...defaultConversationSettings,
 ...(data.tools_config?.conversation_settings || {}),
 }
 },
 }
 await fetchChatbotLanguages()
 if (activeTab.value === 'tools') {
 }
 }
 } catch (err) {
 console.error('Error fetching agent:', err)
 router.push('/dashboard/agents')
 } finally {
 isLoading.value = false
 }
}

onMounted(async () => {
 // Handle tab routing
 if (route.query.tab && ['identity', 'design', 'conversation', 'tools', 'skills', 'security'].includes(route.query.tab as string)) {
 activeTab.value = route.query.tab as any
 }

 await fetchData()
})

// Save
const handleSave = async () => {
 if (!chatbotId || isSaving.value) return

 if (form.value.allowed_domains.length > maxWebsiteDomains.value) {
 notify.error(`Your current plan allows up to ${maxWebsiteDomains.value} website domain${maxWebsiteDomains.value === 1 ? '' : 's'} per assistant.`)
 return
 }

 if (!websiteConnectionIsActive.value) {
 form.value.allow_localhost_testing = true
 }

 isSaving.value = true
 try {
 const { error } = await supabase
 .from('chatbots')
 .update({
 name: form.value.name,
 system_prompt: form.value.system_prompt,
 is_public: form.value.is_public,
 default_language: normalizeChatbotLanguageName(form.value.default_language),
 primary_color: form.value.primary_color,
 secondary_color: form.value.secondary_color,
 chat_bubble_style: form.value.chat_bubble_style,
 widget_position: form.value.widget_position,
 welcome_message: form.value.welcome_message,
 allowed_domains: form.value.allowed_domains,
 allow_localhost_testing: form.value.allow_localhost_testing,
 ai_disclosure: form.value.ai_disclosure,
 launcher_color: form.value.launcher_color,
 launcher_icon: form.value.launcher_icon,
 launcher_style: form.value.launcher_style,
 launcher_icon_color: form.value.launcher_icon_color,
 chat_icon: form.value.chat_icon,
 chat_icon_color: form.value.chat_icon_color,
 enabled_tools: form.value.enabled_tools.filter((tool: string) => tool !== 'orders'),
 tools_config: form.value.tools_config,
 })
 .eq('id', chatbotId)

 if (error) throw error
 await saveChatbotLanguages()
 agent.value = { ...agent.value, ...form.value }
 notify.success(languageSettings.value.tableAvailable
 ? 'Assistant settings and language support saved successfully.'
 : 'Assistant settings saved. Language mappings will sync after the language migration is deployed.')
 } catch (err) {
 console.error('Error saving settings:', err)
 notify.error('Failed to save changes.')
 } finally {
 isSaving.value = false
 }
}

const handleDelete = async () => {
 if (!(await notify.confirm('Are you sure you want to delete this assistant? This cannot be undone.'))) return
 try {
 const { error } = await supabase
 .from('chatbots')
 .update({ deleted_at: new Date().toISOString() })
 .eq('id', chatbotId)
 if (error) throw error
 notify.success('Assistant deleted successfully.')
 router.push('/dashboard/agents')
 } catch (err) {
 notify.error('Failed to delete assistant.')
 }
}

const applyPreset = (preset: { primary: string; secondary: string }) => {
 form.value.primary_color = preset.primary
 form.value.secondary_color = preset.secondary
 form.value.launcher_color = preset.primary
}

const resetDesign = () => {
 form.value.welcome_message = 'Hello! How can I help you today?'
 form.value.launcher_color = '#D4AF37'
 form.value.launcher_icon = 'MessageSquare'
 form.value.launcher_style = 'circle'
}



const launcherStyles = [
 { label: 'Circle', value: 'circle' },
 { label: 'Square', value: 'square' },
 { label: 'Rounded', value: 'rounded-square' },
 { label: 'Pill', value: 'pill' },
]

// Tools & Catalog Logic
// Moved to components: ToolSelector, MobilePaymentConfig

</script>

<template>
 <div class="mx-auto max-w-7xl space-y-5 pb-24 pt-3">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 sm:p-6">
 <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
 <div class="min-w-0">
 <NuxtLink to="/dashboard/agents" class="dashboard-back-link group mb-3 inline-flex">
 <ArrowLeft class="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
 Back to assistants
 </NuxtLink>
 <p class="dashboard-eyebrow text-primary/80">Assistant settings</p>
 <h1 class="dashboard-section-title mt-2 truncate">{{ form.name || agent?.name || 'Assistant' }}</h1>
 <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
 Configure identity, conversation behavior, website design, tools, skills, and domain security from one compact workspace.
 </p>
 </div>

 <button
 @click="handleSave"
 :disabled="isSaving || isLoading"
 class="inline-flex items-center justify-center gap-2 rounded-[0.39rem] bg-primary px-4 py-2 text-xs font-bold text-black shadow-sm shadow-primary/10 transition hover:bg-primary-accent disabled:opacity-50"
 >
 <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
 <Save v-else class="h-4 w-4" />
 Save changes
 </button>
 </div>
 </section>

 <!-- Tab Switcher -->
 <div class="flex w-full gap-2 overflow-x-auto rounded-[0.39rem] border border-foreground/10 bg-background-card/45 p-1.5 shadow-sm shadow-black/5 lg:w-fit">
 <button
 v-for="tab in [
 { id: 'identity', label: 'Identity', icon: Bot },
 { id: 'design', label: 'Design', icon: Palette },
 { id: 'conversation', label: 'Conversations', icon: MessageSquare },
 { id: 'tools', label: 'Tools', icon: Zap },
 { id: 'skills', label: 'Skills', icon: Sparkles },
 { id: 'security', label: 'Security', icon: Shield }
 ]"
 :key="tab.id"
 @click="activeTab = tab.id as any"
 :class="[
 'flex shrink-0 items-center gap-2 rounded-[0.39rem] px-3.5 py-2 text-xs font-semibold transition',
 activeTab === tab.id
 ? 'bg-primary text-black shadow-sm shadow-primary/10'
 : 'text-foreground/55 hover:bg-foreground/5 hover:text-foreground'
 ]"
 >
 <component :is="tab.icon" class="w-3.5 h-3.5" />
 {{ tab.label }}
 </button>
 </div>

 <!-- Loading -->
 <div v-if="isLoading" class="flex justify-center py-12">
 <Loader2 class="w-8 h-8 text-primary animate-spin" />
 </div>

 <!-- ─── IDENTITY TAB ─────────────────────────────────────── -->
 <div v-else-if="activeTab === 'identity'" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
 <div class="lg:col-span-8 space-y-5">

 <!-- Identity -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Identity</h3>
 <div class="space-y-6">
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Assistant name</label>
 <input
 v-model="form.name"
 class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm placeholder:text-foreground/50"
 placeholder="e.g. Sales Pilot"
 />
 </div>
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Assistant instructions</label>
 <textarea
 v-model="form.system_prompt"
 rows="10"
 class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-4 text-xs text-foreground/70 focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed placeholder:text-foreground/50"
 placeholder="Describe your assistant tone, goals, and constraints..."
 />
 <div class="mt-4 p-4 rounded-[0.39rem] bg-primary/5 border border-primary/10 flex gap-3">
 <Info class="w-4 h-4 text-primary shrink-0" />
 <p class="text-xs text-foreground/50 leading-relaxed ">
 This protocol overrides default behaviors. Define exactly how you want the AI to represent your brand.
 </p>
 </div>
 </div>
 </div>
 </section>

 <!-- Danger Zone -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6 border-red-500/10 bg-red-500/[0.01]">
 <h3 class="text-xs font-bold text-red-500/70 mb-4">Danger zone</h3>
 <div class="flex items-center justify-between p-5 rounded-[0.39rem] bg-foreground/[0.01] border border-foreground/5">
 <div>
 <p class="text-sm font-bold text-foreground mb-1">Delete assistant</p>
 <p class="text-xs text-foreground/50 ">Permanently remove this assistant from your workspace.</p>
 </div>
 <button
 @click="handleDelete"
 class="px-5 py-2.5 bg-red-500/10 text-red-500 rounded-[0.39rem] font-bold text-xs hover:bg-red-500 hover:text-foreground transition-all border border-red-500/20"
 >
 <Trash2 class="w-4 h-4 inline-block mr-1.5" />Delete
 </button>
 </div>
 </section>
 </div>

 <!-- Right Sidebar -->
 <div class="lg:col-span-4 space-y-6">

 <!-- Visibility Toggle -->
 <div class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5">
 <div class="flex items-center justify-between mb-4">
 <h4 class="text-xs font-semibold text-foreground/50">Deployment</h4>
 <component :is="form.is_public ? Globe : Lock" class="w-4 h-4 text-primary opacity-50" />
 </div>
 <button
 @click="form.is_public = !form.is_public"
 :class="[
 'w-full p-4 rounded-[0.39rem] border transition-all flex items-center justify-between text-left',
 form.is_public ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-foreground/5 border-foreground/5 text-foreground/50'
 ]"
 >
 <div>
 <p class="text-xs font-semibold mb-1">{{ form.is_public ? 'Public mode active' : 'Internal only' }}</p>
 <p class="text-xs opacity-60">{{ form.is_public ? 'Website embed access enabled.' : 'Keep this assistant private.' }}</p>
 </div>
 <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.is_public ? 'bg-primary' : 'bg-foreground/10']">
 <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.is_public ? 'translate-x-5' : 'translate-x-0']" />
 </div>
 </button>
 <p class="mt-4 text-xs text-foreground/50 leading-relaxed ">
 Public mode allows your assistant to be embedded on approved websites.
 </p>
 </div>

 <!-- Languages -->
 <div class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 relative z-10">
 <div class="flex items-center justify-between mb-4">
 <div>
 <h4 class="text-xs font-semibold text-foreground/50">Languages</h4>
 <p class="mt-1 text-xs text-foreground/40 ">Primary, supported and fallback languages</p>
 </div>
 <Globe class="w-4 h-4 text-primary opacity-50" />
 </div>

 <div class="space-y-5">
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-2">Primary language</label>
 <CustomSelect v-model="form.default_language" :options="languageOptions" placeholder="Select Language" />
 </div>

 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-2">Fallback language</label>
 <CustomSelect v-model="languageSettings.fallbackLanguage" :options="fallbackLanguageOptions" placeholder="Select Fallback" />
 <p class="text-xs text-foreground/45 leading-relaxed mt-2">
 Used when the visitor writes in an unsupported or unclear language.
 </p>
 </div>

 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Supported languages</label>
 <div class="grid grid-cols-1 gap-2">
 <button
 v-for="language in languageCodeOptions"
 :key="language.code"
 type="button"
 @click="toggleSupportedLanguage(language.code)"
 :class="[
 'w-full rounded-[0.39rem] border px-3 py-3 text-left transition-all flex items-center justify-between gap-3',
 selectedLanguageCodes.includes(language.code)
 ? 'border-primary/40 bg-primary/10 text-foreground'
 : 'border-foreground/5 bg-foreground/5 text-foreground/45 hover:text-foreground/70'
 ]"
 >
 <span>
 <span class="block text-xs font-semibold">{{ language.label }}</span>
 <span class="block text-xs opacity-60">{{ language.nativeName }} · {{ language.focus }}</span>
 </span>
 <span
 :class="[
 'h-4 w-4 rounded-full border flex-shrink-0',
 selectedLanguageCodes.includes(language.code) ? 'bg-primary border-primary' : 'border-foreground/20'
 ]"
 />
 </button>
 </div>
 </div>
 </div>

 <p class="text-xs text-foreground/50 leading-relaxed mt-5">
 The runtime detects each visitor message and replies in a supported language. Keep English as fallback for safest recovery.
 </p>
 <p v-if="!languageSettings.tableAvailable" class="mt-3 rounded-[0.39rem] border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 leading-relaxed">
 Legacy mode active until the language database migration is deployed. The assistant still uses runtime language detection.
 </p>
 </div>

 <!-- AI disclosure -->
 <div class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5">
 <div class="flex items-center justify-between mb-4">
 <h4 class="text-xs font-semibold text-foreground/50">Compliance (EU/Global)</h4>
 <ShieldCheck class="w-4 h-4 text-primary opacity-50" />
 </div>
 <button
 @click="form.ai_disclosure = !form.ai_disclosure"
 :class="[
 'w-full p-4 rounded-[0.39rem] border transition-all flex items-center justify-between text-left',
 form.ai_disclosure ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-foreground/5 border-foreground/5 text-foreground/50'
 ]"
 >
 <div>
 <p class="text-xs font-semibold mb-1">AI Disclosure Label</p>
 <p class="text-xs opacity-60">{{ form.ai_disclosure ? 'Mandatory labeling active.' : 'Labeling disabled.' }}</p>
 </div>
 <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.ai_disclosure ? 'bg-primary' : 'bg-foreground/10']">
 <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.ai_disclosure ? 'translate-x-5' : 'translate-x-0']" />
 </div>
 </button>
 <p class="mt-4 text-xs text-foreground/50 leading-relaxed ">
 In the EU and Brazil, AI-generated content must be identifiable. This toggle appends transparency metadata to all responses.
 </p>
 </div>

 <!-- Summary -->
 <div class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5">
 <h4 class="text-xs font-semibold text-foreground/50 mb-4">Summary</h4>
 <div class="space-y-5">
 <div class="flex items-center gap-4">
 <div class="p-2 rounded-[0.39rem] bg-foreground/5"><MessageSquare class="w-4 h-4 text-foreground/50" /></div>
 <div>
 <p class="text-xs font-bold text-foreground">{{ agent?.session_count || 0 }} Conversations</p>
 <p class="text-xs text-foreground/50 ">Lifetime interactions</p>
 </div>
 </div>
 <div class="flex items-center gap-4">
 <div class="p-2 rounded-[0.39rem] bg-foreground/5"><Shield class="w-4 h-4 text-foreground/50" /></div>
 <div>
 <p class="text-xs font-bold text-foreground">Secure Vault</p>
 <p class="text-xs text-foreground/50 ">Encryption layer active</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <!-- ─── DESIGN TAB ─────────────────────────────────────────── -->
 <div v-else-if="activeTab === 'design'" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

 <!-- Left: Controls (8/12) -->
 <div class="lg:col-span-8 space-y-5">

 <!-- Color Presets -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <div class="flex items-center justify-between mb-4">
 <div>
 <h3 class="text-xs font-bold text-foreground/60 mb-1">Color Presets</h3>
 <p class="text-xs text-foreground/50 ">Quick-apply brand palettes</p>
 </div>
 <button @click="resetDesign" class="flex items-center gap-1.5 text-xs font-bold text-foreground/50 hover:text-foreground transition-colors">
 <RotateCcw class="w-3 h-3" />Reset
 </button>
 </div>
 <div class="grid grid-cols-4 sm:grid-cols-8 gap-3">
 <button
 v-for="preset in colorPresets"
 :key="preset.name"
 @click="applyPreset(preset)"
 :title="preset.name"
 :class="[
 'relative h-12 rounded-[0.39rem] border-2 transition-all overflow-hidden group',
 form.primary_color === preset.primary ? 'border-foreground/50 scale-105' : 'border-transparent hover:border-foreground/20'
 ]"
 :style="{ background: `linear-gradient(135deg, ${preset.secondary} 0%, ${preset.primary}40 100%)` }"
 >
 <div class="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border border-foreground/20" :style="{ backgroundColor: preset.primary }" />
 <span class="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground/50 group-hover:text-foreground/50 transition-colors ">
 {{ preset.name }}
 </span>
 </button>
 </div>
 </section>

 <!-- Custom Colors -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Custom Colors</h3>
 <div class="grid grid-cols-2 gap-5">
 <!-- Primary Color -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">
 <Pipette class="w-3 h-3 inline-block mr-1 text-primary" />Primary Color
 </label>
 <div class="flex items-center gap-3 p-3 bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem]">
 <div class="relative">
 <input
 type="color"
 v-model="form.primary_color"
 class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-[0.39rem]"
 />
 <div class="w-7 h-7 rounded-[0.39rem] border-2 border-foreground/10 shadow-lg cursor-pointer transition-transform hover:scale-110"
 :style="{ backgroundColor: form.primary_color }" />
 </div>
 <div class="flex-1">
 <input
 v-model="form.primary_color"
 type="text"
 maxlength="7"
 class="w-full bg-transparent text-foreground font-mono text-xs focus:outline-none "
 placeholder="#D4AF37"
 />
 <p class="text-[8px] text-foreground/50 mt-0.5">Buttons, accents, links</p>
 </div>
 </div>
 </div>

 <!-- Secondary Color (Background) -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">
 <Pipette class="w-3 h-3 inline-block mr-1 text-foreground/50" />Background Color
 </label>
 <div class="flex items-center gap-3 p-3 bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem]">
 <div class="relative">
 <input
 type="color"
 v-model="form.secondary_color"
 class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-[0.39rem]"
 />
 <div class="w-7 h-7 rounded-[0.39rem] border-2 border-foreground/10 shadow-lg cursor-pointer transition-transform hover:scale-110"
 :style="{ backgroundColor: form.secondary_color }" />
 </div>
 <div class="flex-1">
 <input
 v-model="form.secondary_color"
 type="text"
 maxlength="7"
 class="w-full bg-transparent text-foreground font-mono text-xs focus:outline-none "
 placeholder="#1a1a1a"
 />
 <p class="text-[8px] text-foreground/50 mt-0.5">Widget background</p>
 </div>
 </div>
 </div>
 </div>
 </section>

 <!-- Style & Layout -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6 space-y-5">
 <h3 class="text-xs font-semibold text-foreground/50 ">Style & Layout</h3>

 <!-- Bubble Style -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">Chat Bubble Style</label>
 <div class="grid grid-cols-3 gap-3">
 <button
 v-for="style in bubbleStyleOptions"
 :key="style.value"
 @click="form.chat_bubble_style = style.value"
 :class="[
 'p-3 rounded-[0.39rem] border text-xs font-bold transition-all',
 form.chat_bubble_style === style.value
 ? 'bg-primary/10 border-primary/40 text-primary'
 : 'bg-foreground/[0.02] border-foreground/5 text-foreground/50 hover:border-foreground/10'
 ]"
 >
 <div class="mb-2 h-5 flex items-center justify-center">
 <div class="h-4 w-16 bg-foreground/10"
 :style="{ borderRadius: style.value === 'pill' ? '9999px' : style.value === 'sharp' ? '2px' : '8px' }" />
 </div>
 {{ style.label.split(' ')[0] }}
 </button>
 </div>
 </div>

 <!-- Widget Position -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">Widget Position</label>
 <div class="grid grid-cols-2 gap-3">
 <button
 v-for="pos in positionOptions"
 :key="pos.value"
 @click="form.widget_position = pos.value"
 :class="[
 'p-4 rounded-[0.39rem] border text-xs font-bold transition-all flex flex-col items-center gap-2',
 form.widget_position === pos.value
 ? 'bg-primary/10 border-primary/40 text-primary'
 : 'bg-foreground/[0.02] border-foreground/5 text-foreground/50 hover:border-foreground/10'
 ]"
 >
 <!-- Mini screen mockup -->
 <div class="w-16 h-10 bg-foreground/5 rounded-[0.39rem] relative border border-foreground/10">
 <div
 class="absolute bottom-1 w-3 h-3 rounded-full"
 :class="pos.value === 'bottom-right' ? 'right-1' : 'left-1'"
 :style="{ backgroundColor: form.widget_position === pos.value ? form.primary_color : '#444' }"
 />
 </div>
 {{ pos.label }}
 </button>
 </div>
 </div>


 <!-- Welcome Message -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">Welcome Message</label>
 <input
 v-model="form.welcome_message"
 class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem] px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors placeholder:text-foreground/50"
 placeholder="Hello! How can I help you today?"
 />
 </div>
 </section>

 <!-- Launcher Customization (Premium) -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6 relative overflow-hidden" :class="{ 'opacity-50 pointer-events-none': !isPremium }">
 <div v-if="!isPremium" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
 <div class="p-3 bg-primary/20 rounded-[0.39rem] mb-3">
 <Lock class="w-6 h-6 text-primary" />
 </div>
 <p class="text-xs font-bold text-foreground ">Premium Customization</p>
 <p class="text-xs text-foreground/50 mt-1">Upgrade to Silver or Gold to unlock</p>
 </div>

 <h3 class="text-xs font-bold text-foreground/60 mb-4 flex items-center justify-between">
 Launcher Customization
 <span v-if="isPremium" class="bg-primary/20 text-primary px-2 py-0.5 rounded text-[8px]">PREMIUM ACTIVE</span>
 </h3>

 <div class="space-y-5">
 <!-- Launcher Color -->
 <div class="grid grid-cols-2 gap-6">
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">
 <Pipette class="w-3 h-3 inline-block mr-1 text-primary" />Launcher Color
 </label>
 <div class="flex items-center gap-3 p-3 bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem]">
 <div class="relative">
 <input
 type="color"
 v-model="form.launcher_color"
 class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-[0.39rem]"
 />
 <div class="w-7 h-7 rounded-[0.39rem] border-2 border-foreground/10 shadow-lg cursor-pointer transition-transform hover:scale-110"
 :style="{ backgroundColor: form.launcher_color }" />
 </div>
 <div class="flex-1">
 <input
 v-model="form.launcher_color"
 type="text"
 maxlength="7"
 class="w-full bg-transparent text-foreground font-mono text-xs focus:outline-none "
 placeholder="#D4AF37"
 />
 </div>
 </div>
 </div>

 <!-- Launcher Icon Color -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">
 <Pipette class="w-3 h-3 inline-block mr-1 text-primary" />Icon Color
 </label>
 <div class="flex items-center gap-3 p-3 bg-foreground/[0.02] border border-foreground/5 rounded-[0.39rem]">
 <div class="relative">
 <input
 type="color"
 v-model="form.launcher_icon_color"
 @input="form.chat_icon_color = form.launcher_icon_color"
 class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-[0.39rem]"
 />
 <div class="w-7 h-7 rounded-[0.39rem] border-2 border-foreground/10 shadow-lg cursor-pointer transition-transform hover:scale-110 flex items-center justify-center overflow-hidden"
 :style="{ backgroundColor: form.launcher_icon_color || '#ffffff' }" >
 <div v-if="!form.launcher_icon_color" class="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm">
 <span class="text-[8px] font-bold text-foreground ">AUTO</span>
 </div>
 </div>
 </div>
 <div class="flex-1">
 <div class="flex items-center justify-between">
 <input
 v-model="form.launcher_icon_color"
 @input="form.chat_icon_color = form.launcher_icon_color"
 type="text"
 maxlength="7"
 class="w-full bg-transparent text-foreground font-mono text-xs focus:outline-none "
 placeholder="AUTO"
 />
 <button
 v-if="form.launcher_icon_color"
 @click="form.launcher_icon_color = ''; form.chat_icon_color = ''"
 class="text-[8px] font-bold text-primary hover:underline "
 >
 Reset
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

 <!-- Widget Icon -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">Widget Icon (Launcher & Chat)</label>
 <div class="grid grid-cols-5 gap-3">
 <button
 v-for="item in launcherIcons"
 :key="item.name"
 @click="form.launcher_icon = item.name; form.chat_icon = item.name"
 :class="[
 'p-3 rounded-[0.39rem] border transition-all flex items-center justify-center',
 form.launcher_icon === item.name
 ? 'bg-primary/10 border-primary/40 text-primary'
 : 'bg-foreground/[0.02] border-foreground/5 text-foreground/50 hover:border-foreground/10'
 ]"
 >
 <component :is="item.icon" class="w-5 h-5" />
 </button>
 </div>
 </div>

 <!-- Launcher Style -->
 <div class="space-y-3">
 <label class="block text-xs font-semibold text-foreground/50">Launcher Button Shape</label>
 <div class="grid grid-cols-2 gap-3">
 <button
 v-for="style in launcherStyles"
 :key="style.value"
 @click="form.launcher_style = style.value"
 :class="[
 'p-3 rounded-[0.39rem] border text-xs font-bold transition-all',
 form.launcher_style === style.value
 ? 'bg-primary/10 border-primary/40 text-primary'
 : 'bg-foreground/[0.02] border-foreground/5 text-foreground/50 hover:border-foreground/10'
 ]"
 >
 <div class="mb-2 h-8 flex items-center justify-center">
 <div class="w-6 h-6 border-2"
 :style="{
 borderColor: form.launcher_style === style.value ? form.primary_color : '#444',
 borderRadius: style.value === 'circle' ? '50%' : style.value === 'square' ? '0px' : style.value === 'rounded-square' ? '6px' : '9999px'
 }"
 />
 </div>
 {{ style.label }}
 </button>
 </div>
 </div>
 </div>
 </section>
 </div>

 <!-- Right: Live Preview (4/12) -->
 <div class="lg:col-span-4 sticky top-5 sm:p-6">
 <div class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <div class="flex items-center justify-between mb-5">
 <h3 class="text-xs font-semibold text-foreground/50 ">Live Preview</h3>
 <a :href="`/widget/${chatbotId}`" target="_blank" class="p-2 hover:bg-foreground/5 rounded-[0.39rem] transition-all text-foreground/50 hover:text-primary" title="Open Full Preview">
 <ExternalLink class="w-4 h-4" />
 </a>
 </div>

 <!-- Mockup Widget -->
 <div
 class="relative rounded-[0.39rem] overflow-hidden shadow-xl border border-white/10"
 :style="{ backgroundColor: form.secondary_color }"
 >
 <!-- Widget Header -->
 <div class="px-5 py-4 flex items-center gap-3"
 :style="{ backgroundColor: form.primary_color + '18', borderBottom: `1px solid ${form.primary_color}30` }">
 <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
 :style="{ backgroundColor: form.primary_color, color: form.secondary_color }">
 AI
 </div>
 <div>
 <p class="text-xs font-semibold text-foreground">{{ form.name || 'Your assistant' }}</p>
 <div class="flex items-center gap-1.5 mt-0.5">
 <div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
 <span class="text-xs text-green-400 font-bold ">Online</span>
 </div>
 </div>
 </div>

 <!-- Messages -->
 <div class="p-4 space-y-3 min-h-[180px]">
 <!-- Welcome / Bot message -->
 <div class="flex gap-2 items-end">
 <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold"
 :style="{ backgroundColor: form.primary_color, color: form.secondary_color }">
 AI
 </div>
 <div class="max-w-[75%] px-3 py-2 text-xs text-foreground/80 leading-relaxed"
 :style="{
 backgroundColor: form.primary_color + '22',
 border: `1px solid ${form.primary_color}30`,
 borderRadius: bubbleRadius,
 }">
 {{ form.welcome_message }}
 </div>
 </div>

 <!-- User message -->
 <div class="flex gap-2 items-end justify-end">
 <div class="max-w-[75%] px-3 py-2 text-xs text-black font-bold leading-relaxed"
 :style="{
 backgroundColor: form.primary_color,
 borderRadius: bubbleRadius,
 }">
 Hi, can you help me?
 </div>
 </div>

 <!-- Bot reply -->
 <div class="flex gap-2 items-end">
 <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold"
 :style="{ backgroundColor: form.primary_color, color: form.secondary_color }">
 AI
 </div>
 <div class="max-w-[75%] px-3 py-2 text-xs text-foreground/80 leading-relaxed"
 :style="{
 backgroundColor: form.primary_color + '22',
 border: `1px solid ${form.primary_color}30`,
 borderRadius: bubbleRadius,
 }">
 Of course! I'm {{ form.name || 'your AI assistant' }}. What do you need?
 </div>
 </div>
 </div>

 <!-- Input Bar -->
 <div class="px-4 py-3 flex items-center gap-2"
 :style="{ borderTop: `1px solid ${form.primary_color}20` }">
 <div class="flex-1 bg-foreground/5 rounded-[0.39rem] px-3 py-2 text-xs text-foreground/30">
 Type a message...
 </div>
 <div class="w-7 h-7 rounded-[0.39rem] flex items-center justify-center shrink-0"
 :style="{ backgroundColor: form.primary_color }">
 <svg class="w-3 h-3" :style="{ fill: form.secondary_color }" viewBox="0 0 24 24">
 <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
 </svg>
 </div>
 </div>

 <!-- Powered by tag -->
 <div class="text-center py-2 border-t border-white/5">
 <span class="text-[8px] text-foreground/30 font-bold">Powered by ReplySuite</span>
 </div>
 </div>

 <!-- Position indicator -->
 <div class="mt-4 p-4 bg-foreground/[0.02] rounded-[0.39rem] border border-foreground/5 space-y-4">
 <div class="flex items-center justify-between">
 <p class="text-xs text-foreground/50 font-bold">Position</p>
 <div class="flex items-center gap-1.5">
 <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: form.primary_color }" />
 <span class="text-xs text-foreground font-bold ">{{ form.widget_position }}</span>
 </div>
 </div>

 <div class="flex items-center justify-between">
 <p class="text-xs text-foreground/50 font-bold">Launcher Preview</p>
 <div
 class="w-7 h-7 flex items-center justify-center shadow-lg transition-all duration-300"
 :style="{
 backgroundColor: form.launcher_color,
 borderRadius: form.launcher_style === 'circle' ? '50%' : form.launcher_style === 'square' ? '0px' : form.launcher_style === 'rounded-square' ? '10px' : '9999px'
 }"
 >
 <component
 :is="launcherIcons.find(i => i.name === form.launcher_icon)?.icon || MessageSquare"
 class="w-5 h-5"
 :style="{ color: form.launcher_icon_color || ((parseInt(form.launcher_color.slice(1,3), 16) * 299 + parseInt(form.launcher_color.slice(3,5), 16) * 587 + parseInt(form.launcher_color.slice(5,7), 16) * 114) / 1000 > 125 ? '#000' : '#fff') }"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <!-- ─── CONVERSATION TAB ─────────────────────────────────── -->
 <div v-else-if="activeTab === 'conversation'" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
 <div class="lg:col-span-8 space-y-5">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Reply Style</h3>
 <div class="grid md:grid-cols-3 gap-4">
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Tone</label>
 <select v-model="form.tools_config.conversation_settings.tone" class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50">
 <option value="friendly">Friendly</option>
 <option value="professional">Professional</option>
 <option value="warm">Warm</option>
 <option value="direct">Direct</option>
 </select>
 </div>
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Response Length</label>
 <select v-model="form.tools_config.conversation_settings.responseLength" class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50">
 <option value="short">Short</option>
 <option value="balanced">Balanced</option>
 <option value="detailed">Detailed</option>
 </select>
 </div>
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Lead Capture</label>
 <select v-model="form.tools_config.conversation_settings.leadCaptureMode" class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50">
 <option value="off">Off</option>
 <option value="when-needed">When Needed</option>
 <option value="always">Always</option>
 </select>
 </div>
 </div>
 </section>

 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Conversation Flow</h3>
 <div class="grid md:grid-cols-2 gap-4">
 <button @click="form.tools_config.conversation_settings.greetOncePerSession = !form.tools_config.conversation_settings.greetOncePerSession" :class="['p-5 rounded-[0.39rem] border text-left transition-all', form.tools_config.conversation_settings.greetOncePerSession ? 'bg-primary/10 border-primary/30' : 'bg-foreground/5 border-foreground/10']">
 <p class="text-xs font-semibold text-foreground mb-1">Greet once per session</p>
 <p class="text-xs text-foreground/50 ">Avoid restarting the conversation after it has already begun.</p>
 </button>
 <button @click="form.tools_config.conversation_settings.avoidRepeatingQuestions = !form.tools_config.conversation_settings.avoidRepeatingQuestions" :class="['p-5 rounded-[0.39rem] border text-left transition-all', form.tools_config.conversation_settings.avoidRepeatingQuestions ? 'bg-primary/10 border-primary/30' : 'bg-foreground/5 border-foreground/10']">
 <p class="text-xs font-semibold text-foreground mb-1">Avoid repeated questions</p>
 <p class="text-xs text-foreground/50 ">Do not ask for the same detail again when it is already known.</p>
 </button>
 <button @click="form.tools_config.conversation_settings.askOneQuestionAtATime = !form.tools_config.conversation_settings.askOneQuestionAtATime" :class="['p-5 rounded-[0.39rem] border text-left transition-all', form.tools_config.conversation_settings.askOneQuestionAtATime ? 'bg-primary/10 border-primary/30' : 'bg-foreground/5 border-foreground/10']">
 <p class="text-xs font-semibold text-foreground mb-1">Ask one question at a time</p>
 <p class="text-xs text-foreground/50 ">Keep follow-up simple instead of stacking multiple requests at once.</p>
 </button>
 <button @click="form.tools_config.conversation_settings.continueFromPreviousAnswer = !form.tools_config.conversation_settings.continueFromPreviousAnswer" :class="['p-5 rounded-[0.39rem] border text-left transition-all', form.tools_config.conversation_settings.continueFromPreviousAnswer ? 'bg-primary/10 border-primary/30' : 'bg-foreground/5 border-foreground/10']">
 <p class="text-xs font-semibold text-foreground mb-1">Continue from prior answer</p>
 <p class="text-xs text-foreground/50 ">Treat short customer replies as answers to the last question and move forward.</p>
 </button>
 </div>
 </section>

 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Channel Behavior</h3>
 <div class="grid md:grid-cols-2 gap-4">
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">Website Chat Style</label>
 <select v-model="form.tools_config.conversation_settings.websiteReplyStyle" class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50">
 <option value="guided">Guided</option>
 <option value="balanced">Balanced</option>
 </select>
 </div>
 <div>
 <label class="block text-xs font-semibold text-foreground/50 mb-3">WhatsApp Reply Style</label>
 <select v-model="form.tools_config.conversation_settings.whatsappReplyStyle" class="w-full bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50">
 <option value="short">Short</option>
 <option value="balanced">Balanced</option>
 </select>
 </div>
 </div>
 </section>
 </div>

 <div class="lg:col-span-4 space-y-6">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Memory</h3>
 <div class="space-y-4">
 <button @click="form.tools_config.conversation_settings.sessionMemoryEnabled = !form.tools_config.conversation_settings.sessionMemoryEnabled" :class="['w-full p-4 rounded-[0.39rem] border transition-all flex items-center justify-between text-left', form.tools_config.conversation_settings.sessionMemoryEnabled ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-foreground/5 border-foreground/5 text-foreground/50']">
 <div>
 <p class="text-xs font-semibold mb-1">Session Memory</p>
 <p class="text-xs opacity-60">Remember what was already said inside the active conversation.</p>
 </div>
 <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.tools_config.conversation_settings.sessionMemoryEnabled ? 'bg-primary' : 'bg-foreground/10']">
 <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.tools_config.conversation_settings.sessionMemoryEnabled ? 'translate-x-5' : 'translate-x-0']" />
 </div>
 </button>

 <button @click="form.tools_config.conversation_settings.contactMemoryEnabled = !form.tools_config.conversation_settings.contactMemoryEnabled" :class="['w-full p-4 rounded-[0.39rem] border transition-all flex items-center justify-between text-left', form.tools_config.conversation_settings.contactMemoryEnabled ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-foreground/5 border-foreground/5 text-foreground/50']">
 <div>
 <p class="text-xs font-semibold mb-1">Returning Contact Memory</p>
 <p class="text-xs opacity-60">Remember useful context for repeat contacts across sessions, especially on WhatsApp.</p>
 </div>
 <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.tools_config.conversation_settings.contactMemoryEnabled ? 'bg-primary' : 'bg-foreground/10']">
 <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.tools_config.conversation_settings.contactMemoryEnabled ? 'translate-x-5' : 'translate-x-0']" />
 </div>
 </button>
 </div>
 </section>

 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 border-foreground/10 bg-foreground/[0.02]">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">How this helps</h3>
 <div class="space-y-3 text-xs text-foreground/50 leading-relaxed font-bold">
 <p>- Stops repeated greetings</p>
 <p>- Reduces asking the same question twice</p>
 <p>- Makes WhatsApp follow-ups feel more natural</p>
 <p>- Keeps replies better aligned with your support style</p>
 </div>
 </section>
 </div>
 </div>

 <!-- ─── TOOLS TAB ─────────────────────────────────────────── -->
 <div v-else-if="activeTab === 'tools'" class="space-y-10">
 <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
 <div class="lg:col-span-8 space-y-5">

 <!-- Tool Selection -->
 <ToolSelector
 v-model="form.enabled_tools"
 :is-premium="canUseAiTools"
 @save="handleSave"
 />

 </div>

 <div class="lg:col-span-4 space-y-6">
 <!-- Mobile Payment Configuration -->
 <MobilePaymentConfig
 v-if="form.enabled_tools.includes('payments')"
 v-model="form.tools_config"
 :chatbot-id="chatbotId"
 />

 <!-- Stats & Insights -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Intelligence Overlook</h3>
 <div class="space-y-5">
 <div class="p-5 rounded-[0.39rem] bg-foreground/[0.01] border border-foreground/5 flex items-center justify-between">
 <div class="flex items-center gap-3">
 <Zap class="w-5 h-5 text-foreground/50" />
 <p class="text-xs font-semibold text-foreground/50 ">Tools Enabled</p>
 </div>
 <p class="text-xl font-bold text-foreground">{{ form.enabled_tools.length }}</p>
 </div>
 </div>
 </section>
 </div>
 </div>
 </div>

 <!-- ─── SKILLS TAB ────────────────────────────────────────── -->
 <div v-else-if="activeTab === 'skills'" class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
 <div class="lg:col-span-8 space-y-5">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6 text-center py-12">
 <div class="w-14 h-14 bg-primary/10 rounded-[0.39rem] flex items-center justify-center mx-auto mb-4">
 <Sparkles class="w-7 h-7 text-primary" />
 </div>
 <h3 class="text-xl font-bold text-foreground mb-4 italic-none">Skills</h3>
 <p class="text-xs text-foreground/50 max-w-md mx-auto leading-relaxed font-bold">
 Skills help your assistant handle specialized tasks and stay aligned with your business use case.
 </p>
 <div class="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
 <NuxtLink
 :to="`/dashboard/agents/skills?id=${chatbotId}`"
 class="inline-flex items-center justify-center gap-3 rounded-[0.39rem] bg-primary px-6 py-4 text-xs font-semibold text-black transition-all hover:opacity-90"
 >
 <Sparkles class="w-4 h-4" />
 Open Skills Directory
 </NuxtLink>
 <NuxtLink
 :to="`/dashboard/agents/tools?id=${chatbotId}`"
 class="inline-flex items-center justify-center gap-3 rounded-[0.39rem] border border-foreground/10 bg-foreground/5 px-6 py-4 text-xs font-semibold text-foreground/65 transition-all hover:bg-foreground/10 hover:text-foreground"
 >
 <Calendar class="w-4 h-4 text-primary" />
 Open Tools
 </NuxtLink>
 </div>
 </section>
 </div>

 <div class="lg:col-span-4 space-y-6">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <h3 class="text-xs font-bold text-foreground/60 mb-4">Knowledge Base</h3>
 <p class="text-xs text-foreground/40 leading-relaxed mb-4">
 Looking to train your assistant with custom data? Visit the Train Your AI area.
 </p>
 <NuxtLink
 :to="`/dashboard/agents/skills/training?id=${chatbotId}`"
 class="w-full py-4 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-[0.39rem] flex items-center justify-center gap-3 transition-all group"
 >
 <Database class="w-4 h-4 text-primary" />
 <span class="text-xs font-semibold text-foreground/60 group-hover:text-foreground">Open Train Your AI</span>
 </NuxtLink>
 </section>
 </div>
 </div>
 <!-- ─── SECURITY TAB ────────────────────────────────────────── -->
 <div v-else-if="activeTab === 'security'" class="max-w-3xl space-y-5">
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6">
 <div class="flex items-center gap-4 mb-4">
 <div class="p-3 rounded-[0.39rem] bg-primary/10 border border-primary/20">
 <Shield class="w-6 h-6 text-primary" />
 </div>
 <div>
 <h3 class="text-lg font-bold text-foreground ">Domain Whitelisting</h3>
 <p class="text-xs text-foreground/50 mt-1">Prevent unauthorized websites from embedding your widget</p>
 </div>
 </div>

 <div class="space-y-6">
 <div class="p-5 rounded-[0.39rem] bg-foreground/[0.01] border border-foreground/5 space-y-4">
 <div class="flex items-start gap-4">
 <Info class="w-4 h-4 text-primary shrink-0 mt-1" />
 <div class="space-y-2">
 <p class="text-xs font-bold text-foreground ">Security Protocol</p>
 <p class="text-xs text-foreground/50 leading-relaxed ">
 Once you add approved domains, all other origins are blocked. Localhost stays available for testing until this connection is active and you decide to disable it.
 </p>
 <p class="text-xs text-primary/80 leading-relaxed ">
 Current plan limit: {{ maxWebsiteDomains }} website domain{{ maxWebsiteDomains === 1 ? '' : 's' }} per assistant.
 </p>
 </div>
 </div>
 </div>

 <div class="space-y-4">
 <label class="block text-xs font-semibold text-foreground/50">Authorized Origins</label>

 <div class="space-y-3">
 <div
 v-for="(domain, index) in form.allowed_domains"
 :key="index"
 class="flex items-center gap-3 p-3 bg-foreground/5 border border-foreground/10 rounded-[0.39rem] group"
 >
 <Globe class="w-4 h-4 text-foreground/50" />
 <span class="flex-1 text-xs text-foreground">{{ domain }}</span>
 <button
 @click="form.allowed_domains.splice(index, 1)"
 class="p-2 text-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
 >
 <Trash2 class="w-4 h-4" />
 </button>
 </div>

 <div class="flex items-center gap-3 mt-4">
 <input
 type="text"
 v-model="newDomainInput"
 class="flex-1 bg-foreground/5 border border-foreground/10 rounded-[0.39rem] px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-xs placeholder:text-foreground/50"
 placeholder="e.g. example.com"
 @keypress.enter.prevent="addAllowedDomain"
 />
 <button
 @click="addAllowedDomain"
 :disabled="form.allowed_domains.length >= maxWebsiteDomains"
 class="px-5 py-3 bg-foreground/5 border border-foreground/10 text-foreground rounded-[0.39rem] font-bold text-xs hover:bg-foreground/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Add Domain
 </button>
 </div>
 <div class="flex items-center justify-between gap-4 p-4 mt-4 rounded-[0.39rem] bg-foreground/[0.02] border border-foreground/10">
 <div>
 <p class="text-xs font-bold text-foreground ">Localhost Testing</p>
 <p class="text-xs text-foreground/50 mt-1">
 {{ canDisableLocalhostTesting ? 'Disable localhost after launch if you want production-only enforcement.' : 'Localhost remains enabled until the website connection is active.' }}
 </p>
 </div>
 <button
 @click="canDisableLocalhostTesting ? (form.allow_localhost_testing = !form.allow_localhost_testing) : null"
 :class="[
 'w-12 h-7 rounded-full p-1 transition-colors',
 form.allow_localhost_testing ? 'bg-primary' : 'bg-foreground/10',
 !canDisableLocalhostTesting ? 'opacity-60 cursor-not-allowed' : ''
 ]"
 >
 <div :class="['w-5 h-5 rounded-full bg-white transition-all', form.allow_localhost_testing ? 'translate-x-5' : 'translate-x-0']" />
 </button>
 </div>
 </div>
 </div>
 </div>
 </section>

 <!-- Advanced Options -->
 <section class="rounded-[0.39rem] border border-foreground/10 bg-background-card/45 shadow-sm shadow-black/5 p-5 sm:p-6 opacity-50 grayscale pointer-events-none">
 <h3 class="text-xs font-semibold text-foreground/50 mb-4 flex items-center gap-2">
 Advanced Security <span class="bg-primary/20 text-primary px-2 py-0.5 rounded text-[8px]">PRO</span>
 </h3>
 <div class="space-y-4">
 <div class="flex items-center justify-between p-4 rounded-[0.39rem] bg-foreground/[0.01] border border-foreground/5">
 <div>
 <p class="text-xs font-bold text-foreground">Rate Limiting</p>
 <p class="text-xs text-foreground/50 ">Limit requests per session</p>
 </div>
 <div class="w-10 h-5 bg-foreground/10 rounded-full relative p-1">
 <div class="w-3 h-3 bg-foreground/20 rounded-full" />
 </div>
 </div>
 <div class="flex items-center justify-between p-4 rounded-[0.39rem] bg-foreground/[0.01] border border-foreground/5">
 <div>
 <p class="text-xs font-bold text-foreground">Data Anonymization</p>
 <p class="text-xs text-foreground/50 ">Strip PII from chat history</p>
 </div>
 <div class="w-10 h-5 bg-foreground/10 rounded-full relative p-1">
 <div class="w-3 h-3 bg-foreground/20 rounded-full" />
 </div>
 </div>
 </div>
 </section>
 </div>

 </div>
</template>

<style scoped>
</style>
