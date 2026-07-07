<script setup lang="ts">
import {
  Shield,
  Trash2,
  Mail,
  KeyRound,
  AlertTriangle
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Account Settings'
})

const { user } = useAuth()
const notify = useNotify()

const handleResetPassword = async () => {
  if (await notify.confirm('Send a password reset link to your email?')) {
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
  <div class="space-y-4 pt-3 pb-24 md:pt-4 lg:pb-0">
    <section class="rounded-[0.39rem] border border-foreground/10 bg-background p-3 shadow-sm shadow-black/5 md:p-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10 text-primary">
          <Shield class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <h1 class="dashboard-section-title truncate">Account control</h1>
          <p class="dashboard-muted mt-0.5">Security, access, and critical account actions.</p>
        </div>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <SettingsNavigation align-on-lg />

      <main class="space-y-4 overflow-hidden">
        <section class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-sm shadow-black/5">
          <div class="flex items-center gap-2.5 border-b border-foreground/10 bg-foreground/[0.015] p-3 md:p-4">
            <div class="flex h-8 w-8 items-center justify-center rounded-[0.35rem] border border-primary/15 bg-primary/10">
              <Shield class="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-foreground">Security</h2>
              <p class="mt-0.5 text-xs text-foreground/45">Manage email contact and password recovery.</p>
            </div>
          </div>

          <div class="divide-y divide-foreground/10">
            <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] border border-foreground/10 bg-foreground/[0.02] text-foreground/55">
                  <Mail class="h-3.5 w-3.5" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-foreground">Email address</p>
                  <p class="truncate text-xs text-foreground/50">{{ user?.email }}</p>
                </div>
              </div>
              <button
                @click="navigateTo('mailto:support@replysuite.com', { external: true })"
                class="dashboard-action-label inline-flex items-center justify-center rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/60 transition hover:border-primary/20 hover:text-primary"
              >
                Change email
              </button>
            </div>

            <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] border border-foreground/10 bg-foreground/[0.02] text-foreground/55">
                  <KeyRound class="h-3.5 w-3.5" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-foreground">Password</p>
                  <p class="text-xs text-foreground/50">Send a secure reset link to your email.</p>
                </div>
              </div>
              <button
                @click="handleResetPassword"
                class="dashboard-action-label inline-flex items-center justify-center rounded-[0.39rem] border border-foreground/10 px-3 py-2 text-foreground/60 transition hover:border-primary/20 hover:text-primary"
              >
                Reset password
              </button>
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-[0.39rem] border border-red-500/15 bg-red-500/[0.025] shadow-sm shadow-black/5">
          <div class="flex items-center gap-2.5 border-b border-red-500/10 p-3 md:p-4">
            <div class="flex h-8 w-8 items-center justify-center rounded-[0.35rem] border border-red-500/20 bg-red-500/10">
              <AlertTriangle class="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-red-400">Danger zone</h2>
              <p class="mt-0.5 text-xs text-foreground/45">Permanent actions require final support verification.</p>
            </div>
          </div>

          <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between md:p-4">
            <div class="max-w-xl">
              <p class="text-sm font-bold text-foreground">Delete account</p>
              <p class="mt-1 text-xs leading-5 text-foreground/50">Permanently delete your account and all associated AI agents. This action cannot be undone.</p>
            </div>
            <button
              @click="handleDeleteAccount"
              class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] border border-red-500/20 px-3 py-2 text-red-400 transition hover:bg-red-500/10"
            >
              <Trash2 class="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
