<script setup lang="ts">
import { ShoppingBag, ArrowLeft, Bot } from 'lucide-vue-next'
import CatalogManager from '~/components/agents/tools/CatalogManager.vue'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Order Settings | ReplySuite' })

const supabase = useSupabaseClient() as any
const { userId } = useAuth()
const isLoading = ref(true)
const chatbots = ref<any[]>([])
const selectedChatbotId = ref('')

const selectedBot = computed(() => chatbots.value.find((bot) => bot.id === selectedChatbotId.value))

const fetchBots = async () => {
  if (!userId.value) return
  isLoading.value = true
  try {
    const { data } = await supabase
      .from('chatbots')
      .select('id,name,enabled_tools')
      .eq('user_id', userId.value)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    chatbots.value = data || []
    selectedChatbotId.value ||= chatbots.value.find((bot) => (bot.enabled_tools || []).includes('orders'))?.id || chatbots.value[0]?.id || ''
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchBots)
watch(() => userId.value, fetchBots)
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 pb-20">
    <NuxtLink to="/dashboard/orders" class="inline-flex items-center gap-2 text-xs font-bold text-foreground/55 transition hover:text-foreground"><ArrowLeft class="h-4 w-4" /> Back to orders</NuxtLink>
    <div>
      <p class="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Commerce setup</p>
      <h1 class="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Order settings</h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/58">Manage the catalog your assistant uses to create customer orders. Payments stay attached to real orders only.</p>
    </div>

    <section class="rounded-2xl border border-foreground/8 bg-background-card p-5">
      <label class="mb-2 block text-[10px] font-black uppercase tracking-widest text-foreground/45">Assistant catalog</label>
      <select v-model="selectedChatbotId" class="h-11 w-full rounded-xl border border-foreground/10 bg-background px-3 text-sm outline-none focus:border-primary/40">
        <option v-for="bot in chatbots" :key="bot.id" :value="bot.id">{{ bot.name }}{{ (bot.enabled_tools || []).includes('orders') ? '' : ' — orders not enabled' }}</option>
      </select>
      <p v-if="selectedBot && !(selectedBot.enabled_tools || []).includes('orders')" class="mt-3 rounded-xl border border-orange-500/15 bg-orange-500/5 p-3 text-xs text-orange-500/75">This assistant can store a catalog, but customers cannot order until Orders is enabled in the assistant Tools tab.</p>
    </section>

    <div v-if="isLoading" class="h-48 animate-pulse rounded-2xl bg-foreground/5" />
    <CatalogManager v-else-if="selectedChatbotId" :chatbot-id="selectedChatbotId" />
    <section v-else class="rounded-2xl border border-dashed border-foreground/10 bg-background-card p-10 text-center">
      <Bot class="mx-auto h-10 w-10 text-foreground/20" />
      <h2 class="mt-4 text-sm font-black text-foreground">No assistants yet</h2>
      <p class="mt-2 text-xs text-foreground/50">Create an assistant before adding a catalog.</p>
    </section>
  </div>
</template>
