<script setup lang="ts">
import { Check, Zap, ArrowRight, HelpCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const plans = [
  {
    name: 'free',
    price: '0.00',
    desc: 'experience the gold standard risk-free.',
    features: ['1 instagram account', '100 auto-replies / mo', 'standard ai agent', 'email support'],
    popular: false
  },
  {
    name: 'silver',
    price: '8.88',
    desc: 'the best value for growing elite brands.',
    features: ['3 instagram accounts', '2,500 auto-replies / mo', 'advanced ai (gpt-4o)', 'priority support'],
    popular: true
  },
  {
    name: 'gold',
    price: '26.88',
    desc: 'unlimited power for high-volume experts.',
    features: ['unlimited accounts', 'unlimited auto-replies', 'fine-tuned models', 'dedicated manager'],
    popular: false
  }
]

const faqs = [
  { q: 'Can I cancel my subscription any time?', a: 'Yes, you can cancel your subscription at any time from your account settings. You will retain access until the end of your billing cycle.' },
  { q: 'Is there a free trial?', a: 'Yes! We offer an automatic 30-day Free Month for all new verified accounts so you can experience ReplySuite risk-free.' },
  { q: 'What happens if I exceed my monthly limit?', a: 'We will notify you when you reach 80% and 100% of your limit. You can easily upgrade your plan to continue service without interruption.' }
]
</script>

<template>
  <div class="relative min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-32">
        <div class="text-center max-w-3xl mx-auto mb-32">
          <span class="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-widest mb-10">investment</span>
          <h1 class="text-6xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.85]">
            choose your <br />
            <span class="text-gradient">tier.</span>
          </h1>
          <p class="text-xl text-gray-500 font-medium leading-relaxed">Choose the gold standard for your automation needs. No hidden fees or complex contracts.</p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid lg:grid-cols-3 gap-12 mb-40">
          <div 
            v-for="plan in plans" 
            :key="plan.name"
            class="glass-card p-12 flex flex-col relative transition-all duration-500 hover:-translate-y-4 border-white/5"
            :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : ''"
          >
            <div v-if="plan.popular" class="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-black text-[10px] font-black tracking-[0.2em] rounded-full shadow-xl shadow-primary/20">
              elite choice
            </div>

            <div class="mb-10">
              <h3 class="text-3xl font-bold mb-3 tracking-tight tracking-widest">{{ plan.name }}</h3>
              <p class="text-sm text-gray-500 font-medium">{{ plan.desc }}</p>
            </div>

            <div class="mb-12 flex items-baseline gap-2">
              <span class="text-6xl font-black tracking-tighter">${{ plan.price }}</span>
              <span class="text-gray-500 font-bold tracking-widest text-xs">/month</span>
            </div>

            <NuxtLink 
              to="/register" 
              class="w-full py-5 rounded-full font-black text-center mb-12 transition-all tracking-widest text-sm"
              :class="plan.popular ? 'btn-gradient shadow-lg shadow-primary/20' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'"
            >
              {{ plan.name === 'gold' ? 'get started' : 'start free month' }}
            </NuxtLink>

            <div class="space-y-6 flex-grow">
              <div v-for="feat in plan.features" :key="feat" class="flex items-center gap-4 text-sm font-medium text-gray-400">
                <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check class="w-3 h-3 text-primary" />
                </div>
                {{ feat }}
              </div>
            </div>
          </div>
        </div>

        <!-- FAQ Section -->
        <section class="max-w-4xl mx-auto py-32 border-t border-white/5">
          <div class="text-center mb-24">
             <h2 class="text-5xl font-bold mb-6 tracking-tight">common <span class="text-primary font-black tracking-widest">inquiries.</span></h2>
          </div>
          <div class="grid md:grid-cols-2 gap-8">
            <div v-for="faq in faqs" :key="faq.q" class="glass-card p-10 border-white/5 bg-white/[0.01] hover:border-primary/20 transition-all">
              <h4 class="text-xl font-bold mb-6 flex items-start gap-4 tracking-tight">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                   <HelpCircle class="w-5 h-5 text-primary" />
                </div>
                {{ faq.q }}
              </h4>
              <p class="text-gray-500 font-medium leading-relaxed pl-14">{{ faq.a }}</p>
            </div>
          </div>
        </section>

        <!-- Final CTA -->
        <section class="mt-40 bg-white/[0.02] p-24 rounded-[64px] border border-white/5 text-center relative overflow-hidden group">
          <div class="absolute inset-0 bg-primary/5 blur-[120px] group-hover:bg-primary/10 transition-all duration-1000"></div>
          <h2 class="text-5xl md:text-7xl font-bold mb-10 relative z-10 tracking-tighter">bespoke <span class="text-primary font-black tracking-widest">solutions.</span></h2>
          <p class="text-gray-500 mb-16 max-w-xl mx-auto font-medium text-lg">We offer tailored configurations for agencies and high-volume global brands.</p>
          <NuxtLink to="mailto:support@replysuite.com" class="w-full sm:w-auto bg-white text-black px-12 py-6 rounded-full font-black text-xl hover:bg-gray-200 transition-colors inline-flex items-center gap-4 group/btn relative z-10 tracking-widest">
            consult with experts
            <ArrowRight class="w-6 h-6 group-hover/btn:translate-x-2 transition-transform" />
          </NuxtLink>
        </section>
      </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[48px];
}
</style>
