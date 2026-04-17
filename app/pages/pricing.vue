<script setup lang="ts">
import { Check, Zap, Rocket, Shield, ArrowRight, HelpCircle } from 'lucide-vue-next'

useSeoMeta({
  title: 'Pricing Plans | Simple, Transparent AI Automation',
  description: 'Choose the perfect plan for your brand growth. From startups to high-volume global brands, we have the gold standard of AI automation for every level.',
  ogTitle: 'ReplySuite Pricing | Scalable AI Automation',
})

definePageMeta({
  layout: 'default'
})

const plans = [
  {
    name: 'Free',
    price: '0.00',
    desc: 'Experience the gold standard risk-free.',
    features: ['1 website chatbot', '100 conversations / mo', 'Trainable AI agent', 'Email support'],
    popular: false
  },
  {
    name: 'Silver',
    price: '17.88',
    desc: 'The best value for growing elite brands.',
    features: ['3 website chatbots', '2,500 conversations / mo', 'Advanced bot training', 'Priority support'],
    popular: true
  },
  {
    name: 'Gold',
    price: '26.88',
    desc: 'Unlimited power for high-volume experts.',
    features: ['Unlimited chatbots', 'Unlimited conversations', 'Proprietary bot training', 'Dedicated manager'],
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
        <div class="text-center max-w-3xl mx-auto mb-32 border-b border-white/5 pb-20">
          <span class="badge-gradient mb-10">Investment</span>
          <h1 class="text-6xl md:text-8xl font-extrabold mb-10 tracking-tighter leading-[0.85] text-white">
            Choose your <br />
            <span class="text-gradient">Tier.</span>
          </h1>
          <p class="text-xl text-gray-400 font-medium leading-relaxed">High-performance AI automation built for every stage of your growth.</p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid lg:grid-cols-3 gap-12 mb-40">
          <div 
            v-for="plan in plans" 
            :key="plan.name"
            class="glass-card p-12 flex flex-col relative transition-all duration-500 hover:-translate-y-4 border-white/5"
            :class="plan.popular ? 'border-primary/40 !bg-primary/[0.03]' : ''"
          >
            <div v-if="plan.popular" class="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-black text-[11px] font-bold tracking-[0.2em] rounded-full shadow-2xl shadow-primary/30 uppercase">
              Elite Choice
            </div>

            <div class="mb-10">
              <h3 class="text-3xl font-bold mb-3 tracking-tight tracking-widest">{{ plan.name }}</h3>
              <p class="text-sm text-gray-500 font-medium">{{ plan.desc }}</p>
            </div>

            <div class="mb-12 flex items-baseline gap-2">
              <span class="text-6xl font-extrabold tracking-tighter text-white">${{ plan.price }}</span>
              <span class="text-gray-500 font-bold tracking-[0.1em] text-[10px] uppercase">/month</span>
            </div>

            <NuxtLink 
              to="/register" 
              class="w-full py-5 rounded-full font-bold text-center mb-12 transition-all tracking-[0.1em] text-sm"
              :class="plan.popular ? 'btn-gradient' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'"
            >
              {{ plan.name === 'Gold' ? 'Get Started' : 'Start Free Month' }}
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
             <h2 class="text-5xl font-extrabold mb-6 tracking-tight text-white">Common <span class="text-gradient">Inquiries.</span></h2>
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
          <h2 class="text-5xl md:text-7xl font-extrabold mb-10 relative z-10 tracking-tighter text-white">Bespoke <span class="text-gradient">Solutions.</span></h2>
          <p class="text-gray-400 mb-16 max-w-xl mx-auto font-medium text-lg relative z-10">Tailored configurations for agencies and global enterprises demanding unlimited scale.</p>
          <NuxtLink to="mailto:support@replysuite.com" class="btn-gradient px-12 py-6 text-xl inline-flex items-center gap-4 group/btn relative z-10">
            Consult with Experts
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
