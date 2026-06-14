<script setup lang="ts">
import { ShoppingBag, Calendar, CreditCard, Lock, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string[]
  isPremium: boolean
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const hasTool = (toolId: string) => props.modelValue.includes(toolId)
const hasCoreTool = computed(() => hasTool('orders') || hasTool('appointments'))

const updateTools = (next: string[]) => {
  const unique = Array.from(new Set(next))
  emit('update:modelValue', unique)
  emit('save')
}

const toggleTool = (toolId: 'orders' | 'appointments' | 'payments') => {
  if (!props.isPremium) return
  if (toolId === 'payments' && !hasCoreTool.value) return

  const next = [...props.modelValue]
  const idx = next.indexOf(toolId)
  if (idx > -1) next.splice(idx, 1)
  else next.push(toolId)

  if (toolId !== 'payments' && next.includes('payments') && !next.includes('orders') && !next.includes('appointments')) {
    next.splice(next.indexOf('payments'), 1)
  }

  updateTools(next)
}

const cards = [
  {
    id: 'appointments' as const,
    icon: Calendar,
    label: 'Appointments',
    eyebrow: 'Scheduling',
    description: 'Book consultations, office visits, services, reservations, and customer appointments.',
    examples: ['Clinics', 'Salons', 'Agencies', 'Offices'],
  },
  {
    id: 'orders' as const,
    icon: ShoppingBag,
    label: 'Orders',
    eyebrow: 'Commerce',
    description: 'Let customers browse a menu or catalog, create orders, and send them to your team.',
    examples: ['Restaurants', 'Shops', 'Delivery', 'WhatsApp sellers'],
  },
]
</script>

<template>
  <section class="glass-card p-6 sm:p-8">
    <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Business tools</p>
        <h3 class="mt-1 text-lg font-black tracking-tight text-foreground">What can this assistant do?</h3>
        <p class="mt-1 max-w-2xl text-xs leading-relaxed text-foreground/55">
          Enterprise AI tools let the assistant create appointments or orders, then request payment only when needed.
        </p>
      </div>
      <div class="rounded-full border border-foreground/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">
        Invoices removed
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="group relative rounded-2xl border p-5 text-left transition-all"
        :class="[
          !props.isPremium ? 'cursor-not-allowed border-foreground/5 opacity-60 grayscale' : 'cursor-pointer hover:border-primary/25',
          hasTool(card.id) ? 'border-primary/30 bg-primary/10 shadow-lg shadow-primary/5' : 'border-foreground/8 bg-foreground/[0.015]'
        ]"
        @click="toggleTool(card.id)"
      >
        <div v-if="!props.isPremium" class="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-foreground/10 bg-background/70 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-foreground/50">
          <Lock class="h-2.5 w-2.5" /> Enterprise
        </div>

        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl border transition-all" :class="hasTool(card.id) ? 'border-primary/30 bg-primary text-black' : 'border-foreground/8 bg-foreground/5 text-foreground/45 group-hover:text-foreground'">
              <component :is="card.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="text-[9px] font-black uppercase tracking-[0.18em] text-foreground/40">{{ card.eyebrow }}</p>
              <p class="text-sm font-black text-foreground">{{ card.label }}</p>
            </div>
          </div>
          <CheckCircle2 v-if="hasTool(card.id)" class="h-5 w-5 text-primary" />
        </div>

        <p class="text-xs leading-relaxed text-foreground/58">{{ card.description }}</p>
        <div class="mt-4 flex flex-wrap gap-1.5">
          <span v-for="example in card.examples" :key="example" class="rounded-full border border-foreground/8 px-2.5 py-1 text-[9px] font-bold text-foreground/45">
            {{ example }}
          </span>
        </div>
      </button>
    </div>

    <div class="mt-4 rounded-2xl border p-5 transition-all" :class="hasTool('payments') ? 'border-primary/30 bg-primary/10' : 'border-foreground/8 bg-foreground/[0.015]'">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border" :class="hasTool('payments') ? 'border-primary/30 bg-primary text-black' : 'border-foreground/8 bg-foreground/5 text-foreground/45'">
            <CreditCard class="h-5 w-5" />
          </div>
          <div>
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-foreground/40">Optional add-on</p>
            <h4 class="text-sm font-black text-foreground">Paypack payments</h4>
            <p class="mt-1 max-w-2xl text-xs leading-relaxed text-foreground/55">
              Payment is not a standalone tool. It attaches to an existing appointment deposit or order total after the assistant creates that record.
            </p>
            <p v-if="!hasCoreTool" class="mt-2 text-[10px] font-bold text-foreground/40">Enable appointments or orders first.</p>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-50"
          :class="hasTool('payments') ? 'bg-primary text-black' : 'border border-foreground/10 text-foreground/60 hover:border-primary/30 hover:text-foreground'"
          :disabled="!props.isPremium || !hasCoreTool"
          @click.stop="toggleTool('payments')"
        >
          {{ hasTool('payments') ? 'Payments on' : 'Enable payments' }}
        </button>
      </div>
    </div>
  </section>
</template>
