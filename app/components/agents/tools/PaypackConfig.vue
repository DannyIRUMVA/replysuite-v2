<script setup lang="ts">
import { CreditCard } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: {
    paypack_client_id: string
    paypack_client_secret: string
  }
}>()

const emit = defineEmits(['update:modelValue'])

const updateField = (field: string, value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}
</script>

<template>
  <section class="glass-card p-10">
    <div class="flex items-center justify-between mb-8">
      <h3 class="text-[10px] font-bold text-foreground/50 tracking-widest uppercase">Paypack Setup</h3>
      <CreditCard class="w-4 h-4 text-primary opacity-50" />
    </div>
    <div class="space-y-6">
      <div>
        <label class="block text-[8px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Application Client ID</label>
        <input 
          :value="props.modelValue.paypack_client_id"
          @input="e => updateField('paypack_client_id', (e.target as HTMLInputElement).value)"
          type="password"
          class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/50" 
          placeholder="pp_..." 
        />
      </div>
      <div>
        <label class="block text-[8px] font-bold text-foreground/50 uppercase tracking-widest mb-2">Application Client Secret</label>
        <input 
          :value="props.modelValue.paypack_client_secret"
          @input="e => updateField('paypack_client_secret', (e.target as HTMLInputElement).value)"
          type="password"
          class="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-foreground/50" 
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
</template>
