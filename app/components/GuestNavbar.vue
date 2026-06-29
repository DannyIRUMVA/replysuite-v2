<script setup lang="ts">
import { Zap, Menu, X, ChevronRight, ChevronDown, Layout, Sparkles, CreditCard, Info, LogIn, Building2 } from 'lucide-vue-next'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const isMenuOpen = ref(false)
const isScrolled = ref(false)
const user = useSupabaseUser()
const route = useRoute()

const productLinks = [
  { name: 'Product overview', href: '/product', icon: Layout, description: 'See how ReplySuite works across customer conversations.' },
  { name: 'Features', href: '/features', icon: Sparkles, description: 'Website chat, WhatsApp, Instagram, bookings, and training.' },
  { name: 'Free tools', href: '/tools', icon: Zap, description: 'AI reply generators for reviews, support, WhatsApp, and bookings.' }
]

const navLinks = [
  { name: 'Pricing', href: '/pricing', icon: CreditCard },
  { name: 'Company', href: '/company', icon: Building2 },
  { name: 'Contact', href: '/contact', icon: Info }
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

watch(() => route.fullPath, () => {
  isMenuOpen.value = false
})
</script>

<template>
  <header class="fixed top-0 inset-x-0 z-[100] transition-all duration-500 min-h-[77px] sm:min-h-[88px] flex items-center" :class="[
    isScrolled
      ? 'backdrop-blur-xl bg-background/40 border-b border-foreground/10 shadow-2xl shadow-foreground/5'
      : 'bg-transparent border-b border-foreground/5'
  ]">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between relative gap-3">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 group min-w-0 flex-shrink">
        <div class="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Zap class="text-primary w-6 h-6 fill-current" />
        </div>
        <span class="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">ReplySuite</span>
      </NuxtLink>

      <!-- Desktop Menu -->
      <div
        class="hidden lg:flex items-center gap-1 p-1 bg-foreground/[0.02] backdrop-blur-md rounded-full border border-foreground/10">
        <div class="group relative">
          <NuxtLink to="/product"
            class="px-4 xl:px-5 py-2 rounded-full text-sm font-semibold text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all flex items-center gap-2"
            active-class="text-primary bg-primary/5">
            <Layout class="w-4 h-4" />
            Product
            <ChevronDown class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" aria-hidden="true" />
          </NuxtLink>
          <div class="pointer-events-none absolute left-1/2 top-full z-[120] w-[280px] -translate-x-1/2 pt-2 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <div class="rounded-2xl border border-foreground/10 bg-background-card p-2 shadow-2xl shadow-black/25">
              <NuxtLink v-for="link in productLinks" :key="link.name" :to="link.href"
                class="flex gap-2.5 rounded-xl p-2 text-left transition hover:bg-foreground/[0.04]">
                <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <component :is="link.icon" class="h-3.5 w-3.5" />
                </div>
                <div>
                  <p class="text-xs font-black text-foreground">{{ link.name }}</p>
                  <p class="mt-0.5 text-[11px] leading-snug text-foreground/60">{{ link.description }}</p>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
        <NuxtLink v-for="link in navLinks" :key="link.name" :to="link.href"
          class="px-4 xl:px-5 py-2 rounded-full text-sm font-semibold text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all flex items-center gap-2"
          active-class="text-primary bg-primary/5">
          <component :is="link.icon" class="w-4 h-4" />
          {{ link.name }}
        </NuxtLink>
      </div>

      <!-- Right Side -->
      <div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <!-- Theme Switcher Desktop -->
        <div class="hidden md:block">
          <ThemeSwitcher />
        </div>

        <ClientOnly>
          <template v-if="!user">
            <NuxtLink to="/login"
              class="hidden md:flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-foreground/60 hover:text-foreground transition-all">
              <LogIn class="w-4 h-4" />
              Sign In
            </NuxtLink>
            <NuxtLink to="/register" class="hidden sm:inline-flex btn-gradient px-5 sm:px-6 py-2.5 text-sm whitespace-nowrap">
              Start Free
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/dashboard" class="hidden sm:inline-flex btn-gradient px-6 sm:px-8 py-2.5 text-sm items-center gap-2 group whitespace-nowrap">
              Dashboard
              <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </NuxtLink>
          </template>

          <template #fallback>
            <div class="h-10 w-24 bg-foreground/5 animate-pulse rounded-full"></div>
          </template>
        </ClientOnly>

        <!-- Mobile Toggle -->
        <button
          type="button"
          :aria-label="isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'"
          :aria-expanded="isMenuOpen"
          aria-controls="mobile-navigation"
          @click="isMenuOpen = !isMenuOpen"
          class="lg:hidden inline-flex items-center justify-center p-2.5 rounded-xl border border-foreground/10 bg-background/70 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-colors">
          <Menu v-if="!isMenuOpen" class="w-6 h-6" aria-hidden="true" />
          <X v-else class="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      <!-- Mobile Menu -->
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-[-10px]"
        enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-[-10px]">
        <div v-if="isMenuOpen"
          id="mobile-navigation"
          class="absolute top-full left-3 right-3 sm:left-6 sm:right-6 mt-2 p-3 sm:p-4 bg-background-card border border-foreground/10 rounded-2xl shadow-2xl shadow-black/25 lg:hidden max-h-[calc(100vh-5.5rem)] overflow-y-auto">
          <div class="flex flex-col gap-2">
            <div class="rounded-xl border border-foreground/10 bg-background p-1.5">
              <div class="flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                <Layout class="w-3.5 h-3.5" />
                Product
              </div>
              <NuxtLink v-for="link in productLinks" :key="link.name" :to="link.href" @click="isMenuOpen = false"
                class="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-foreground/65 hover:text-primary hover:bg-foreground/5 transition-all">
                <component :is="link.icon" class="w-4 h-4" />
                {{ link.name }}
              </NuxtLink>
            </div>
            <NuxtLink v-for="link in navLinks" :key="link.name" :to="link.href" @click="isMenuOpen = false"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/65 hover:text-primary hover:bg-foreground/5 transition-all">
              <component :is="link.icon" class="w-4 h-4" />
              {{ link.name }}
            </NuxtLink>
            <NuxtLink v-if="user" to="/dashboard" @click="isMenuOpen = false"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-foreground/65 hover:text-primary hover:bg-foreground/5 transition-all">
              <Layout class="w-4 h-4" />
              Dashboard
            </NuxtLink>
            <hr class="border-foreground/5 my-1" />
            <div v-if="!user" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <NuxtLink to="/login" @click="isMenuOpen = false"
                class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-foreground/10 text-xs font-bold text-foreground/70 hover:text-foreground hover:bg-foreground/[0.03] transition-all">
                <LogIn class="w-3.5 h-3.5" />
                Sign In
              </NuxtLink>
              <NuxtLink to="/register" @click="isMenuOpen = false"
                class="btn-gradient w-full text-center py-2.5 text-xs font-bold tracking-widest uppercase">
                start free
              </NuxtLink>
            </div>
            <NuxtLink v-else :to="user ? '/dashboard' : '/login'" @click="isMenuOpen = false"
              class="btn-gradient w-full text-center py-3 text-xs font-bold tracking-widest uppercase mt-1">
              go to dashboard
            </NuxtLink>

            <!-- Theme Switcher Mobile -->
            <div class="mt-2 flex justify-end">
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </Transition>
    </nav>
  </header>
</template>
