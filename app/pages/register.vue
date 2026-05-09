<script setup lang="ts">
import { Zap, Loader2 } from 'lucide-vue-next'

definePageMeta({
  middleware: 'guest',
  layout: false
})

useHead({
  title: 'Create account | ReplySuite'
})

const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const fullName = ref('')
const companyName = ref('')
const industry = ref('')
const phone = ref('')

const currentStep = ref(1)
const steps = [
  { id: 1, title: 'You', description: 'About you' },
  { id: 2, title: 'Business', description: 'Your business' },
  { id: 3, title: 'Account', description: 'Sign in details' }
]

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const industries = [
  'E-commerce & Retail',
  'Software & SaaS',
  'Real Estate',
  'Professional Services',
  'Healthcare',
  'Education',
  'Other'
]

const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const handleSignup = async () => {
  if (currentStep.value < 3) {
    nextStep()
    return
  }

  try {
    loading.value = true
    errorMsg.value = ''
    successMsg.value = ''

    const response = await $fetch('/api/auth/signup', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        fullName: fullName.value,
        companyName: companyName.value,
        industry: industry.value,
        phone: phone.value
      }
    })

    if (response.success) {
      successMsg.value = 'Check your email for your verification code.'
    }
  } catch (err: any) {
    errorMsg.value = err.data?.statusMessage || err.message || 'Signup failed'
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
    <div class="hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col justify-between p-12 overflow-hidden border-r border-foreground/5 bg-background-card">
      <div class="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-primary/10 blur-[120px] rounded-full animate-pulse opacity-50"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary-accent/10 blur-[120px] rounded-full opacity-50"></div>

      <div class="relative z-10 flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-tr from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap class="text-white w-6 h-6 fill-current" />
        </div>
        <span class="text-xl font-bold tracking-tight text-foreground">replysuite</span>
      </div>

      <div class="relative z-10 space-y-8">
        <div class="space-y-4">
          <h2 class="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1] text-foreground">
            Create your account.
            Start building your chatbot.
          </h2>
          <p class="text-foreground/50 text-lg max-w-sm font-medium leading-relaxed">
            Set up your account, train on your content, and launch on your website first.
          </p>
        </div>

        <div class="flex flex-col gap-6 pt-10">
          <div v-for="feat in [
            { title: 'Use your own content', desc: 'Train with website pages, PDFs, and custom text.' },
            { title: 'Launch step by step', desc: 'Start simple and upgrade when you need more.' }
          ]" :key="feat.title" class="flex gap-4">
            <div class="w-1.5 h-12 bg-primary/20 rounded-full overflow-hidden">
              <div class="w-full h-1/2 bg-primary"></div>
            </div>
            <div class="space-y-1">
              <h4 class="text-base font-bold text-foreground">{{ feat.title }}</h4>
              <p class="text-sm text-foreground/50 max-w-[220px]">{{ feat.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="relative z-10 flex items-center gap-4 text-foreground/50 text-xs font-semibold">
        <span>© 2026 ReplySuite</span>
        <span class="w-12 h-[1px] bg-foreground/10"></span>
        <span>AI chatbot for website and WhatsApp</span>
      </div>
    </div>

    <div class="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-20 relative bg-background">
      <div class="lg:hidden absolute top-8 left-8 flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-tr from-primary to-primary-accent rounded-lg flex items-center justify-center">
          <Zap class="text-foreground w-5 h-5 fill-current" />
        </div>
        <span class="text-lg font-bold tracking-tight">replysuite</span>
      </div>

      <div class="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div class="mb-10 text-center lg:text-left">
          <h1 class="text-4xl font-bold tracking-tight mb-3 text-foreground">Create account</h1>
          <p class="text-foreground/50 font-medium leading-relaxed">Start free and set up your first chatbot.</p>
        </div>

        <div v-if="successMsg" class="bg-primary/5 border border-primary/20 p-8 rounded-[2rem] text-center animate-in fade-in zoom-in duration-300">
          <div class="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <Zap class="text-primary w-8 h-8 fill-current" />
          </div>
          <h3 class="text-xl font-bold text-foreground tracking-tight mb-2">Check your inbox</h3>
          <p class="text-foreground/50 font-medium mb-8 text-base leading-relaxed">{{ successMsg }}</p>
          <NuxtLink to="/login" class="inline-block py-4 px-10 bg-primary text-black text-sm font-bold rounded-full hover:scale-105 transition-all">Go to sign in</NuxtLink>
        </div>

        <div v-else>
          <button @click="signInWithGoogle" :disabled="loading" class="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90 transition-all mb-10 shadow-lg active:scale-[0.98]">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div class="relative mb-10">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-foreground/5"></div>
            </div>
            <div class="relative flex justify-center text-xs px-4 font-semibold text-foreground/50">
              <span class="bg-background px-4">Or create an account with email</span>
            </div>
          </div>

          <form @submit.prevent="handleSignup" class="space-y-8">
            <div class="flex items-center justify-between mb-12 px-2">
              <div v-for="step in steps" :key="step.id" class="flex flex-col items-center gap-3 relative flex-1">
                <div :class="[
                  'w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-700 shadow-lg',
                  currentStep >= step.id ? 'bg-primary text-black scale-110 shadow-primary/20' : 'bg-foreground/5 text-foreground/50'
                ]">
                  {{ step.id }}
                </div>
                <span class="text-[10px] font-bold transition-colors duration-500" :class="currentStep >= step.id ? 'text-foreground' : 'text-foreground/50'">{{ step.title }}</span>
                <div v-if="step.id < 3" :class="[
                  'absolute left-[60%] top-5 w-[80%] h-[1px] -z-10 transition-all duration-1000',
                  currentStep > step.id ? 'bg-primary' : 'bg-foreground/5'
                ]"></div>
              </div>
            </div>

            <div v-if="currentStep === 1" class="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-foreground/50">Full name</label>
                  <input v-model="fullName" type="text" required class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm" placeholder="John Doe" />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-foreground/50">Phone</label>
                  <input v-model="phone" type="tel" class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm" placeholder="+250..." />
                </div>
              </div>
            </div>

            <div v-if="currentStep === 2" class="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div class="space-y-2">
                <label class="text-xs font-bold text-foreground/50">Company name</label>
                <input v-model="companyName" type="text" required class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm" placeholder="Your Business Ltd." />
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold text-foreground/50">Industry</label>
                <select v-model="industry" required class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground text-sm appearance-none cursor-pointer">
                  <option value="" disabled>Select your industry</option>
                  <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
                </select>
              </div>
            </div>

            <div v-if="currentStep === 3" class="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div class="space-y-2">
                <label class="text-xs font-bold text-foreground/50">Email</label>
                <input v-model="email" type="email" required class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm" placeholder="name@company.com" />
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold text-foreground/50">Password</label>
                <input v-model="password" type="password" required class="w-full bg-foreground/[0.02] border border-foreground/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-foreground/20 text-sm" placeholder="Min. 8 characters" />
              </div>
            </div>

            <div v-if="errorMsg" class="text-red-400 text-sm font-semibold leading-relaxed bg-red-400/5 p-4 rounded-2xl border border-red-400/10">
              {{ errorMsg }}
            </div>

            <div class="flex flex-col gap-4 pt-4">
              <button type="submit" :disabled="loading" class="w-full h-14 bg-gradient-to-tr from-primary to-primary-accent text-black text-sm font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2">
                <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
                <span v-else>{{ currentStep < 3 ? 'Continue' : 'Create account' }}</span>
              </button>

              <div class="flex items-center gap-2">
                <button v-if="currentStep > 1" type="button" @click="prevStep" class="flex-1 py-4 text-xs font-bold text-foreground/50 hover:text-foreground transition-colors border border-foreground/5 rounded-2xl">
                  Go back
                </button>
                <NuxtLink v-if="currentStep === 1" to="/login" class="flex-1 py-4 text-center text-xs font-bold text-foreground/50 hover:text-foreground transition-colors border border-foreground/5 rounded-2xl">
                  Sign in instead
                </NuxtLink>
              </div>
            </div>
          </form>
        </div>

        <p class="mt-12 text-center text-foreground/50 text-[11px] font-semibold leading-loose">
          By continuing, you agree to our <br>
          <NuxtLink to="/terms" class="text-foreground/50 hover:text-primary transition-colors">Terms of Service</NuxtLink>
          &
          <NuxtLink to="/privacy" class="text-foreground/50 hover:text-primary transition-colors">Privacy Policy</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
