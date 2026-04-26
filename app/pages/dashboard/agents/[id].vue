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
  ShoppingBag,
  CreditCard,
  Calendar,
  FileSpreadsheet,
  Plus
} from 'lucide-vue-next'
import CustomSelect from '~~/app/components/CustomSelect.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: computed(() => agent.value?.name ? `${agent.value.name} | Agent Settings` : 'Agent Settings | ReplySuite'),
})

const route = useRoute()
const chatbotId = route.params.id as string
const { userId } = useAuth()
const supabase = useSupabaseClient()
const router = useRouter()
const notify = useNotify()

// State
const isLoading = ref(true)
const isSaving = ref(false)
const agent = ref<any>(null)
const activeTab = ref<'identity' | 'design' | 'security' | 'tools'>('identity')
const newDomainInput = ref<string>('')

const launcherIcons = [
  { name: 'Bot', icon: Bot, label: 'Robot' },
  { name: 'MessageSquare', icon: MessageSquare, label: 'Message' },
  { name: 'Sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'Zap', icon: Zap, label: 'Lightning' },
  { name: 'HelpCircle', icon: Info, label: 'Help' }
]

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
  ai_disclosure: true,
  launcher_color: '#D4AF37',
  launcher_icon: 'MessageSquare',
  launcher_style: 'circle',
  launcher_icon_color: '',
  chat_icon: 'Bot',
  chat_icon_color: '',
  enabled_tools: [] as string[],
  tools_config: {} as any,
})

const languageOptions = [
  { label: 'Kinyarwanda', value: 'Kinyarwanda' },
  { label: 'English', value: 'English' },
  { label: 'French', value: 'French' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Kirundi', value: 'Kirundi' },
  { label: 'Swahili', value: 'Swahili' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'Portuguese', value: 'Portuguese' },
  { label: 'German', value: 'German' },
]

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
        default_language: data.default_language || 'English',
        primary_color: data.primary_color || '#D4AF37',
        secondary_color: data.secondary_color || '#1a1a1a',
        chat_bubble_style: data.chat_bubble_style || 'rounded',
        widget_position: data.widget_position || 'bottom-right',
        welcome_message: data.welcome_message || 'Hello! How can I help you today?',
        allowed_domains: data.allowed_domains || [],
        ai_disclosure: data.ai_disclosure ?? true,
        launcher_color: data.launcher_color || data.primary_color || '#D4AF37',
        launcher_icon: data.launcher_icon || 'MessageSquare',
        launcher_style: data.launcher_style || 'circle',
        launcher_icon_color: data.launcher_icon_color || '',
        chat_icon: data.chat_icon || 'Bot',
        chat_icon_color: data.chat_icon_color || '',
        enabled_tools: data.enabled_tools || [],
        tools_config: data.tools_config || {},
      }
      if (activeTab.value === 'tools') fetchCatalog()
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
  if (route.query.tab && ['identity', 'design', 'security'].includes(route.query.tab as string)) {
    activeTab.value = route.query.tab as any
  }
  
  await fetchData()
})

