<script setup lang="ts">
import { ShoppingBag, Calendar, CreditCard, FileSpreadsheet, Lock } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string[]
  isPremium: boolean
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const tools = [
  { id: 'orders', name: 'Order Management', desc: 'Allow users to browse catalog and place orders.', icon: ShoppingBag, pro: true },
  { id: 'appointments', name: 'Appointment Setter', desc: 'Schedule meetings and consultations.', icon: Calendar, pro: true },
  { id: 'payments', name: 'MTN/Airtel Payments', desc: 'Accept local payments via Paypack.', icon: CreditCard, pro: true },
  { id: 'invoices', name: 'Automated Invoices', desc: 'Generate printable web invoices.', icon: FileSpreadsheet, pro: true },
]

const toggleTool = (toolId: string, isPro: boolean) => {
  if (isPro && !props.isPremium) return
  
  const newValue = [...props.modelValue]
  const idx = newValue.indexOf(toolId)
  if (idx > -1) newValue.splice(idx, 1)
  else newValue.push(toolId)
  
  emit('update:modelValue', newValue)
  emit('save')
}
</script>

<template>
  <section class="glass-card p-10">
    <h3 class="text-[10px] font-bold text-foreground/50 tracking-widest uppercase mb-8">Agent Capabilities (Tools)</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-for="tool in tools" :key="tool.id" 
        @click="toggleTool(tool.id, tool.pro)"
        :class="[
          'p-5 rounded-2xl border transition-all group relative',
          (tool.pro && !props.isPremium) ? 'opacity-50 grayscale cursor-not-allowed border-foreground/5' : 'cursor-pointer',
          props.modelValue.includes(tool.id) ? 'bg-primary/10 border-primary/30' : 'bg-foreground/[0.02] border-foreground/5 hover:border-foreground/10'
        ]">
        <!-- Pro Badge -->
        <div v-if="tool.pro && !props.isPremium" class="absolute top-2 right-2 bg-background/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-foreground/10 flex items-center gap-1">
          <Lock class="w-2.5 h-2.5 text-yellow-500" />
          <span class="text-[8px] font-bold text-foreground uppercase tracking-tighter">Pro Only</span>
        </div>

        <div class="flex items-center gap-4">
          <div :class="[
            'p-3 rounded-xl transition-all',
            props.modelValue.includes(tool.id) ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'bg-foreground/5 text-foreground/50 group-hover:text-foreground'
          ]">
            <component :is="tool.icon" class="w-5 h-5" />
          </div>
          <div>
            <p class="text-sm font-bold text-foreground mb-1">{{ tool.name }}</p>
            <p class="text-[9px] text-foreground/50 uppercase tracking-widest">{{ tool.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
