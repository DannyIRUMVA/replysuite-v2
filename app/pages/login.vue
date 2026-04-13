<script setup lang="ts">
import { Zap } from 'lucide-vue-next'

definePageMeta({
  middleware: 'guest',
  layout: false
})

const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const { track } = useActivity()

const handleLogin = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) throw error

    // Track successful login
    await track('LOGIN_SUCCESS', { email: email.value })

    navigateTo('/dashboard')
  } catch (err: any) {
    errorMsg.value = err.message
    // Track failed login
    await track('LOGIN_FAILED', { email: email.value, error: err.message })
  } finally {
    loading.value = false
  }
}


const signInWithGoogle = async () => {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/confirm`,
      },
    })
    if (error) throw error
  } catch (err: any) {
    errorMsg.value = err.message
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
    <!-- Background Accents -->
    <div class="absolute top-0 left-0 w-full h-full bg-primary/5 blur-[120px] -z-10 rotate-12"></div>
    <div class="absolute bottom-0 right-0 w-full h-full bg-primary-accent/5 blur-[120px] -z-10 -rotate-12"></div>

    <div class="w-full max-w-md">
      <div class="text-center mb-10">
        <NuxtLink to="/"
          class="inline-flex w-14 h-14 bg-gradient-to-tr from-primary to-primary-accent rounded-2xl items-center justify-center mb-6 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
          <Zap class="text-white w-8 h-8 fill-current" />
        </NuxtLink>
        <h1 class="text-4xl font-bold tracking-tight">Access your Dashboard</h1>
        <p class="text-gray-400 mt-3 text-lg">Start building your AI workforce</p>
      </div>

      <div class="glass-card p-10 border-white/5 shadow-2xl !bg-[#0f0f0f]">
        <button @click="signInWithGoogle" :disabled="loading"
          class="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-white text-gray-900 font-bold hover:bg-gray-100 transition-all mb-8 shadow-lg active:scale-[0.98]">
          <svg class="w-6 h-6" viewBox="0 0 24 24">
            <path fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div class="relative mb-8">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-white/5"></div>
          </div>
          <div class="relative flex justify-center text-xs px-4">
            <span class="bg-[#0f0f0f] px-4 text-gray-500 font-bold tracking-widest">or email login</span>
          </div>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-2 tracking-tight">email address</label>
            <input v-model="email" type="email" required
              class="w-full bg-background border border-white/5 rounded-full px-6 py-4 focus:outline-none focus:border-primary transition-all text-white placeholder-gray-700 shadow-inner"
              placeholder="name@company.com" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-bold text-gray-500 tracking-tight">password</label>
              <a href="#" class="text-xs text-primary hover:text-white transition-colors">Forgot?</a>
            </div>
            <input v-model="password" type="password" required
              class="w-full bg-background border border-white/5 rounded-full px-6 py-4 focus:outline-none focus:border-primary transition-all text-white placeholder-gray-700 shadow-inner"
              placeholder="••••••••" />
          </div>

          <div v-if="errorMsg" class="text-red-400 text-sm bg-red-400/10 p-4 rounded-24 border border-red-400/20">
            {{ errorMsg }}
          </div>

          <div class="flex flex-col gap-4">
            <button type="submit" :disabled="loading"
              class="w-full btn-gradient py-4 flex items-center justify-center gap-2 text-lg">
              <span v-if="loading">Processing...</span>
              <span v-else>Login</span>
            </button>
            <p class="text-center text-sm text-gray-500">
              Don't have an account?
              <NuxtLink to="/register" class="text-primary font-bold hover:underline">Sign up free</NuxtLink>
            </p>
          </div>
        </form>
      </div>

      <p class="text-center text-gray-600 text-[10px] mt-12 px-8 flex flex-wrap justify-center gap-2 tracking-widest">
        <span>© 2026 replysuite</span>
        <span class="text-white/5">•</span>
        <NuxtLink to="/terms" class="hover:text-white transition-colors">terms of service</NuxtLink>
        <span class="text-white/5">•</span>
        <NuxtLink to="/privacy" class="hover:text-white transition-colors">privacy policy</NuxtLink>
      </p>
    </div>
  </div>
</template>
