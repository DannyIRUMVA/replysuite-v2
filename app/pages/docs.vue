<script setup lang="ts">
import { Book, Code, Zap, Smartphone, Shield, Search, ArrowRight, MessageSquare, Globe, BarChart3, Scale, Instagram, Calendar, Clock } from 'lucide-vue-next'

useSeoMeta({
  title: 'Documentation | ReplySuite AI Guides',
  description: 'Everything you need to know about setting up and scaling with ReplySuite. From Instagram Auto-DM to custom API integrations.',
})

definePageMeta({
  layout: 'default'
})

const categories = [
  {
    title: 'Getting Started',
    icon: Zap,
    links: ['Quick Start Guide', 'Connecting Channels', 'Your First Chatbot', 'Workspace Settings', 'Understanding Credits', 'Team Onboarding']
  },
  {
    title: 'AI Training',
    icon: Book,
    links: ['Knowledge Base Setup', 'URL Scraping', 'File Uploads (PDF/Text)', 'Tone of Voice Guide', 'Prompt Engineering', 'Context Injection']
  },
  {
    title: 'Integrations',
    icon: Code,
    links: ['Instagram DM Setup', 'WhatsApp Business', 'Website Widget', 'Zapier Workflows', 'Shopify Sync', 'Custom Webhooks']
  },
  {
    title: 'Advanced',
    icon: Shield,
    links: ['REST API Reference', 'Webhook Security', 'Custom Styling', 'Team Permissions', 'SSO Configuration', 'Audit Logs']
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    links: ['Conversion Tracking', 'Sentiment Analysis', 'Agent Performance', 'Data Export', 'ROI Reporting']
  },
  {
    title: 'Compliance',
    icon: Scale,
    links: ['GDPR Compliance', 'AI Act Readiness', 'Data Sovereignty', 'Encryption Standards', 'Privacy Controls']
  }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero / Search -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <span class="badge-gradient mb-10">Knowledge Base</span>
      <h1 class="text-5xl sm:text-7xl md:text-8xl font-extrabold mb-12 tracking-tighter text-foreground">
        How can we <br />
        <span class="text-gradient">Help?</span>
      </h1>
      <div class="max-w-2xl mx-auto relative group">
        <Search class="absolute left-6 top-1/2 -translate-y-1/2 text-foreground/40 w-6 h-6 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Search documentation, guides, and API..." 
          class="w-full bg-foreground/[0.03] border border-foreground/10 rounded-full py-6 pl-16 pr-8 text-lg focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/30"
        />
      </div>
    </section>

    <!-- Category Grid -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div v-for="cat in categories" :key="cat.title" class="glass-card p-10 border-foreground/5 hover:border-primary/20 transition-all group">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
            <component :is="cat.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-xl font-bold text-foreground mb-8 tracking-tight">{{ cat.title }}</h3>
          <ul class="space-y-4">
            <li v-for="link in cat.links" :key="link">
              <a href="#" class="text-sm text-foreground/50 hover:text-primary transition-colors flex items-center justify-between group/link font-medium">
                {{ link }}
                <ArrowRight class="w-3 h-3 opacity-0 group-link:opacity-100 -translate-x-2 group-link:translate-x-0 transition-all" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Featured Guides -->
    <section class="max-w-7xl mx-auto px-6 py-40 border-t border-foreground/5">
      <h2 class="text-3xl font-bold text-foreground mb-16 tracking-tight">Popular Tutorials</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="guide in [
          { title: 'Scaling Instagram Engagement', icon: Instagram, color: 'text-pink-500' },
          { title: 'Training AI on your Website', icon: Globe, color: 'text-blue-500' },
          { title: 'Automating Customer Support', icon: MessageSquare, color: 'text-green-500' }
        ]" :key="guide.title" class="p-8 rounded-[40px] bg-foreground/[0.02] border border-foreground/5 hover:bg-foreground/[0.04] transition-all flex items-center gap-6 group cursor-pointer">
          <div :class="['w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center shrink-0', guide.color]">
            <component :is="guide.icon" class="w-8 h-8" />
          </div>
          <div>
            <h4 class="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{{ guide.title }}</h4>
            <span class="text-xs text-foreground/30 font-bold uppercase tracking-widest mt-1 block">5 min read</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Support Footer -->
    <section class="max-w-5xl mx-auto px-6 py-40 text-center">
       <div class="p-16 rounded-[64px] bg-foreground/[0.02] border border-foreground/5 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[100px]"></div>
          <h3 class="text-3xl font-bold text-foreground mb-6 tracking-tight">Still have questions?</h3>
          <p class="text-foreground/50 mb-10 font-medium leading-relaxed">Our support team is available 24/7 to help you with your implementation.</p>
          <NuxtLink to="/contact" class="btn-gradient px-10 py-5 inline-flex items-center gap-3">
             Contact Support
             <MessageSquare class="w-5 h-5 fill-current" />
          </NuxtLink>
       </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px] bg-foreground/[0.01]; }
</style>
