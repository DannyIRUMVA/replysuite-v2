<script setup lang="ts">
import { Users, MessageSquare, Twitter, Github, Disc, Share2, Heart, ArrowRight, Zap } from 'lucide-vue-next'

useSeoMeta({
  title: 'Community | ReplySuite AI Collective',
  description: 'Join thousands of brands and developers building the future of automated engagement.',
})

definePageMeta({
  layout: 'default'
})

const platforms = [
  { name: 'Discord', desc: 'Join our developer hub for real-time support and collaboration.', icon: Disc, color: 'text-[#5865F2]' },
  { name: 'Twitter / X', desc: 'Follow us for the latest AI trends and platform updates.', icon: Twitter, color: 'text-foreground' },
  { name: 'GitHub', desc: 'Contribute to our open-source tools and SDKs.', icon: Github, color: 'text-foreground/40' }
]
</script>

<template>
  <div class="community-compact relative min-h-screen overflow-x-hidden">
    <!-- Hero -->
    <section class="relative mx-auto max-w-[72rem] overflow-hidden px-4 py-10 text-center sm:px-6 md:py-12">
      <div class="absolute inset-x-0 top-8 mx-auto h-56 w-[58%] rounded-full bg-primary/[0.08] blur-[110px] -z-10"></div>
      <span class="badge-gradient mb-4">Collective</span>
      <h1 class="mx-auto max-w-4xl text-3xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-4xl lg:text-[3.15rem]">
        Built for <br />
        <span class="text-gradient">Builders.</span>
      </h1>
      <p class="mx-auto mt-4 max-w-3xl text-sm font-semibold leading-6 text-foreground/60 md:text-[0.95rem]">
        Join the ecosystem of forward-thinking brands, agencies, and developers scaling human connection with AI.
      </p>
    </section>

    <!-- Platforms -->
    <section class="mx-auto max-w-[72rem] px-4 py-10 sm:px-6 md:py-12">
      <div class="grid gap-4 md:grid-cols-3">
        <div v-for="p in platforms" :key="p.name" class="group rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 text-center shadow-sm shadow-black/5 backdrop-blur-xl transition-all hover:border-primary/20">
          <div :class="['mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-foreground/5 transition-transform duration-500 group-hover:scale-105', p.color]">
            <component :is="p.icon" class="h-4 w-4" />
          </div>
          <h3 class="mb-2 text-lg font-bold tracking-tight text-foreground">{{ p.name }}</h3>
          <p class="mb-5 text-sm font-medium leading-6 text-foreground/55">{{ p.desc }}</p>
          <a href="#" class="btn-gradient-outline inline-flex items-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
            Join {{ p.name }}
            <ArrowRight class="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>

    <!-- Stats / Community Love -->
    <section class="relative mx-auto max-w-[72rem] overflow-hidden border-t border-foreground/5 px-4 py-10 sm:px-6 md:py-12">
      <div class="absolute bottom-0 left-0 h-full w-1/3 bg-primary/[0.05] blur-[90px]"></div>
      <div class="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 class="text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">
            A Growing <br />
            <span class="text-gradient leading-none">Network.</span>
          </h2>
          <div class="mt-6 grid grid-cols-2 gap-4">
            <div v-for="s in [
              { label: 'Community Members', value: '12k+' },
              { label: 'Conversations / Mo', value: '2.5M+' },
              { label: 'Integrations Built', value: '450+' },
              { label: 'Developer Stars', value: '1.2k+' }
            ]" :key="s.label">
              <div class="mb-1 text-2xl font-extrabold tracking-[-0.035em] text-foreground">{{ s.value }}</div>
              <div class="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{{ s.label }}</div>
            </div>
          </div>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl">
             <div class="mb-4 flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-foreground/10 text-xs font-bold">AI</div>
                <div>
                   <div class="text-foreground font-bold tracking-tight">Alex Rivera</div>
                   <div class="text-xs text-foreground/40 font-medium">Head of Growth @ TechScale</div>
                </div>
             </div>
             <p class="mb-5 text-sm italic font-medium leading-6 text-foreground/55">
              "The ReplySuite community is hands-down the best place to learn about RAG and AI customer support. The weekly office hours have been a game changer for our bot's performance."
             </p>
             <div class="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                Verified Partner
                <Heart class="w-3 h-3 fill-current" />
             </div>
          </div>

          <div class="rounded-[1rem] border border-foreground/10 bg-background-card/45 p-5 shadow-sm shadow-black/5 backdrop-blur-xl">
             <div class="mb-4 flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-foreground/10 text-xs font-bold">SM</div>
                <div>
                   <div class="text-foreground font-bold tracking-tight">Sarah Miller</div>
                   <div class="text-xs text-foreground/40 font-medium">CEO @ ModeLuxury</div>
                </div>
             </div>
             <p class="mb-5 text-sm italic font-medium leading-6 text-foreground/55">
              "Switching from ManyChat to ReplySuite felt like moving from a toy to a professional instrument. The level of AI precision and the supportive developer community is unmatched."
             </p>
             <div class="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
                Elite Customer
                <Zap class="w-3 h-3 fill-current" />
             </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="mx-auto max-w-[64rem] px-4 py-10 text-center sm:px-6 md:py-12">
       <div class="group relative overflow-hidden rounded-[1rem] border border-primary/10 bg-primary/[0.03] p-5 shadow-sm shadow-black/5 md:p-6">
          <div class="absolute inset-0 bg-primary/[0.05] opacity-0 blur-[90px] transition-opacity group-hover:opacity-100"></div>
          <Zap class="relative z-10 mx-auto mb-4 h-8 w-8 text-primary transition-transform group-hover:scale-105" />
          <h2 class="relative z-10 text-2xl font-extrabold tracking-[-0.035em] text-foreground md:text-3xl">Ready to Scale?</h2>
          <p class="relative z-10 mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-foreground/55">Join thousands of brands who have already automated their growth with ReplySuite.</p>
          <NuxtLink to="/register" class="btn-gradient relative z-10 mt-5 inline-flex items-center gap-2 rounded-[0.78rem] px-5 py-3 text-sm font-bold">
             Join the Collective
             <ArrowRight class="h-4 w-4" />
          </NuxtLink>
       </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[1rem]; }
.btn-gradient-outline {
  @apply rounded-[0.78rem] border border-foreground/10 font-bold text-foreground transition-all hover:border-primary/50;
}
</style>
