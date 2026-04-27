<script setup lang="ts">
import {
  User,
  Save,
  Globe,
  Mail,
  Phone,
  Building2,
  Clock
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
    notify.success('Identity Updated. Gold Standard Applied!')
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
  <div class="max-w-8xl mx-auto">
    <div class="flex flex-col lg:flex-row gap-12">
      <!-- Navigation Sidebar -->
      <SettingsNavigation />

      <!-- Main Section -->
      <main class="flex-1 glass-card p-10 border-foreground/10 bg-background min-h-[600px] relative z-50 overflow-hidden pointer-events-auto">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10"></div>

        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="flex items-center gap-6 mb-12">
            <div class="w-24 h-24 rounded-3xl bg-primary/10 p-1 group relative cursor-pointer overflow-hidden">
              <img :src="profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user?.email || 'default')"
                class="w-full h-full rounded-[20px] object-cover" />
              <div
                class="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                <Save class="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div>
              <h3 class="text-xl font-black tracking-wide text-primary leading-tight">Identity</h3>
              <p class="text-foreground/50 text-sm font-medium">Your brand avatar and display information.</p>
            </div>
          </div>

          <form @submit.prevent="updateProfile" class="grid md:grid-cols-2 gap-8">
            <div class="col-span-2 md:col-span-1">
              <label class="input-label">
                <Building2 class="w-4 h-4" /> Full Name
              </label>
              <input v-model="profile.full_name" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="setting-input" placeholder="Your Name" />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="input-label">
                <Building2 class="w-4 h-4" /> Company Name
              </label>
              <input v-model="profile.company_name" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="setting-input" placeholder="Brand Name" />
            </div>
            <div class="col-span-2">
              <label class="input-label">Short Bio</label>
              <textarea v-model="profile.bio" @focus="setInteracting(true)" @blur="setInteracting(false)" class="setting-input min-h-[100px] py-4 rounded-[24px]"
                placeholder="Tell us about your brand..."></textarea>
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="input-label">
                <Globe class="w-4 h-4" /> Website URL
              </label>
              <input v-model="profile.website" @focus="setInteracting(true)" @blur="setInteracting(false)" type="url" class="setting-input" placeholder="https://..." />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="input-label">
                <Mail class="w-4 h-4" /> Business Email
              </label>
              <input v-model="profile.contact_email" @focus="setInteracting(true)" @blur="setInteracting(false)" type="email" class="setting-input"
                placeholder="contact@brand.com" />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="input-label">
                <Phone class="w-4 h-4" /> Contact Phone
              </label>
              <input v-model="profile.phone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="tel" class="setting-input" placeholder="+250..." />
            </div>
            <div class="col-span-2 md:col-span-1">
              <label class="input-label">
                <Clock class="w-4 h-4" /> Timezone
              </label>
              <CustomSelect
                v-model="profile.timezone"
                :options="timezoneOptions"
                placeholder="Select Timezone"
              />
            </div>

            <div class="col-span-2 pt-10 flex items-center justify-between border-t border-foreground/10 mt-4">
              <div></div>

              <button type="submit" :disabled="loading"
                class="btn-gradient px-12 py-4 flex items-center gap-3 group whitespace-nowrap">
                <Save class="w-5 h-5 group-hover:rotate-12 transition-transform" />
                {{ loading ? 'Securing...' : 'Save Profile' }}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.setting-input {
  @apply w-full bg-background border border-foreground/10 rounded-full px-8 py-5 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder-foreground/20 font-medium;
}

.input-label {
  @apply flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-foreground/50 mb-4 ml-4;
}

.glass-card {
  @apply rounded-[48px];
}
</style>
