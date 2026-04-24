<script setup lang="ts">
import { Instagram, Globe, MessageSquare, Code, Layout, Zap, ArrowRight, Share2, MessageCircle, Shield } from 'lucide-vue-next'

useSeoMeta({
  title: 'Integrations | ReplySuite Ecosystem',
  description: 'Connect ReplySuite to your website and WhatsApp. Seamlessly integrate AI with your own custom tech stack and WordPress.',
})

definePageMeta({
  layout: 'default'
})

const integrations = [
  {
    name: 'Website Integration',
    desc: 'Deploy your AI agent on any website with a single line of code. High-performance, lightweight script compatible with all frameworks.',
    icon: Code,
    status: 'Native'
  },
  {
    name: 'WordPress Plugin',
    desc: 'The official ReplySuite plugin for WordPress. Seamlessly integrate AI into your site, compatible with Elementor and WooCommerce.',
    icon: Globe,
    status: 'Native'
  },
  {
    name: 'WhatsApp Business',
    desc: 'Scale your communication on the world’s most popular messaging app using our official Meta API integration.',
    icon: MessageCircle,
    status: 'Native'
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <span class="badge-gradient mb-10 text-xs uppercase tracking-widest font-bold">Ecosystem</span>
      <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-white">
        Connect Your <br />
        <span class="text-gradient">Workflow.</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
        ReplySuite is optimized for where it matters most. Deploy your AI on your website, WordPress site, or WhatsApp instantly.
      </p>
    </section>

    <!-- Grid -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="i in integrations" :key="i.name" class="glass-card p-10 border-white/5 hover:border-primary/20 transition-all group">
          <div class="flex items-start justify-between mb-10">
            <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
              <component :is="i.icon" class="w-8 h-8" />
            </div>
            <span :class="[
              'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border',
              i.status === 'Native' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
              i.status === 'Upcoming' ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-primary/10 border-primary/20 text-primary'
            ]">
              {{ i.status }}
            </span>
          </div>
          <h3 class="text-2xl font-bold text-white mb-4 tracking-tight">{{ i.name }}</h3>
          <p class="text-gray-500 leading-relaxed font-medium mb-8 text-sm">{{ i.desc }}</p>
          <div class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Documentation
            <ArrowRight class="w-3 h-3" />
          </div>
        </div>
      </div>
    </section>

    <!-- Developer Section -->
    <section class="max-w-7xl mx-auto px-6 py-40 border-t border-white/5">
      <div class="bg-white/[0.02] border border-white/5 p-16 md:p-24 rounded-[64px] flex flex-col md:flex-row items-center gap-16 overflow-hidden relative">
        <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px]"></div>
        <div class="flex-1 relative z-10">
          <h2 class="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tighter leading-tight">
            Build Custom <br />
            <span class="text-gradient">Experiences.</span>
          </h2>
          <p class="text-gray-400 mb-10 text-lg leading-relaxed">
            Our Webhooks and REST API allow you to pipe conversation data into your CRM, ERP, or custom analytics dashboard in real-time.
          </p>
          <NuxtLink to="/register" class="btn-gradient px-10 py-5 inline-flex items-center gap-3">
            Get API Access
            <Zap class="w-5 h-5 fill-current" />
          </NuxtLink>
        </div>
        <div class="flex-1 bg-[#050505] p-10 rounded-[40px] border border-white/5 font-mono text-sm relative z-10">
          <div class="flex gap-2 mb-6">
            <div class="w-3 h-3 rounded-full bg-red-500/20"></div>
            <div class="w-3 h-3 rounded-full bg-yellow-500/20"></div>
            <div class="w-3 h-3 rounded-full bg-green-500/20"></div>
          </div>
          <div class="text-gray-500">
            <span class="text-primary">POST</span> /api/v1/webhooks<br />
            {<br />
            &nbsp;&nbsp;<span class="text-white">"event":</span> "message.received",<br />
            &nbsp;&nbsp;<span class="text-white">"channel":</span> "instagram",<br />
            &nbsp;&nbsp;<span class="text-white">"payload":</span> { ... }<br />
            }
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px]; }
</style>
