<script setup lang="ts">
import { Zap, Mail, Lock, ArrowRight, Instagram, Github, Chrome, Loader2, Sparkles, AlertCircle } from 'lucide-vue-next'

useSeoMeta({
  title: 'Sign In | Access your AI Dashboard',
  description: 'Log in to your ReplySuite account to manage your AI personas, monitor conversations, and optimize your Instagram engagement.',
})

definePageMeta({
  middleware: 'guest',
  layout: false
})

const supabase = useSupabaseClient()
const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const onboarding = computed(() => route.query.onboarding === 'true')
const verified = computed(() => route.query.verified === 'true')

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

    // If onboarding, we might want to prioritize specific landing
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
  <div class="min-h-screen flex bg-background relative overflow-hidden">
    <!-- Left Side: Visual/Branding (Hidden on mobile) -->
    <div class="hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-[#080808]">
      <!-- Background Accents -->
      <div class="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-primary/10 blur-[120px] rounded-full animate-pulse opacity-50"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary-accent/10 blur-[120px] rounded-full opacity-50"></div>
      
      <!-- Logo -->
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-tr from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap class="text-white w-6 h-6 fill-current" />
        </div>
        <span class="text-xl font-bold tracking-tight">replysuite</span>
      </div>

      <!-- Hero Message -->
      <div class="relative z-10 space-y-8">
        <div class="space-y-4">
          <h2 class="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1]">
            Welcome <br>back to <br><span class="text-primary">intelligence.</span>
          </h2>
          <p class="text-gray-500 text-lg max-w-sm font-medium leading-relaxed">
            Your AI workforce is waiting. Log in to manage your agents and optimize your customer engagement.
          </p>
        </div>

        <div class="flex flex-col gap-6 pt-10">
           <div v-for="feat in [
             { title: 'Real-time Analytics', desc: 'Monitor every conversation as it happens.' },
             { title: 'Advanced RAG', desc: 'Keep your knowledge base updated and sharp.' }
           ]" :key="feat.title" class="flex gap-4">
              <div class="w-1.5 h-12 bg-primary/20 rounded-full overflow-hidden">
                <div class="w-full h-1/2 bg-primary"></div>
              </div>
              <div class="space-y-1">
                <h4 class="text-base font-bold text-white">{{ feat.title }}</h4>
                <p class="text-sm text-gray-500 max-w-[200px]">{{ feat.desc }}</p>
              </div>
           </div>
        </div>
      </div>

      <!-- Footer Message -->
      <div class="relative z-10 flex items-center gap-4 text-gray-600 text-xs font-semibold">
        <span>© 2026 ReplySuite Automation</span>
        <span class="w-12 h-[1px] bg-white/5"></span>
        <span>Premium AI Solutions</span>
      </div>
    </div>

    <!-- Right Side: Form Content -->
    <div class="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-20 relative bg-[#050505]">
      <!-- Mobile Logo (Only visible on small screens) -->
      <div class="lg:hidden absolute top-8 left-8 flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center">
          <Zap class="text-white w-5 h-5 fill-current" />
        </div>
        <span class="text-lg font-bold tracking-tight">replysuite</span>
      </div>

      <div class="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div class="mb-10 text-center lg:text-left">
          <h1 class="text-4xl font-bold tracking-tight mb-3">Sign in</h1>
          <p class="text-gray-500 font-medium leading-relaxed">Access your dashboard and agents workforce.</p>
        </div>

        <!-- Verification Success Alert -->
        <div v-if="verified" class="mb-8 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-4 animate-in fade-in zoom-in duration-500">
           <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles class="w-5 h-5" />
           </div>
           <div>
              <p class="text-sm font-bold text-white">Email verified successfully!</p>
              <p class="text-[11px] text-gray-500">Your account is active. Please sign in to continue to your dashboard.</p>
           </div>
        </div>

        <div>
          <!-- Google Auth -->
          <button @click="signInWithGoogle" :disabled="loading"
            class="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-all mb-10 shadow-lg active:scale-[0.98]">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
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

          <div class="relative mb-10">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/5"></div>
            </div>
            <div class="relative flex justify-center text-xs px-4 font-semibold text-gray-700">
              <span class="bg-[#050505] px-4">Or sign in with email</span>
            </div>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-8">
            <div class="space-y-2">
              <label class="text-xs font-bold text-gray-500">Email address</label>
              <input v-model="email" type="email" required
                class="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-gray-800 text-sm"
                placeholder="name@company.com" />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-gray-500">Password</label>
                <a href="#" class="text-[10px] font-bold text-primary hover:text-white transition-colors">Forgot password?</a>
              </div>
              <input v-model="password" type="password" required
                class="w-full bg-[#0a0a0a] border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-gray-800 text-sm"
                placeholder="••••••••" />
            </div>

            <div v-if="errorMsg" class="text-red-400 text-sm font-semibold leading-relaxed bg-red-400/5 p-4 rounded-2xl border border-red-400/10">
              {{ errorMsg }}
            </div>

            <div class="flex flex-col gap-4 pt-4">
              <button type="submit" :disabled="loading"
                class="w-full h-14 bg-gradient-to-tr from-primary to-primary-accent text-black text-sm font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2">
                <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
                <span v-else>Sign in to account</span>
              </button>
              
              <NuxtLink to="/register" class="w-full py-4 text-center text-xs font-bold text-gray-500 hover:text-white transition-colors border border-white/5 rounded-2xl">
                Don't have an account? <span class="text-primary font-bold">Sign up</span>
              </NuxtLink>
            </div>
          </form>
        </div>

        <p class="mt-12 text-center text-gray-800 text-[11px] font-semibold leading-loose">
          By continuing, you agree to our <br>
          <NuxtLink to="/terms" class="text-gray-600 hover:text-primary transition-colors">Terms of Service</NuxtLink> 
          & 
          <NuxtLink to="/privacy" class="text-gray-600 hover:text-primary transition-colors">Privacy Policy</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
