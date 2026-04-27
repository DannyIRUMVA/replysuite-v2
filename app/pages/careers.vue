<script setup lang="ts">
import { Rocket, Sparkles, Heart, Zap, ArrowRight, Users, Globe } from 'lucide-vue-next'

useSeoMeta({
  title: 'Careers | Join the ReplySuite Team',
  description: 'Help us build the next generation of AI-driven brand automation. We’re looking for bold thinkers and engineering elites.',
})

definePageMeta({
  layout: 'default'
})

const perks = [
  { title: 'Remote-First', icon: Globe, desc: 'Work from anywhere in the world with our distributed team.' },
  { title: 'Elite Talent', icon: Sparkles, desc: 'Collaborate with top-tier engineers and creative minds.' },
  { title: 'Health & Wellness', icon: Heart, desc: 'Comprehensive health plans and wellness stipends.' },
  { title: 'Growth Budget', icon: Rocket, desc: 'Annual budget for books, courses, and conferences.' }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <span class="badge-gradient mb-10">Careers</span>
      <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-foreground">
        Build the <br />
        <span class="text-gradient">Future of AI.</span>
      </h1>
      <p class="text-xl text-foreground/40 max-w-2xl mx-auto leading-relaxed font-medium">
        We are a team of obsessed builders creating the infrastructure for the next generation of brands.
      </p>
    </section>

    <!-- Perks -->
    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40">
        <div v-for="p in perks" :key="p.title" class="glass-card p-10 border-foreground/10 hover:border-primary/20 transition-all text-center group">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform">
            <component :is="p.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-xl font-bold text-foreground mb-4 tracking-tight">{{ p.title }}</h3>
          <p class="text-foreground/40 text-sm leading-relaxed font-medium">{{ p.desc }}</p>
        </div>
      </div>

      <!-- Institutional Culture -->
      <div class="bg-foreground/[0.02] border border-foreground/10 p-16 md:p-32 rounded-[64px] mb-40 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px]"></div>
        <div class="max-w-3xl relative z-10">
          <h2 class="text-4xl md:text-6xl font-extrabold text-foreground mb-8 tracking-tighter leading-tight">
            Obsessed with <br />
            <span class="text-gradient">Craft.</span>
          </h2>
          <p class="text-foreground/40 text-lg leading-relaxed mb-10 font-medium">
            At ReplySuite, we don't believe in "good enough." We believe in creating tools that feel like magic. Our culture is built on extreme ownership, radical transparency, and a relentless pursuit of excellence.
          </p>
          <div class="flex items-center gap-6">
            <div class="flex -space-x-4">
              <div v-for="i in 4" :key="i" class="w-12 h-12 rounded-full border-2 border-background bg-foreground/10 flex items-center justify-center text-[10px] font-bold text-foreground uppercase tracking-widest">
                {{ ['RS', 'JD', 'KL', 'AM'][i-1] }}
              </div>
            </div>
            <p class="text-sm text-foreground/40 font-bold uppercase tracking-widest">Join 12+ elites</p>
          </div>
        </div>
      </div>

      <!-- Open Roles Placeholder -->
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold text-foreground mb-12 tracking-tight">Open Roles</h2>
        <div class="space-y-4">
          <div v-for="role in ['Full Stack AI Engineer', 'Senior Product Designer', 'Growth Marketing Lead']" :key="role" class="glass-card p-8 border-foreground/10 hover:border-primary/20 transition-all flex items-center justify-between group cursor-pointer">
            <h4 class="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{{ role }}</h4>
            <div class="flex items-center gap-4 text-foreground/40 font-bold text-xs uppercase tracking-widest">
              Remote
              <ArrowRight class="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </div>
        <p class="mt-20 text-foreground/40 font-medium leading-relaxed">
          Don't see a role that fits? We’re always looking for exceptional talent. <br />
          Email us at <a href="mailto:careers@replysuite.app" class="text-primary hover:underline font-bold">careers@replysuite.app</a>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px]; }
</style>
