<script setup lang="ts">
import {
  Save,
  Globe,
  Mail,
  Phone,
  Building2,
  Clock,
  UserCircle,
  BadgeCheck
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Account Settings | ReplySuite',
})

const { user, userId, profile: authProfile, setInteracting } = useAuth()
const supabase = useSupabaseClient()
const notify = useNotify()

const loading = ref(false)
const errorMsg = ref('')
const saveSuccess = ref(false)

const profile = ref({
  full_name: '',
  company_name: '',
  bio: '',
  website: '',
  contact_email: '',
  phone: '',
  country: '',
  timezone: '',
  avatar_url: ''
})

// Sync local form state with centralized auth profile (Only ONCE to prevent overwriting user input)
const hasInitialized = ref(false)
watch(authProfile, (newProfile) => {
  if (newProfile && !hasInitialized.value) {
    profile.value = { ...profile.value, ...newProfile }
    hasInitialized.value = true
  }
}, { immediate: true })

const updateProfile = async () => {
  try {
    loading.value = true
    errorMsg.value = ''
    saveSuccess.value = false

      // Ensure we have a valid ID before attempting update
      if (!userId.value) throw new Error('Identity session missing. Please re-login.')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.value.full_name,
          company_name: profile.value.company_name,
          bio: profile.value.bio,
          website: profile.value.website,
          contact_email: profile.value.contact_email,
          phone: profile.value.phone,
          country: profile.value.country,
          timezone: profile.value.timezone,
          avatar_url: profile.value.avatar_url
        })
        .eq('id', userId.value)

      if (error) throw error
    notify.success('Profile updated successfully.')
  } catch (err: any) {
    notify.error(err.message)
  } finally {
    loading.value = false
  }
}

const timezoneOptions = [
  { label: 'UTC (Universal Time Coordinated)', value: 'UTC' },
  { label: 'CAT (Central Africa Time)', value: 'Africa/Kigali' },
  { label: 'GMT (Greenwich Mean Time)', value: 'Europe/London' },
  { label: 'EST (Eastern Standard Time)', value: 'America/New_York' },
  { label: 'PST (Pacific Standard Time)', value: 'America/Los_Angeles' },
  { label: 'IST (India Standard Time)', value: 'Asia/Kolkata' },
  { label: 'CST (China Standard Time)', value: 'Asia/Shanghai' },
]
</script>

<template>
  <div class="space-y-6 pb-24 lg:pb-0">
    <section class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5 md:p-6">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Settings</p>
          <h1 class="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">Profile settings</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-foreground/55">
            Keep your business identity, contact details, and timezone aligned with your ReplySuite workspace.
          </p>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-background/70 p-3">
          <img
            :src="profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user?.email || 'default')"
            class="h-12 w-12 rounded-xl border border-foreground/10 object-cover"
            alt="Profile avatar"
          >
          <div class="min-w-0">
            <p class="truncate text-sm font-black text-foreground">{{ profile.full_name || user?.email || 'Your profile' }}</p>
            <p class="truncate text-xs text-foreground/45">{{ profile.company_name || 'No company name yet' }}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <SettingsNavigation />

      <main class="overflow-hidden rounded-[24px] border border-foreground/10 bg-background shadow-[0_18px_50px_rgba(0,0,0,0.05)]">
        <div class="border-b border-foreground/10 bg-foreground/[0.015] p-5 md:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <UserCircle class="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 class="text-base font-black uppercase tracking-widest text-foreground">Identity details</h2>
                <p class="mt-1 text-xs text-foreground/50">Used across invoices, assistant setup, and support context.</p>
              </div>
            </div>
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <BadgeCheck class="h-3.5 w-3.5" />
              Secure profile
            </div>
          </div>
        </div>

        <form @submit.prevent="updateProfile" class="p-5 md:p-6">
          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="input-label">
                <UserCircle class="h-4 w-4" /> Full name
              </label>
              <input v-model="profile.full_name" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="setting-input" placeholder="Your name" />
            </div>

            <div>
              <label class="input-label">
                <Building2 class="h-4 w-4" /> Company name
              </label>
              <input v-model="profile.company_name" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="setting-input" placeholder="Business or brand name" />
            </div>

            <div class="md:col-span-2">
              <label class="input-label">Short bio</label>
              <textarea
                v-model="profile.bio"
                @focus="setInteracting(true)"
                @blur="setInteracting(false)"
                class="setting-input min-h-[110px] resize-none rounded-2xl py-3.5"
                placeholder="Briefly describe your business, tone, and what customers should know..."
              />
            </div>

            <div>
              <label class="input-label">
                <Globe class="h-4 w-4" /> Website URL
              </label>
              <input v-model="profile.website" @focus="setInteracting(true)" @blur="setInteracting(false)" type="url" class="setting-input" placeholder="https://example.com" />
            </div>

            <div>
              <label class="input-label">
                <Mail class="h-4 w-4" /> Business email
              </label>
              <input v-model="profile.contact_email" @focus="setInteracting(true)" @blur="setInteracting(false)" type="email" class="setting-input" placeholder="contact@example.com" />
            </div>

            <div>
              <label class="input-label">
                <Phone class="h-4 w-4" /> Contact phone
              </label>
              <input v-model="profile.phone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="tel" class="setting-input" placeholder="+250..." />
            </div>

            <div>
              <label class="input-label">
                <Clock class="h-4 w-4" /> Timezone
              </label>
              <CustomSelect
                v-model="profile.timezone"
                :options="timezoneOptions"
                placeholder="Select timezone"
              />
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-3 border-t border-foreground/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-xs leading-5 text-foreground/45">
              Changes are saved to your account profile and may be used to personalize assistant setup.
            </p>
            <button
              type="submit"
              :disabled="loading"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/10 transition-all hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save class="h-4 w-4" :class="loading ? 'animate-pulse' : ''" />
              {{ loading ? 'Saving...' : 'Save profile' }}
            </button>
          </div>
        </form>
      </main>
    </div>
  </div>
</template>

<style scoped>
.setting-input {
  @apply w-full rounded-xl border border-foreground/10 bg-foreground/[0.025] px-4 py-3 text-sm font-medium text-foreground outline-none transition-all placeholder:text-foreground/25 focus:border-primary/45 focus:bg-background;
}

.input-label {
  @apply mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/45;
}
</style>
