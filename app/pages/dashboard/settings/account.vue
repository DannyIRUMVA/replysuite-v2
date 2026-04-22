<script setup lang="ts">
import {
  Shield,
  Trash2
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { user } = useAuth()
const notify = useNotify()

const handleResetPassword = async () => {
  if (await notify.confirm('Are you sure you want to reset your password? A link will be sent to your email.')) {
    notify.success('Security link dispatched to your inbox.')
  }
}

const handleDeleteAccount = async () => {
  if (await notify.confirm('CRITICAL: This will permanently delete your account and all associated AI agents. This action is irreversible. Proceed?')) {
    notify.error('Identity decommissioning initiated. Contact support for final verification.')
  }
}
</script>

<template>
  <div class="max-w-8xl mx-auto">
    <div class="flex flex-col lg:flex-row gap-12">
      <!-- Navigation Sidebar -->
      <SettingsNavigation />

      <!-- Main Section -->
      <main class="flex-1 glass-card p-10 border-white/5 bg-[#0a0a0a] min-h-[600px] relative overflow-hidden">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10"></div>

        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 class="text-xl font-black tracking-wide text-primary mb-10">Account Control</h3>

          <div class="space-y-10">
            <div class="p-8 border border-white/5 rounded-[32px] bg-white/[0.01]">
              <h4 class="text-sm font-black uppercase tracking-widest text-gray-300 mb-6">Security</h4>
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-bold text-gray-200">Email Address</p>
                  <p class="text-sm text-gray-500">{{ user?.email }}</p>
                </div>
                <button @click="navigateTo('mailto:support@replysuite.com', { external: true })"
                  class="text-primary text-xs font-black uppercase tracking-widest hover:underline">Change
                  Email</button>
              </div>
              <hr class="border-white/5 my-8" />
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-bold text-gray-200">Password</p>
                  <p class="text-sm text-gray-500">Last changed 2 months ago.</p>
                </div>
                <button @click="handleResetPassword" class="text-primary text-xs font-black uppercase tracking-widest hover:underline">Reset
                  Password</button>
              </div>
            </div>

            <div class="p-8 border border-red-500/10 rounded-[32px] bg-red-500/[0.02]">
              <h4 class="text-sm font-black uppercase tracking-widest text-red-500 mb-6">Danger Zone</h4>
              <div class="flex items-center justify-between">
                <div class="max-w-md">
                  <p class="font-bold text-gray-200">Delete Account</p>
                  <p class="text-sm text-gray-500 mt-1">Permanently delete your account and all associated AI agents.
                    This action cannot be undone.</p>
                </div>
                <button
                  @click="handleDeleteAccount"
                  class="px-8 py-3 rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-all">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.glass-card {
  @apply rounded-[48px];
}
</style>
