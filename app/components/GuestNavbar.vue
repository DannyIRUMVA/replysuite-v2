<script setup lang="ts">
import { Zap, Menu, X, ChevronRight, Layout, Sparkles, CreditCard, Info, LogIn } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const isMenuOpen = ref(false)
const isScrolled = ref(false)
const user = useSupabaseUser()

const navLinks = [
  { name: 'Product', href: '/product', icon: Layout },
  { name: 'Features', href: '/features', icon: Sparkles },
  { name: 'Pricing', href: '/pricing', icon: CreditCard },
  { name: 'About', href: '/about', icon: Info }
]

onMounted(() => {
  window.addEventListener('scroll', () => {
    isScrolled.value = window.scrollY > 20
  })
})
</script>

<template>
  <header 
    class="fixed top-0 inset-x-0 z-[100] transition-all duration-500 h-[10vh] flex items-center"
    :class="[
      isScrolled 
        ? 'backdrop-blur-xl bg-background/40 border-b border-foreground/10 shadow-2xl shadow-foreground/5' 
        : 'bg-transparent border-b border-foreground/5'
    ]"
  >
    <nav class="max-w-7xl mx-auto px-6 w-full flex items-center justify-between relative">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <div class="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Zap class="text-primary w-6 h-6 fill-current" />
        </div>
        <span class="text-2xl font-bold tracking-tight text-foreground">ReplySuite</span>
      </NuxtLink>

    <!-- Desktop Menu -->
    <div class="hidden lg:flex items-center gap-1 p-1 bg-foreground/[0.02] backdrop-blur-md rounded-full border border-foreground/10">
      <NuxtLink 
        v-for="link in navLinks" 
        :key="link.name" 
        :to="link.href" 
        class="px-5 py-2 rounded-full text-sm font-semibold text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all flex items-center gap-2"
        active-class="text-primary bg-primary/5"
      >
        <component :is="link.icon" class="w-4 h-4" />
        {{ link.name }}
      </NuxtLink>
    </div>

    <!-- Right Side -->
    <div class="flex items-center gap-4">
      <!-- Theme Switcher Desktop -->
      <div class="hidden sm:block">
        <ThemeSwitcher />
      </div>

      <ClientOnly>
        <template v-if="!user">
          <NuxtLink to="/login" class="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-foreground/40 hover:text-foreground transition-all">
            <LogIn class="w-4 h-4" />
            Sign In
          </NuxtLink>
          <NuxtLink to="/login" class="btn-gradient px-6 py-2.5 text-sm">
            Get Started
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/dashboard" class="btn-gradient px-8 py-2.5 text-sm flex items-center gap-2 group">
             Dashboard <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </NuxtLink>
        </template>

        <template #fallback>
           <div class="h-10 w-24 bg-foreground/5 animate-pulse rounded-full"></div>
        </template>
      </ClientOnly>
      
      <!-- Mobile Toggle -->
      <button @click="isMenuOpen = !isMenuOpen" class="lg:hidden p-2 text-foreground/40 hover:text-foreground transition-colors">
        <Menu v-if="!isMenuOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </button>
    </div>

    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-[-10px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[-10px]"
    >
      <div v-if="isMenuOpen" class="absolute top-full left-6 right-6 mt-4 p-6 bg-background-card/95 backdrop-blur-2xl border border-foreground/10 rounded-32 shadow-2xl lg:hidden">
        <div class="flex flex-col gap-2">
          <NuxtLink 
            v-for="link in navLinks" 
            :key="link.name" 
            :to="link.href" 
            @click="isMenuOpen = false"
            class="flex items-center gap-4 px-4 py-3 rounded-2xl text-lg font-semibold text-foreground/40 hover:text-primary hover:bg-foreground/5 transition-all"
          >
            <component :is="link.icon" class="w-6 h-6" />
            {{ link.name }}
          </NuxtLink>
          <NuxtLink v-if="user" to="/dashboard" @click="isMenuOpen = false" class="flex items-center gap-4 px-4 py-3 rounded-2xl text-lg font-semibold text-foreground/40 hover:text-primary hover:bg-foreground/5 transition-all">
            <Layout class="w-6 h-6" />
            Dashboard
          </NuxtLink>
          <hr class="border-foreground/5 my-2" />
          <NuxtLink :to="user ? '/dashboard' : '/login'" @click="isMenuOpen = false" class="btn-gradient w-full text-center py-4 text-sm font-bold tracking-widest uppercase">
            {{ user ? 'go to dashboard' : 'get started' }}
          </NuxtLink>

          <!-- Theme Switcher Mobile -->
          <div class="mt-2">
            <ThemeSwitcher class="!w-full !justify-between !p-2" />
          </div>
        </div>
      </div>
    </Transition>
    </nav>
  </header>
</template>
