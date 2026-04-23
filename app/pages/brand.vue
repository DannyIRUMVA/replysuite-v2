<script setup lang="ts">
import { Download, Copy, Zap, Image, Palette, Type, Layout, ArrowRight, ShieldCheck } from 'lucide-vue-next'

useSeoMeta({
  title: 'Brand Assets | ReplySuite Identity Guidelines',
  description: 'Download official logos, colors, and typography for ReplySuite. Ensure consistency when featuring our brand.',
})

definePageMeta({
  layout: 'default'
})

const colors = [
  { name: 'ReplySuite Gold', hex: '#D4AF37', usage: 'Primary Brand Color', class: 'bg-[#D4AF37]' },
  { name: 'Absolute Black', hex: '#000000', usage: 'Primary Background', class: 'bg-[#000000] border border-white/10' },
  { name: 'Elite Gray', hex: '#6B7280', usage: 'Secondary Text', class: 'bg-[#6B7280]' }
]
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Hero -->
    <section class="max-w-7xl mx-auto px-6 pt-32 pb-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-primary/5 blur-[120px] rounded-full -z-10"></div>
      <span class="badge-gradient mb-10">Media Kit</span>
      <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter leading-[0.85] text-white">
        Design & <br />
        <span class="text-gradient">Identity.</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
        The official brand assets and guidelines for ReplySuite. Please respect our identity when featuring us.
      </p>
    </section>

    <!-- Logos -->
    <section class="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
      <div class="flex items-center justify-between mb-16">
        <h2 class="text-3xl font-bold text-white tracking-tight flex items-center gap-4">
          <Image class="w-8 h-8 text-primary" />
          Logos & Marks
        </h2>
        <button class="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:translate-x-2 transition-transform">
          Download All (.ZIP)
          <Download class="w-4 h-4" />
        </button>
      </div>
      
      <div class="grid md:grid-cols-2 gap-8">
        <div v-for="logo in ['Full Logo (Light)', 'Full Logo (Dark)', 'Icon Mark (Gold)', 'Icon Mark (White)']" :key="logo" class="glass-card aspect-video bg-[#050505] flex flex-col items-center justify-center border-white/5 relative group cursor-pointer overflow-hidden">
          <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Zap :class="['w-20 h-20 mb-6 group-hover:scale-110 transition-transform duration-700', logo.includes('Gold') ? 'text-primary fill-current' : 'text-white']" />
          <span class="text-xs font-bold text-gray-600 uppercase tracking-widest">{{ logo }}</span>
          <div class="absolute bottom-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
             <button class="px-4 py-2 bg-white/5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest hover:bg-primary hover:text-black transition-all">SVG</button>
             <button class="px-4 py-2 bg-white/5 rounded-full text-[10px] font-bold text-white uppercase tracking-widest hover:bg-primary hover:text-black transition-all">PNG</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Colors -->
    <section class="max-w-7xl mx-auto px-6 py-40 border-t border-white/5">
      <h2 class="text-3xl font-bold text-white mb-16 tracking-tight flex items-center gap-4">
        <Palette class="w-8 h-8 text-primary" />
        Color Palette
      </h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="c in colors" :key="c.name" class="glass-card p-10 border-white/5 group">
          <div :class="['w-full aspect-square rounded-[32px] mb-10 group-hover:scale-[0.98] transition-transform', c.class]"></div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-white tracking-tight">{{ c.name }}</h3>
            <button class="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-primary transition-all">
              <Copy class="w-4 h-4" />
            </button>
          </div>
          <div class="text-primary font-mono text-sm font-bold mb-2">{{ c.hex }}</div>
          <div class="text-xs text-gray-600 font-bold uppercase tracking-widest">{{ c.usage }}</div>
        </div>
      </div>
    </section>

    <!-- Guidelines -->
    <section class="max-w-5xl mx-auto px-6 py-40 border-t border-white/5 text-center">
       <div class="p-16 rounded-[64px] bg-white/[0.02] border border-white/5 relative">
          <ShieldCheck class="w-12 h-12 text-primary mx-auto mb-10" />
          <h2 class="text-3xl font-bold text-white mb-6 tracking-tight">Legal Usage</h2>
          <p class="text-gray-500 mb-10 font-medium leading-relaxed">
            Please do not alter the logo, colors, or spacing. Do not use our brand to imply partnership or endorsement without explicit written consent from our legal team.
          </p>
          <NuxtLink to="/contact" class="text-white font-bold hover:text-primary transition-colors flex items-center justify-center gap-2 group">
             Contact Legal Team
             <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </NuxtLink>
       </div>
    </section>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px] bg-white/[0.01]; }
</style>