// Save
const handleSave = async () => {
  if (!chatbotId || isSaving.value) return
  isSaving.value = true
  try {
    const { error } = await supabase
      .from('chatbots')
      .update({
        name: form.value.name,
        system_prompt: form.value.system_prompt,
        is_public: form.value.is_public,
        default_language: form.value.default_language,
        primary_color: form.value.primary_color,
        secondary_color: form.value.secondary_color,
        chat_bubble_style: form.value.chat_bubble_style,
        widget_position: form.value.widget_position,
        welcome_message: form.value.welcome_message,
        allowed_domains: form.value.allowed_domains,
        ai_disclosure: form.value.ai_disclosure,
        launcher_color: form.value.launcher_color,
        launcher_icon: form.value.launcher_icon,
        launcher_style: form.value.launcher_style,
        launcher_icon_color: form.value.launcher_icon_color,
        chat_icon: form.value.chat_icon,
        chat_icon_color: form.value.chat_icon_color,
        enabled_tools: form.value.enabled_tools,
        tools_config: form.value.tools_config,
      })
      .eq('id', chatbotId)

    if (error) throw error
    agent.value = { ...agent.value, ...form.value }
    notify.success('Agent settings saved successfully.')
  } catch (err) {
    console.error('Error saving settings:', err)
    notify.error('Failed to save changes.')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async () => {
  if (!(await notify.confirm('Are you sure you want to delete this agent? This cannot be undone.'))) return
  try {
    const { error } = await supabase
      .from('chatbots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', chatbotId)
    if (error) throw error
    notify.success('Agent decommissioned successfully.')
    router.push('/dashboard/agents')
  } catch (err) {
    notify.error('Failed to delete agent.')
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

const { planSlug } = useAuth()
const isPremium = computed(() => ['silver', 'gold'].includes(planSlug.value || ''))

const launcherStyles = [
  { label: 'Circle', value: 'circle' },
  { label: 'Square', value: 'square' },
  { label: 'Rounded', value: 'rounded-square' },
  { label: 'Pill', value: 'pill' },
]

// Tools & Catalog Logic
const catalog = ref<any[]>([])
const isCatalogLoading = ref(false)
const fetchCatalog = async () => {
  if (!chatbotId) return
  isCatalogLoading.value = true
  const { data } = await supabase
    .from('chatbot_catalog')
    .select('*')
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false })
  catalog.value = data || []
  isCatalogLoading.value = false
}

const newProduct = ref({ name: '', description: '', price: 0, category: '' })
const isAddingProduct = ref(false)
const handleAddProduct = async () => {
  if (!newProduct.value.name || newProduct.value.price <= 0) return
  isAddingProduct.value = true
  try {
    const { data, error } = await supabase
      .from('chatbot_catalog')
      .insert([{
        chatbot_id: chatbotId,
        name: newProduct.value.name,
        description: newProduct.value.description,
        price: newProduct.value.price,
        category: newProduct.value.category
      }])
      .select()
      .single()
    if (error) throw error
    catalog.value.unshift(data)
    newProduct.value = { name: '', description: '', price: 0, category: '' }
    notify.success('Product added to catalog.')
  } catch (err) {
    notify.error('Failed to add product.')
  } finally {
    isAddingProduct.value = false
  }
}

const removeProduct = async (id: string) => {
  if (!(await notify.confirm('Remove this product?'))) return
  const { error } = await supabase.from('chatbot_catalog').delete().eq('id', id)
  if (!error) {
    catalog.value = catalog.value.filter(p => p.id !== id)
    notify.success('Product removed.')
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'tools') fetchCatalog()
})
</script>

<template>
  <div class="max-w-[1400px] mx-auto space-y-8 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink 
          to="/dashboard/agents"
          class="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-gray-500 hover:text-white"
        >
          <ArrowLeft class="w-5 h-5" />
        </NuxtLink>
        <div>
          <h2 class="text-xl font-bold tracking-tight text-white mb-1 uppercase">Agent Intelligence</h2>
          <div v-if="agent" class="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px]">
            <Bot class="w-3.5 h-3.5" />
            <span>{{ agent.name }}</span>
          </div>
        </div>
      </div>

      <button 
        @click="handleSave"
        :disabled="isSaving || isLoading"
        class="flex items-center gap-2 px-7 py-3 bg-primary text-black font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 text-[11px] uppercase tracking-widest"
      >
        <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
        <Save v-else class="w-4 h-4" />
        Save Changes
      </button>
    </div>

    <!-- Tab Switcher -->
    <div class="flex gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
      <button
        v-for="tab in [
          { id: 'identity', label: 'Core Identity', icon: Bot }, 
          { id: 'design', label: 'Design & Colors', icon: Palette },
          { id: 'tools', label: 'Tools & Skills', icon: Zap },
          { id: 'security', label: 'Domain Security', icon: Shield }
        ]"
        :key="tab.id"
        @click="activeTab = tab.id as any"
        :class="[
          'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
          activeTab === tab.id
            ? 'bg-primary text-black shadow-lg shadow-primary/20'
            : 'text-gray-500 hover:text-white hover:bg-white/5'
        ]"
      >
        <component :is="tab.icon" class="w-3.5 h-3.5" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
    </div>

    <!-- ─── IDENTITY TAB ─────────────────────────────────────── -->
    <div v-else-if="activeTab === 'identity'" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div class="lg:col-span-8 space-y-8">

        <!-- Core Identity -->
        <section class="glass-card">
          <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-8">Core Identity</h3>
          <div class="space-y-6">
            <div>
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3">Agent Designation</label>
              <input 
                v-model="form.name"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors text-sm"
                placeholder="e.g. Sales Pilot"
              />
            </div>
            <div>
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3">Behavioral Protocol (System Prompt)</label>
              <textarea 
                v-model="form.system_prompt"
                rows="10"
                class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
                placeholder="Give your agent a personality, goals, and constraints..."
              />
              <div class="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
                <Info class="w-4 h-4 text-primary shrink-0" />
                <p class="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider">
                  This protocol overrides default behaviors. Define exactly how you want the AI to represent your brand.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="glass-card border-red-500/10 bg-red-500/[0.01]">
          <h3 class="text-[10px] font-bold text-red-500/50 tracking-widest uppercase mb-6">Critical Actions</h3>
          <div class="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p class="text-sm font-bold text-white mb-1">Decommission Agent</p>
              <p class="text-[10px] text-gray-500 uppercase tracking-widest">Permanently remove this intelligence from your fleet.</p>
            </div>
            <button 
              @click="handleDelete"
              class="px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
            >
              <Trash2 class="w-4 h-4 inline-block mr-1.5" />Delete
            </button>
          </div>
        </section>
      </div>

      <!-- Right Sidebar -->
      <div class="lg:col-span-4 space-y-6">

        <!-- Visibility Toggle -->
        <div class="glass-card">
          <div class="flex items-center justify-between mb-6">
            <h4 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Deployment Status</h4>
            <component :is="form.is_public ? Globe : Lock" class="w-4 h-4 text-primary opacity-50" />
          </div>
          <button 
            @click="form.is_public = !form.is_public"
            :class="[
              'w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left',
              form.is_public ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-gray-500'
            ]"
          >
            <div>
              <p class="text-[11px] font-bold uppercase tracking-widest mb-1">{{ form.is_public ? 'Public Mode Active' : 'Internal Only' }}</p>
              <p class="text-[9px] opacity-60">{{ form.is_public ? 'Token-free API access enabled.' : 'Authenticated access required.' }}</p>
            </div>
            <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.is_public ? 'bg-primary' : 'bg-gray-800']">
              <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.is_public ? 'translate-x-5' : 'translate-x-0']" />
            </div>
          </button>
          <p class="mt-4 text-[9px] text-gray-600 leading-relaxed uppercase tracking-wider">
            Public mode allows your agent to be embedded on websites via the integration snippet.
          </p>
        </div>

        <!-- Linguistic Engine -->
        <div class="glass-card">
          <div class="flex items-center justify-between mb-6">
            <h4 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Linguistic Engine</h4>
            <Globe class="w-4 h-4 text-primary opacity-50" />
          </div>
          <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">Default Language</label>
          <CustomSelect v-model="form.default_language" :options="languageOptions" placeholder="Select Language" />
          <p class="text-[9px] text-gray-500 leading-relaxed uppercase tracking-wider mt-4">
            Your agent will strictly adhere to this language for native interactions.
          </p>
        </div>

        <!-- Global Compliance -->
        <div class="glass-card">
          <div class="flex items-center justify-between mb-6">
            <h4 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Compliance (EU/Global)</h4>
            <ShieldCheck class="w-4 h-4 text-primary opacity-50" />
          </div>
          <button 
            @click="form.ai_disclosure = !form.ai_disclosure"
            :class="[
              'w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left',
              form.ai_disclosure ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/5 text-gray-500'
            ]"
          >
            <div>
              <p class="text-[11px] font-bold uppercase tracking-widest mb-1">AI Disclosure Label</p>
              <p class="text-[9px] opacity-60">{{ form.ai_disclosure ? 'Mandatory labeling active.' : 'Labeling disabled.' }}</p>
            </div>
            <div :class="['w-10 h-5 rounded-full relative transition-colors p-1', form.ai_disclosure ? 'bg-primary' : 'bg-gray-800']">
              <div :class="['w-3 h-3 bg-white rounded-full transition-all', form.ai_disclosure ? 'translate-x-5' : 'translate-x-0']" />
            </div>
          </button>
          <p class="mt-4 text-[9px] text-gray-600 leading-relaxed uppercase tracking-wider">
            In the EU and Brazil, AI-generated content must be identifiable. This toggle appends transparency metadata to all responses.
          </p>
        </div>

        <!-- Resource Summary -->
        <div class="glass-card">
          <h4 class="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-6">Resource Summary</h4>
          <div class="space-y-5">
            <div class="flex items-center gap-4">
              <div class="p-2 rounded-lg bg-white/5"><MessageSquare class="w-4 h-4 text-gray-500" /></div>
              <div>
                <p class="text-xs font-bold text-white">{{ agent?.session_count || 0 }} Conversations</p>
                <p class="text-[9px] text-gray-600 uppercase tracking-widest">Lifetime interactions</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="p-2 rounded-lg bg-white/5"><Shield class="w-4 h-4 text-gray-500" /></div>
              <div>
                <p class="text-xs font-bold text-white">Secure Vault</p>
                <p class="text-[9px] text-gray-600 uppercase tracking-widest">Encryption layer active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── DESIGN TAB ─────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'design'" class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

      <!-- Left: Controls (8/12) -->
      <div class="lg:col-span-8 space-y-8">

        <!-- Color Presets -->
        <section class="glass-card">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Color Presets</h3>
              <p class="text-[9px] text-gray-600 uppercase tracking-wider">Quick-apply brand palettes</p>
            </div>
            <button @click="resetDesign" class="flex items-center gap-1.5 text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors">
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
                'relative h-12 rounded-2xl border-2 transition-all overflow-hidden group',
                form.primary_color === preset.primary ? 'border-white/50 scale-105' : 'border-transparent hover:border-white/20'
              ]"
              :style="{ background: `linear-gradient(135deg, ${preset.secondary} 0%, ${preset.primary}40 100%)` }"
            >
              <div class="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border border-white/20" :style="{ backgroundColor: preset.primary }" />
              <span class="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/40 group-hover:text-white/80 transition-colors uppercase tracking-wider">
                {{ preset.name }}
              </span>
            </button>
          </div>
        </section>

        <!-- Custom Colors -->
        <section class="glass-card">
          <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-6">Custom Colors</h3>
          <div class="grid grid-cols-2 gap-5">
            <!-- Primary Color -->
            <div class="space-y-3">
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                <Pipette class="w-3 h-3 inline-block mr-1 text-primary" />Primary Color
              </label>
              <div class="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                <div class="relative">
                  <input
                    type="color"
                    v-model="form.primary_color"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-xl"
                  />
                  <div class="w-10 h-10 rounded-xl border-2 border-white/10 shadow-lg cursor-pointer transition-transform hover:scale-110"
                    :style="{ backgroundColor: form.primary_color }" />
                </div>
                <div class="flex-1">
                  <input
                    v-model="form.primary_color"
                    type="text"
                    maxlength="7"
                    class="w-full bg-transparent text-white font-mono text-xs focus:outline-none uppercase tracking-widest"
                    placeholder="#D4AF37"
                  />
                  <p class="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">Buttons, accents, links</p>
                </div>
              </div>
            </div>

            <!-- Secondary Color (Background) -->
            <div class="space-y-3">
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                <Pipette class="w-3 h-3 inline-block mr-1 text-gray-500" />Background Color
              </label>
              <div class="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                <div class="relative">
                  <input
                    type="color"
                    v-model="form.secondary_color"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-xl"
                  />
                  <div class="w-10 h-10 rounded-xl border-2 border-white/10 shadow-lg cursor-pointer transition-transform hover:scale-110"
                    :style="{ backgroundColor: form.secondary_color }" />
                </div>
                <div class="flex-1">
                  <input
                    v-model="form.secondary_color"
                    type="text"
                    maxlength="7"
                    class="w-full bg-transparent text-white font-mono text-xs focus:outline-none uppercase tracking-widest"
                    placeholder="#1a1a1a"
                  />
                  <p class="text-[8px] text-gray-600 uppercase tracking-wider mt-0.5">Widget background</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Style & Layout -->
        <section class="glass-card space-y-6">
          <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Style & Layout</h3>

          <!-- Bubble Style -->
          <div class="space-y-3">
            <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Chat Bubble Style</label>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="style in bubbleStyleOptions"
                :key="style.value"
                @click="form.chat_bubble_style = style.value"
                :class="[
                  'p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
                  form.chat_bubble_style === style.value
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:border-white/10'
                ]"
              >
                <div class="mb-2 h-5 flex items-center justify-center">
                  <div class="h-4 w-16 bg-white/10"
                    :style="{ borderRadius: style.value === 'pill' ? '9999px' : style.value === 'sharp' ? '2px' : '8px' }" />
                </div>
                {{ style.label.split(' ')[0] }}
              </button>
            </div>
          </div>

          <!-- Widget Position -->
          <div class="space-y-3">
            <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Widget Position</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="pos in positionOptions"
                :key="pos.value"
                @click="form.widget_position = pos.value"
                :class="[
                  'p-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2',
                  form.widget_position === pos.value
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:border-white/10'
                ]"
              >
                <!-- Mini screen mockup -->
                <div class="w-16 h-10 bg-white/5 rounded-lg relative border border-white/10">
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
            <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Welcome Message</label>
            <input
              v-model="form.welcome_message"
              class="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Hello! How can I help you today?"
            />
          </div>
        </section>

        <!-- Launcher Customization (Premium) -->
        <section class="glass-card relative overflow-hidden" :class="{ 'opacity-50 pointer-events-none': !isPremium }">
          <div v-if="!isPremium" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div class="p-3 bg-primary/20 rounded-2xl mb-3">
              <Lock class="w-6 h-6 text-primary" />
            </div>
            <p class="text-xs font-bold text-white uppercase tracking-widest">Premium Customization</p>
            <p class="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Upgrade to Silver or Gold to unlock</p>
          </div>

          <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-6 flex items-center justify-between">
            Launcher Customization
            <span v-if="isPremium" class="bg-primary/20 text-primary px-2 py-0.5 rounded text-[8px]">PREMIUM ACTIVE</span>
          </h3>

          <div class="space-y-8">
            <!-- Launcher Color -->
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                  <Pipette class="w-3 h-3 inline-block mr-1 text-primary" />Launcher Color
                </label>
                <div class="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <div class="relative">
                    <input
                      type="color"
                      v-model="form.launcher_color"
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-xl"
                    />
                    <div class="w-10 h-10 rounded-xl border-2 border-white/10 shadow-lg cursor-pointer transition-transform hover:scale-110"
                      :style="{ backgroundColor: form.launcher_color }" />
                  </div>
                  <div class="flex-1">
                    <input
                      v-model="form.launcher_color"
                      type="text"
                      maxlength="7"
                      class="w-full bg-transparent text-white font-mono text-xs focus:outline-none uppercase tracking-widest"
                      placeholder="#D4AF37"
                    />
                  </div>
                </div>
              </div>

              <!-- Launcher Icon Color -->
              <div class="space-y-3">
                <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                  <Pipette class="w-3 h-3 inline-block mr-1 text-primary" />Icon Color
                </label>
                <div class="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <div class="relative">
                    <input
                      type="color"
                      v-model="form.launcher_icon_color"
                      @input="form.chat_icon_color = form.launcher_icon_color"
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-xl"
                    />
                    <div class="w-10 h-10 rounded-xl border-2 border-white/10 shadow-lg cursor-pointer transition-transform hover:scale-110 flex items-center justify-center overflow-hidden"
                      :style="{ backgroundColor: form.launcher_icon_color || '#ffffff' }" >
                      <div v-if="!form.launcher_icon_color" class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                        <span class="text-[8px] font-black text-white uppercase">AUTO</span>
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
                        class="w-full bg-transparent text-white font-mono text-xs focus:outline-none uppercase tracking-widest"
                        placeholder="AUTO"
                      />
                      <button 
                        v-if="form.launcher_icon_color" 
                        @click="form.launcher_icon_color = ''; form.chat_icon_color = ''"
                        class="text-[8px] font-bold text-primary hover:underline uppercase"
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
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Widget Icon (Launcher & Chat)</label>
              <div class="grid grid-cols-5 gap-3">
                <button
                  v-for="item in launcherIcons"
                  :key="item.name"
                  @click="form.launcher_icon = item.name; form.chat_icon = item.name"
                  :class="[
                    'p-3 rounded-xl border transition-all flex items-center justify-center',
                    form.launcher_icon === item.name
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:border-white/10'
                  ]"
                >
                  <component :is="item.icon" class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Launcher Style -->
            <div class="space-y-3">
              <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Launcher Button Shape</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="style in launcherStyles"
                  :key="style.value"
                  @click="form.launcher_style = style.value"
                  :class="[
                    'p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
                    form.launcher_style === style.value
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:border-white/10'
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
      <div class="lg:col-span-4 sticky top-10">
        <div class="glass-card">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Live Preview</h3>
              <a :href="`/widget/${chatbotId}`" target="_blank" class="p-2 hover:bg-white/5 rounded-lg transition-all text-gray-500 hover:text-primary" title="Open Full Preview">
                <ExternalLink class="w-4 h-4" />
              </a>
            </div>

            <!-- Mockup Widget -->
            <div
              class="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              :style="{ backgroundColor: form.secondary_color }"
            >
              <!-- Widget Header -->
              <div class="px-5 py-4 flex items-center gap-3"
                :style="{ backgroundColor: form.primary_color + '18', borderBottom: `1px solid ${form.primary_color}30` }">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                  :style="{ backgroundColor: form.primary_color, color: form.secondary_color }">
                  AI
                </div>
                <div>
                  <p class="text-[11px] font-black text-white">{{ form.name || 'Your Agent' }}</p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span class="text-[9px] text-green-400 font-bold uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>

              <!-- Messages -->
              <div class="p-4 space-y-3 min-h-[180px]">
                <!-- Welcome / Bot message -->
                <div class="flex gap-2 items-end">
                  <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black"
                    :style="{ backgroundColor: form.primary_color, color: form.secondary_color }">
                    AI
                  </div>
                  <div class="max-w-[75%] px-3 py-2 text-[10px] text-white/90 leading-relaxed"
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
                  <div class="max-w-[75%] px-3 py-2 text-[10px] text-black font-bold leading-relaxed"
                    :style="{
                      backgroundColor: form.primary_color,
                      borderRadius: bubbleRadius,
                    }">
                    Hi, can you help me?
                  </div>
                </div>

                <!-- Bot reply -->
                <div class="flex gap-2 items-end">
                  <div class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black"
                    :style="{ backgroundColor: form.primary_color, color: form.secondary_color }">
                    AI
                  </div>
                  <div class="max-w-[75%] px-3 py-2 text-[10px] text-white/90 leading-relaxed"
                    :style="{
                      backgroundColor: form.primary_color + '22',
                      border: `1px solid ${form.primary_color}30`,
                      borderRadius: bubbleRadius,
                    }">
                    Of course! I'm {{ form.name || 'your AI agent' }}. What do you need?
                  </div>
                </div>
              </div>

              <!-- Input Bar -->
              <div class="px-4 py-3 flex items-center gap-2"
                :style="{ borderTop: `1px solid ${form.primary_color}20` }">
                <div class="flex-1 bg-white/5 rounded-xl px-3 py-2 text-[10px] text-gray-600">
                  Type a message...
                </div>
                <div class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  :style="{ backgroundColor: form.primary_color }">
                  <svg class="w-3 h-3" :style="{ fill: form.secondary_color }" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </div>
              </div>

              <!-- Powered by tag -->
              <div class="text-center py-2 border-t border-white/5">
                <span class="text-[8px] text-gray-700 uppercase tracking-widest font-bold">Powered by ReplySuite</span>
              </div>
            </div>

            <!-- Position indicator -->
            <div class="mt-4 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06] space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-[9px] text-gray-600 uppercase tracking-widest font-black">Position</p>
                <div class="flex items-center gap-1.5">
                  <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: form.primary_color }" />
                  <span class="text-[9px] text-white font-black uppercase tracking-wider">{{ form.widget_position }}</span>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <p class="text-[9px] text-gray-600 uppercase tracking-widest font-black">Launcher Preview</p>
                <div 
                  class="w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-300"
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

    <!-- ─── TOOLS TAB ─────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'tools'" class="space-y-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div class="lg:col-span-8 space-y-8">
            
            <!-- Tool Selection -->
            <section class="glass-card">
              <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-8">Agent Capabilities (Tools)</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-for="tool in [
                    { id: 'orders', name: 'Order Management', desc: 'Allow users to browse catalog and place orders.', icon: ShoppingBag, pro: true },
                    { id: 'appointments', name: 'Appointment Setter', desc: 'Schedule meetings and consultations.', icon: Calendar, pro: true },
                    { id: 'payments', name: 'MTN/Airtel Payments', desc: 'Accept local payments via Paypack.', icon: CreditCard, pro: true },
                    { id: 'invoices', name: 'Automated Invoices', desc: 'Generate printable web invoices.', icon: FileSpreadsheet, pro: true },
                ]" :key="tool.id" 
                @click="() => {
                    if (tool.pro && !isPremium) {
                        return 
                    }
                    const idx = form.enabled_tools.indexOf(tool.id)
                    if (idx > -1) form.enabled_tools.splice(idx, 1)
                    else form.enabled_tools.push(tool.id)
                    handleSave()
                }"
                :class="[
                    'p-5 rounded-2xl border transition-all group relative',
                    (tool.pro && !isPremium) ? 'opacity-50 grayscale cursor-not-allowed border-white/5' : 'cursor-pointer',
                    form.enabled_tools.includes(tool.id) ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:border-white/10'
                ]">
                    <!-- Pro Badge -->
                    <div v-if="tool.pro && !isPremium" class="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                        <Lock class="w-2.5 h-2.5 text-yellow-500" />
                        <span class="text-[8px] font-bold text-white uppercase tracking-tighter">Pro Only</span>
                    </div>

                    <div class="flex items-center gap-4">
                        <div :class="[
                            'p-3 rounded-xl transition-all',
                            form.enabled_tools.includes(tool.id) ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-white/5 text-gray-500 group-hover:text-white'
                        ]">
                            <component :is="tool.icon" class="w-5 h-5" />
                        </div>
                        <div>
                            <p class="text-sm font-bold text-white mb-1">{{ tool.name }}</p>
                            <p class="text-[9px] text-gray-500 uppercase tracking-widest">{{ tool.desc }}</p>
                        </div>
                    </div>
                </div>
              </div>
            </section>

            <!-- Catalog Management (Only if orders enabled) -->
            <section v-if="form.enabled_tools.includes('orders')" class="glass-card">
              <div class="flex items-center justify-between mb-8">
                <div>
                  <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Product Catalog</h3>
                  <p class="text-[9px] text-gray-600 uppercase tracking-wider">Inventory managed by this agent</p>
                </div>
                <button 
                  @click="handleAddProduct"
                  :disabled="isAddingProduct"
                  class="px-5 py-2 bg-primary text-black font-bold rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                  <Plus v-if="!isAddingProduct" class="w-3.5 h-3.5" />
                  <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
                  Deploy Product
                </button>
              </div>

              <!-- Add Product Form -->
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div class="sm:col-span-2">
                    <label class="block text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Product Name</label>
                    <input v-model="newProduct.name" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" placeholder="e.g. Classic Burger" />
                </div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Price (RWF)</label>
                    <input v-model.number="newProduct.price" type="number" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" placeholder="5000" />
                </div>
                <div>
                    <label class="block text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Category</label>
                    <input v-model="newProduct.category" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" placeholder="Food" />
                </div>
                <div class="sm:col-span-4">
                    <label class="block text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Brief Description</label>
                    <input v-model="newProduct.description" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" placeholder="A juicy beef burger with cheese..." />
                </div>
              </div>

              <!-- Catalog List -->
              <div v-if="isCatalogLoading" class="flex justify-center py-10">
                <Loader2 class="w-6 h-6 text-primary animate-spin" />
              </div>
              <div v-else-if="catalog.length === 0" class="text-center py-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                <ShoppingBag class="w-12 h-12 text-gray-800 mx-auto mb-4 opacity-20" />
                <p class="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Empty Inventory</p>
              </div>
              <div v-else class="space-y-3">
                <div v-for="product in catalog" :key="product.id" class="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 font-black text-[10px]">
                            {{ product.category?.substring(0, 3).toUpperCase() || 'ITM' }}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-white">{{ product.name }}</p>
                            <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">{{ product.description || 'No description' }}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <div class="text-right">
                            <p class="text-xs font-bold text-white">{{ product.price.toLocaleString() }} RWF</p>
                            <p class="text-[8px] text-primary uppercase font-bold tracking-tighter mt-0.5">Verified</p>
                        </div>
                        <button @click="removeProduct(product.id)" class="p-2 text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 class="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            </section>
        </div>

        <div class="lg:col-span-4 space-y-6">
            <!-- Paypack Configuration -->
            <section v-if="form.enabled_tools.includes('payments')" class="glass-card">
              <div class="flex items-center justify-between mb-8">
                <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Paypack Setup</h3>
                <CreditCard class="w-4 h-4 text-primary opacity-50" />
              </div>
              <div class="space-y-6">
                <div>
                  <label class="block text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Application Client ID</label>
                  <input 
                    v-model="form.tools_config.paypack_client_id" 
                    type="password"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" 
                    placeholder="pp_..." 
                  />
                </div>
                <div>
                  <label class="block text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-2">Application Client Secret</label>
                  <input 
                    v-model="form.tools_config.paypack_client_secret" 
                    type="password"
                    class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" 
                    placeholder="••••••••••••" 
                  />
                </div>
                <div class="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <p class="text-[9px] text-orange-500/70 leading-relaxed uppercase tracking-wider">
                        Credentials are encrypted and used only for processing customer payments.
                    </p>
                </div>
              </div>
            </section>

            <!-- Stats & Insights -->
            <section class="glass-card">
                <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-8">Intelligence Overlook</h3>
                <div class="space-y-5">
                    <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <ShoppingBag class="w-5 h-5 text-gray-600" />
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Inventory</p>
                        </div>
                        <p class="text-xl font-bold text-white">{{ catalog.length }}</p>
                    </div>
                    <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <Zap class="w-5 h-5 text-gray-600" />
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tools Enabled</p>
                        </div>
                        <p class="text-xl font-bold text-white">{{ form.enabled_tools.length }}</p>
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
    <!-- ─── SECURITY TAB ────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'security'" class="max-w-3xl space-y-8">
      <section class="glass-card">
        <div class="flex items-center gap-4 mb-8">
          <div class="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Shield class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white tracking-tight uppercase">Domain Whitelisting</h3>
            <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Prevent unauthorized websites from embedding your widget</p>
          </div>
        </div>

        <div class="space-y-6">
          <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <div class="flex items-start gap-4">
              <Info class="w-4 h-4 text-primary shrink-0 mt-1" />
              <div class="space-y-1">
                <p class="text-xs font-bold text-white uppercase tracking-tight">Security Protocol</p>
                <p class="text-[10px] text-gray-500 leading-relaxed uppercase tracking-wider">
                  If this list is empty, your widget can be embedded on any website. Once you add a domain, all other origins (except localhost) will be blocked.
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <label class="block text-[10px] font-bold tracking-widest text-gray-600 uppercase">Authorized Origins</label>
            
            <div class="space-y-3">
              <div 
                v-for="(domain, index) in form.allowed_domains" 
                :key="index"
                class="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl group"
              >
                <Globe class="w-4 h-4 text-gray-500" />
                <span class="flex-1 text-xs text-white">{{ domain }}</span>
                <button 
                  @click="form.allowed_domains.splice(index, 1)"
                  class="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <div class="flex items-center gap-3 mt-4">
                <input 
                  type="text"
                  v-model="newDomainInput"
                  class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors text-xs"
                  placeholder="e.g. example.com"
                  @keypress.enter.prevent="() => {
                    if (newDomainInput) {
                      form.allowed_domains.push(newDomainInput.trim().replace(/^https?:\/\//, '').split('/')[0])
                      newDomainInput = ''
                    }
                  }"
                />
                <button 
                  @click="() => {
                    if (newDomainInput) {
                      form.allowed_domains.push(newDomainInput.trim().replace(/^https?:\/\//, '').split('/')[0])
                      newDomainInput = ''
                    }
                  }"
                  class="px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all"
                >
                  Add Domain
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Advanced Options -->
      <section class="glass-card opacity-50 grayscale pointer-events-none">
        <h3 class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-6 flex items-center gap-2">
          Advanced Security <span class="bg-primary/20 text-primary px-2 py-0.5 rounded text-[8px]">PRO</span>
        </h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p class="text-xs font-bold text-white">Rate Limiting</p>
              <p class="text-[9px] text-gray-600 uppercase tracking-widest">Limit requests per session</p>
            </div>
            <div class="w-10 h-5 bg-gray-800 rounded-full relative p-1">
              <div class="w-3 h-3 bg-white/20 rounded-full" />
            </div>
          </div>
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p class="text-xs font-bold text-white">Data Anonymization</p>
              <p class="text-[9px] text-gray-600 uppercase tracking-widest">Strip PII from chat history</p>
            </div>
            <div class="w-10 h-5 bg-gray-800 rounded-full relative p-1">
              <div class="w-3 h-3 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-[#111111]/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem];
}
</style>
