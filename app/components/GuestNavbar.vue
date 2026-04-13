<script setup lang="ts">
import { Zap, Menu, X, ChevronRight } from 'lucide-vue-next'
import { ref } from 'vue'

const isMenuOpen = ref(false)
const isScrolled = ref(false)
const user = useSupabaseUser()

const navLinks = [
  { name: 'product', href: '/product' },
  { name: 'features', href: '/features' },
  { name: 'pricing', href: '/pricing' },
  { name: 'about', href: '/about' }
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
        ? 'backdrop-blur-xl bg-black/40 border-b border-white/10 shadow-2xl shadow-black/50' 
        : 'bg-transparent border-b border-transparent'
    ]"
  >
    <nav class="max-w-7xl mx-auto px-6 w-full flex items-center justify-between relative">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <div class="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Zap class="text-primary w-6 h-6 fill-current" />
        </div>
        <span class="text-2xl font-bold tracking-tight">replysuite</span>
      </NuxtLink>

    <!-- Desktop Menu -->
    <div class="hidden lg:flex items-center gap-1 p-1 bg-white/[0.02] backdrop-blur-md rounded-full border border-white/10">
      <NuxtLink 
        v-for="link in navLinks" 
        :key="link.name" 
        :to="link.href" 
        class="px-5 py-2 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        active-class="text-primary bg-primary/5"
      >
        {{ link.name }}
      </NuxtLink>
    </div>

    <!-- Right Side -->
    <div class="flex items-center gap-4">
      <ClientOnly>
        <template v-if="!user">
          <NuxtLink to="/login" class="hidden sm:block text-sm font-medium text-gray-400 hover:text-white transition-colors">
            sign in
          </NuxtLink>
          <NuxtLink to="/login" class="btn-gradient px-6 py-2.5 text-sm">
            get started
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/dashboard" class="btn-gradient px-8 py-2.5 text-sm flex items-center gap-2 group">
             dashboard <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </NuxtLink>
        </template>

        <template #fallback>
           <div class="h-10 w-24 bg-white/5 animate-pulse rounded-full"></div>
        </template>
      </ClientOnly>
      
      <!-- Mobile Toggle -->
      <button @click="isMenuOpen = !isMenuOpen" class="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
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
      <div v-if="isMenuOpen" class="absolute top-full left-6 right-6 mt-4 p-6 bg-background-card border border-white/10 rounded-24 shadow-2xl lg:hidden">
        <div class="flex flex-col gap-4">
          <NuxtLink 
            v-for="link in navLinks" 
            :key="link.name" 
            :to="link.href" 
            @click="isMenuOpen = false"
            class="text-lg font-medium text-gray-400 hover:text-primary transition-colors"
          >
            {{ link.name }}
          </NuxtLink>
          <NuxtLink v-if="user" to="/dashboard" @click="isMenuOpen = false" class="text-lg font-medium text-gray-400 hover:text-primary transition-colors">
            dashboard
          </NuxtLink>
          <hr class="border-white/5 my-2" />
          <NuxtLink :to="user ? '/dashboard' : '/login'" @click="isMenuOpen = false" class="btn-gradient w-full text-center py-4 text-sm font-bold tracking-widest uppercase">
            {{ user ? 'go to dashboard' : 'get started' }}
          </NuxtLink>
        </div>
      </div>
    </Transition>
    </nav>
  </header>
</template>
