<script setup lang="ts">
import { Zap, Share2, Globe2, Layers, MessageSquare, Instagram, Twitter } from 'lucide-vue-next'
</script>

<template>
  <footer class="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 space-y-20">
    <div class="grid md:grid-cols-4 gap-16">
      <!-- Brand Section -->
      <div class="md:col-span-2">
        <div class="flex items-center gap-2 mb-8">
          <Zap class="text-primary w-8 h-8 fill-current" />
          <span class="text-2xl font-bold">ReplySuite</span>
        </div>
        <p class="text-gray-500 max-w-sm leading-relaxed mb-8">
          The gold standard in Instagram automation and AI workforce management. Scale your customer support and lead
          generation instantly.
        </p>
        <div class="flex gap-4">
          <a href="#"
            class="p-3 rounded-full bg-white/[0.02] border border-white/5 text-gray-500 hover:text-primary hover:border-primary/20 transition-all">
            <Instagram class="w-5 h-5" />
          </a>
          <a href="#"
            class="p-3 rounded-full bg-white/[0.02] border border-white/5 text-gray-500 hover:text-primary hover:border-primary/20 transition-all">
            <Twitter class="w-5 h-5" />
          </a>
          <a href="#"
            class="p-3 rounded-full bg-white/[0.02] border border-white/5 text-gray-500 hover:text-primary hover:border-primary/20 transition-all">
            <Globe2 class="w-5 h-5" />
          </a>
        </div>
      </div>

      <!-- Links Sections -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-widest text-primary mb-8">Product</h4>
        <ul class="space-y-4 text-sm text-gray-500">
          <li>
            <NuxtLink to="/product" class="hover:text-white transition-colors">AI Chatbot</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/features" class="hover:text-white transition-colors">Multi-Channel DM</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/product#integrations" class="hover:text-white transition-colors">Integrations</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/pricing" class="hover:text-white transition-colors">Pricing & Plans</NuxtLink>
          </li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-widest text-primary mb-8">Company</h4>
        <ul class="space-y-4 text-sm text-gray-500">
          <li>
            <NuxtLink to="/about" class="hover:text-white transition-colors">Our Story</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/about#mission" class="hover:text-white transition-colors">Mission & Values</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/ethics" class="hover:text-white transition-colors">AI Ethics</NuxtLink>
          </li>
          <li>
            <a href="mailto:partnership@replysuite.app" class="hover:text-white transition-colors">Partnerships</a>
          </li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-widest text-primary mb-8">Trust & Legal</h4>
        <ul class="space-y-4 text-sm text-gray-500">
          <li>
            <NuxtLink to="/security" class="hover:text-white transition-colors">Security Posture</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/privacy" class="hover:text-white transition-colors">Privacy Policy</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/terms" class="hover:text-white transition-colors">Terms of Service</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/terms#usage" class="hover:text-white transition-colors">Fair Usage (SLA)</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/cookie" class="hover:text-white transition-colors">Cookie Policy</NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bottom Section -->
    <div
      class="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
      <div class="text-xs text-gray-600">© 2026 ReplySuite. All rights reserved.</div>

      <div class="flex items-center gap-4">
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/5 border border-green-500/10 text-[10px] font-bold text-green-500/80 uppercase tracking-widest">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          All Systems Operational
        </div>
      </div>
    </div>
  </footer>
</template>
