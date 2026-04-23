<script setup lang="ts">
import { AlertCircle, ArrowRight, Zap, LogOut } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: false
})

const { user, isVerified, refreshAuth } = useAuth()
const supabase = useSupabaseClient()

// If already verified, kick them back to dashboard
onMounted(() => {
  if (isVerified.value) {
    navigateTo('/dashboard')
  }
})

// Watcher just in case it flips while they are on the page
watch(isVerified, (val) => {
  if (val) navigateTo('/dashboard')
})

const resendLoading = ref(false)
const resendSuccess = ref(false)
const verificationCode = ref('')
const verifying = ref(false)
const verifyError = ref('')

const resendVerification = async () => {
  try {
    resendLoading.value = true
    await $fetch('/api/auth/resend-code', { method: 'POST' })
    resendSuccess.value = true
    setTimeout(() => { resendSuccess.value = false }, 5000)
  } catch (err: any) {
    console.error('Error resending verification:', err)
  } finally {
    resendLoading.value = false
  }
}

const verifyCode = async () => {
  if (verificationCode.value.length < 6) return
  
  try {
    verifying.value = true
    verifyError.value = ''
    
    await $fetch('/api/auth/verify-code', {
      method: 'POST',
      body: { code: verificationCode.value }
    })
    
    // Trigger global auth refresh to update isVerified state
    await refreshAuth()
    
  } catch (err: any) {
    verifyError.value = err.data?.statusMessage || err.message || 'Invalid code'
  } finally {
    verifying.value = false
  }
}

const logout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen flex bg-background relative overflow-hidden">
    <!-- Visual background elements -->
    <div class="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-primary/10 blur-[120px] rounded-full animate-pulse opacity-50"></div>
    <div class="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-primary-accent/10 blur-[120px] rounded-full opacity-50 pointer-events-none"></div>

    <div class="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
      
      <!-- Top nav/logo -->
      <div class="absolute top-8 left-8 flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-tr from-primary to-primary-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap class="text-white w-6 h-6 fill-current" />
        </div>
        <span class="text-xl font-bold tracking-tight text-white">replysuite</span>
      </div>
      
      <!-- Logout Button -->
      <button @click="logout" class="absolute top-8 right-8 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
        <LogOut class="w-4 h-4" />
        Sign out
      </button>

      <!-- Main Content Box -->
      <div class="w-full max-w-lg">
        <div class="glass-card p-10 md:p-14 bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] border border-primary/50 group-hover:bg-primary/20 transition-all pointer-events-none"></div>
          
          <div class="relative z-10 flex flex-col items-center text-center">
            
            <div class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-8 border border-primary/20 shadow-inner">
              <AlertCircle class="w-10 h-10" />
            </div>
            
            <h1 class="text-3xl font-bold tracking-tight text-white mb-3">Verify your email</h1>
            <p class="text-gray-400 mb-8 leading-relaxed">
              We sent a 6-digit verification code to <br>
              <span class="text-white font-bold">{{ user?.email }}</span>.
            </p>

            <div class="w-full max-w-sm mx-auto space-y-6">
              <input 
                v-model="verificationCode" 
                type="text" 
                placeholder="000000" 
                maxlength="6"
                class="w-full bg-black border border-white/10 rounded-2xl px-6 py-5 text-center text-3xl font-mono tracking-[0.5em] focus:border-primary focus:outline-none transition-all placeholder:text-gray-800 text-white"
                @keyup.enter="verifyCode"
              />
              
              <div v-if="verifyError" class="text-red-400 text-sm font-semibold leading-relaxed bg-red-400/5 p-4 rounded-xl border border-red-400/10">
                {{ verifyError }}
              </div>

              <button 
                @click="verifyCode" 
                :disabled="verifying || verificationCode.length < 6" 
                class="w-full btn-gradient !py-4 text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {{ verifying ? 'Verifying...' : 'Verify My Account' }}
                <ArrowRight v-if="!verifying" class="w-5 h-5" />
              </button>

              <button 
                @click="resendVerification" 
                :disabled="resendLoading" 
                class="w-full py-4 text-sm font-bold text-gray-500 hover:text-white transition-colors border border-transparent hover:border-white/5 rounded-xl bg-transparent hover:bg-white/5"
              >
                {{ resendLoading ? 'Sending new code...' : resendSuccess ? 'Code Sent!' : 'Didn\'t receive a code? Resend' }}
              </button>
            </div>
          </div>
        </div>
        
        <p class="text-center mt-8 text-gray-600 text-xs font-semibold">
          Need help? <a href="mailto:support@replysuite.com" class="hover:text-primary transition-colors">Contact Support</a>
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.glass-card {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
