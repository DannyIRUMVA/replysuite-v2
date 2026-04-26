<script setup lang="ts">
useHead({ title: `Invoice | ReplySuite Ledger` })

import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock,
  ExternalLink
} from 'lucide-vue-next'

const route = useRoute()
const supabase = useSupabaseClient()

const { data: invoice, pending, error } = await useAsyncData(`invoice-${route.params.id}`, async () => {
  const { data, error } = await supabase
    .from('chatbot_invoices')
    .select('*, order:chatbot_orders(*, chatbot:chatbots(*, user:profiles(*)))')
    .eq('id', route.params.id)
    .single()
  
  if (error) throw error
  return data
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const printInvoice = () => {
  window.print()
}

definePageMeta({
    layout: 'public' // We might need a public layout or just raw
})
</script>

<template>
  <div class="min-h-screen bg-[#050505] text-white py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-primary/30">
    <div v-if="pending" class="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div class="w-12 h-12 border-t-2 border-primary rounded-full animate-spin"></div>
      <p class="text-gray-500 font-bold tracking-widest uppercase text-xs">Decrypting Ledger...</p>
    </div>

    <div v-else-if="error || !invoice" class="max-w-4xl mx-auto text-center py-20">
      <div class="inline-flex p-6 rounded-full bg-red-500/10 mb-8">
        <FileText class="w-16 h-16 text-red-500" />
      </div>
      <h1 class="text-3xl font-bold tracking-tighter mb-4 text-white">Invoice Not Found</h1>
      <p class="text-gray-500 max-w-md mx-auto mb-10">The ledger entry you are looking for does not exist or has been archived.</p>
      <NuxtLink to="/" class="text-primary font-bold tracking-widest uppercase text-xs hover:underline">Return to Hub</NuxtLink>
    </div>

    <div v-else class="max-w-4xl mx-auto">
      <!-- Top Actions (Hidden in print) -->
      <div class="flex items-center justify-between mb-12 print:hidden">
        <div class="flex items-center gap-4">
            <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                <FileText class="w-6 h-6 text-primary" />
            </div>
            <div>
                <h1 class="text-xl font-bold tracking-tight uppercase">Invoice {{ invoice.invoice_number }}</h1>
                <p class="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase mt-1">ReplySuite Settlement Protocol</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
          <button @click="printInvoice" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase hover:bg-white/10 transition-all">
            <Printer class="w-4 h-4" />
            Print
          </button>
          <div :class="invoice.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'" class="px-5 py-2.5 rounded-xl border text-xs font-bold tracking-widest uppercase flex items-center gap-2">
            <component :is="invoice.status === 'paid' ? CheckCircle2 : Clock" class="w-4 h-4" />
            {{ invoice.status }}
          </div>
        </div>
      </div>

      <!-- Main Invoice Card -->
      <div class="glass-card overflow-hidden relative print:border-none print:shadow-none print:bg-white print:text-black">
        <div class="absolute top-0 right-0 p-12 opacity-10 pointer-events-none print:hidden">
            <h2 class="text-6xl font-black tracking-tighter uppercase italic transform rotate-12">REPLYSUITE</h2>
        </div>

        <div class="relative z-10 space-y-12">
            <!-- Header: Seller & Client Info -->
            <div class="grid grid-cols-2 gap-12 border-b border-white/5 pb-12 print:border-black/10">
                <div>
                    <h2 class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">From</h2>
                    <div class="space-y-1">
                        <p class="text-xl font-bold text-white print:text-black">{{ invoice.order?.chatbot?.user?.company_name || invoice.order?.chatbot?.name }}</p>
                        <p class="text-sm text-gray-400 print:text-gray-600">Managed via ReplySuite Agent</p>
                        <p class="text-sm text-gray-400 print:text-gray-600">{{ invoice.order?.chatbot?.user?.contact_email }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <h2 class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">Bill To</h2>
                    <div class="space-y-1">
                        <p class="text-xl font-bold text-white print:text-black">{{ invoice.order?.customer_name || 'Valued Customer' }}</p>
                        <p class="text-sm text-gray-400 print:text-gray-600">{{ invoice.order?.customer_phone }}</p>
                        <p class="text-sm text-gray-400 print:text-gray-600">WhatsApp Verified Entity</p>
                    </div>
                </div>
            </div>

            <!-- Metadata: Dates & Number -->
            <div class="grid grid-cols-4 gap-6 text-[10px] font-bold tracking-widest uppercase">
                <div class="space-y-2">
                    <p class="text-gray-500">Invoice Number</p>
                    <p class="text-white print:text-black">{{ invoice.invoice_number }}</p>
                </div>
                <div class="space-y-2">
                    <p class="text-gray-500">Date Issued</p>
                    <p class="text-white print:text-black">{{ formatDate(invoice.issue_date) }}</p>
                </div>
                <div class="space-y-2">
                    <p class="text-gray-500">Order ID</p>
                    <p class="text-white print:text-black">#{{ invoice.order?.id.substring(0, 8) }}</p>
                </div>
                <div class="space-y-2 text-right">
                    <p class="text-gray-500">Currency</p>
                    <p class="text-white print:text-black">RWF (Rwandan Franc)</p>
                </div>
            </div>

            <!-- Items Table -->
            <div class="space-y-6">
                <h3 class="text-sm font-bold uppercase tracking-widest text-primary">Settlement Details</h3>
                <div class="w-full border border-white/5 rounded-2xl overflow-hidden print:border-black/10">
                    <table class="w-full text-left">
                        <thead class="bg-white/5 print:bg-gray-100">
                            <tr>
                                <th class="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                <th class="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Qty</th>
                                <th class="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                                <th class="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5 print:divide-black/5">
                            <tr v-for="item in (invoice.order?.items || [])" :key="item.id" class="group hover:bg-white/[0.02]">
                                <td class="px-6 py-6 font-bold text-sm text-white print:text-black">
                                    {{ item.name }}
                                    <p class="text-[10px] text-gray-500 font-normal mt-1">{{ item.description || 'Standard catalog item' }}</p>
                                </td>
                                <td class="px-6 py-6 text-sm text-gray-400 text-center print:text-black font-medium">{{ item.qty }}</td>
                                <td class="px-6 py-6 text-sm text-gray-400 text-right print:text-black font-medium">{{ item.price.toLocaleString() }}</td>
                                <td class="px-6 py-6 text-sm font-bold text-white text-right print:text-black">{{ (item.price * item.qty).toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer: Summary & Totals -->
            <div class="flex justify-end pt-12 border-t border-white/5 print:border-black/10">
                <div class="w-full max-w-xs space-y-4">
                    <div class="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                        <p class="text-gray-500">Subtotal</p>
                        <p class="text-white print:text-black">{{ invoice.total_amount.toLocaleString() }}</p>
                    </div>
                    <div class="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                        <p class="text-gray-500">Tax (0%)</p>
                        <p class="text-white print:text-black">0</p>
                    </div>
                    <div class="pt-6 border-t border-white/10 flex justify-between items-center print:border-black/10">
                        <p class="text-sm font-bold uppercase tracking-[0.2em] text-primary">Total Amount</p>
                        <p class="text-3xl font-bold tracking-tighter text-white print:text-black underline decoration-primary/50 underline-offset-8 decoration-2">{{ invoice.total_amount.toLocaleString() }} RWF</p>
                    </div>
                </div>
            </div>

            <!-- Notes & Terms -->
            <div class="mt-20 p-8 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 print:bg-gray-50 print:border-black/5">
                <h4 class="text-[9px] font-bold text-primary uppercase tracking-[0.3em]">Protocol Notes</h4>
                <p class="text-[11px] leading-relaxed text-gray-500 font-medium italic-none">
                    This document was automatically generated by the ReplySuite Autonomous Agent #{{ invoice.chatbot_id.substring(0, 6) }}. 
                    All payments are processed securely via the Paypack Settlement Layer. 
                    Please ensure settlement is completed before the due date to avoid automated service interruption.
                </p>
            </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="mt-12 text-center space-y-6 print:hidden">
        <div class="flex items-center justify-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">
            Digital Signature Verified
        </div>
        <p class="text-[10px] text-gray-700 uppercase font-bold tracking-widest">
            Powered by ReplySuite.app • Scalable Intelligence for Modern Commerce
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-[#0a0a0a] backdrop-blur-2xl border border-white/5 p-12 rounded-[2.5rem] shadow-2xl;
  box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5);
}

@media print {
    body {
        background-color: white !important;
        color: black !important;
    }
    .min-h-screen {
        background: white !important;
        padding: 0 !important;
    }
    .glass-card {
        border: none !important;
        background: white !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
    .print\:hidden {
        display: none !important;
    }
}
</style>
