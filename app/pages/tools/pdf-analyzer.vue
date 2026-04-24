<script setup lang="ts">
import { FileText, Search, Zap, ArrowRight, ShieldCheck, Cpu } from 'lucide-vue-next'

useSeoMeta({
  title: 'Free AI PDF Content Analyzer | ReplySuite Tools',
  description: 'Instantly extract insights, summaries, and Q&A from any business PDF using advanced AI. No registration required for the first 3 files.',
  ogTitle: 'ReplySuite Free PDF AI Analyzer',
  ogDescription: 'The fastest way to train AI on your business documents. Try it free.',
})

definePageMeta({
  layout: 'default'
})

const isUploading = ref(false)
const file = ref<File | null>(null)

const handleUpload = () => {
  isUploading.value = true
  // Mock logic for lead magnet
  setTimeout(() => {
    isUploading.value = false
    navigateTo('/register?ref=pdf-tool')
  }, 2000)
}
</script>

<template>
  <div class="relative min-h-screen pt-32 pb-20 overflow-hidden">
    <!-- Background Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[150px] -z-10 rounded-full"></div>

    <div class="max-w-7xl mx-auto px-6">
      <!-- Hero -->
      <div class="text-center max-w-3xl mx-auto mb-20">
        <span class="badge-gradient mb-8">Free Utility</span>
        <h1 class="text-6xl md:text-8xl font-extrabold mb-10 tracking-tighter leading-[0.85] text-white">
          PDF AI <br />
          <span class="text-gradient">Analyzer.</span>
        </h1>
        <p class="text-xl text-gray-400 font-medium leading-relaxed mb-12">
          Upload any business document to instantly extract key insights, generate summaries, and prepare it for your AI Agent training.
        </p>

        <!-- Dropzone -->
        <div 
          @click="$refs.fileInput.click()"
          class="glass-card p-16 border-2 border-dashed border-white/10 hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
        >
          <input type="file" ref="fileInput" class="hidden" @change="e => file = e.target.files[0]" />
          
          <div class="relative z-10 flex flex-col items-center">
            <div class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
               <FileText class="w-10 h-10 text-primary" />
            </div>
            <h3 class="text-2xl font-bold text-white mb-4">
              {{ file ? file.name : 'Drop your PDF here' }}
            </h3>
            <p class="text-gray-500 font-medium mb-10">Max file size: 10MB. We support multi-page business reports.</p>
            
            <button 
              v-if="file"
              @click.stop="handleUpload"
              class="btn-gradient px-12 py-5 text-lg inline-flex items-center gap-3"
            >
              <Zap v-if="!isUploading" class="w-5 h-5 fill-current" />
              <div v-else class="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
              {{ isUploading ? 'Analyzing Document...' : 'Analyze Now' }}
            </button>
            <div v-else class="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">
               Click to browse or drag and drop
            </div>
          </div>
        </div>
      </div>

      <!-- Feature Grid (SEO Value) -->
      <div class="grid md:grid-cols-3 gap-8 mb-40">
        <div v-for="feat in [
          { title: 'Instant Extraction', desc: 'No more manual reading. Get the facts in seconds.', icon: Search },
          { title: 'Agent Ready', desc: 'Formatted perfectly for ReplySuite AI training.', icon: Cpu },
          { title: 'Secure & Private', desc: 'Files are processed at the edge and never stored.', icon: ShieldCheck },
        ]" :key="feat.title" class="glass-card p-10 border-white/5">
          <div class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-8">
            <component :is="feat.icon" class="w-6 h-6 text-gray-400" />
          </div>
          <h4 class="text-xl font-bold text-white mb-4 tracking-tight">{{ feat.title }}</h4>
          <p class="text-gray-500 font-medium leading-relaxed">{{ feat.desc }}</p>
        </div>
      </div>

      <!-- Conversion Footer -->
      <section class="bg-white/[0.02] p-16 rounded-[48px] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-12">
        <div class="max-w-xl">
          <h2 class="text-4xl font-extrabold text-white mb-6 tracking-tight">Like the results?</h2>
          <p class="text-gray-400 font-medium leading-relaxed">
            Create your full AI Agent in under 2 minutes. Train it on your business data and deploy it to Instagram, WhatsApp, or your website today.
          </p>
        </div>
        <NuxtLink to="/register" class="btn-gradient px-10 py-5 text-lg inline-flex items-center gap-3 flex-shrink-0 group">
          Scale with ReplySuite
          <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
        </NuxtLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.glass-card { @apply rounded-[40px]; }
</style>
