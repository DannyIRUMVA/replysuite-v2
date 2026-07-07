<script setup lang="ts">
import {
  Save,
  Globe,
  Mail,
  Clock,
  UserCircle,
  BadgeCheck,
  FileText,
  Loader2,
  Upload
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'Account Settings | ReplySuite',
})

const { user, userId, profile: authProfile, refreshAuth, setInteracting } = useAuth()
const notify = useNotify()

const loading = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const isUploadingAvatar = ref(false)

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

    if (!userId.value) throw new Error('Identity session missing. Please re-login.')

    const result = await $fetch<{ success: boolean; profile: typeof profile.value }>('/api/profile', {
      method: 'PATCH',
      body: {
        full_name: profile.value.full_name,
        company_name: profile.value.company_name,
        bio: profile.value.bio,
        website: profile.value.website,
        contact_email: profile.value.contact_email,
        phone: profile.value.phone,
        country: profile.value.country,
        timezone: profile.value.timezone,
        avatar_url: profile.value.avatar_url
      }
    })

    if (!result?.success || !result.profile) {
      throw new Error('Profile was not saved. Please try again.')
    }

    profile.value = { ...profile.value, ...result.profile }
    await refreshAuth()
    notify.success('Profile updated successfully.')
  } catch (err: any) {
    notify.error(err?.data?.message || err?.data?.statusMessage || err?.statusMessage || err?.message || 'Profile was not saved. Please try again.')
  } finally {
    loading.value = false
  }
}

const openAvatarPicker = () => {
  avatarInput.value?.click()
}

const uploadAvatar = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    isUploadingAvatar.value = true

    if (!file.type.startsWith('image/')) {
      throw new Error('Choose an image file for your avatar.')
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Avatar must be smaller than 2 MB.')
    }

    const formData = new FormData()
    formData.append('avatar', file)

    const result = await $fetch<{ success: boolean; avatarUrl: string; profile: typeof profile.value }>('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    })

    if (!result?.success || !result.avatarUrl || !result.profile) {
      throw new Error('Avatar was not saved. Please try again.')
    }

    profile.value = { ...profile.value, ...result.profile, avatar_url: result.avatarUrl }
    await refreshAuth()
    notify.success('Avatar updated successfully.')
  } catch (err: any) {
    notify.error(err?.data?.message || err?.data?.statusMessage || err?.statusMessage || err?.message || 'Avatar was not saved. Please try again.')
  } finally {
    isUploadingAvatar.value = false
    input.value = ''
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
  <div class="space-y-4 pt-3 pb-24 md:pt-4 lg:pb-0">
    <section class="rounded-[0.39rem] border border-foreground/10 bg-background p-3 shadow-sm shadow-black/5 md:p-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.39rem] border border-primary/15 bg-primary/10 text-primary">
          <UserCircle class="h-4 w-4" />
        </div>
        <div class="min-w-0">
          <h1 class="dashboard-section-title truncate">Profile settings</h1>
          <p class="dashboard-muted mt-0.5">Business identity, contact details, avatar, and assistant context.</p>
        </div>
      </div>
    </section>

    <div class="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <SettingsNavigation />

      <main class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-sm shadow-black/5">
        <div class="flex flex-col gap-3 border-b border-foreground/10 bg-foreground/[0.015] p-3 md:flex-row md:items-center md:justify-between md:p-4">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-[0.35rem] border border-primary/15 bg-primary/10">
              <BadgeCheck class="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-foreground">Identity details</h2>
              <p class="mt-0.5 text-xs text-foreground/45">Used across assistant setup, customer context, and support workflows.</p>
            </div>
          </div>
          <div class="flex w-full items-center gap-2 rounded-[0.39rem] border border-foreground/10 bg-background/70 px-2.5 py-2 md:w-auto">
            <img
              :src="profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (user?.email || 'default')"
              class="h-8 w-8 rounded-[0.35rem] border border-foreground/10 object-cover"
              alt="Profile avatar"
            >
            <div class="min-w-0 flex-1 md:flex-none">
              <p class="max-w-[12rem] truncate text-xs font-bold text-foreground">{{ profile.full_name || user?.email || 'Your profile' }}</p>
              <p class="max-w-[12rem] truncate text-[11px] font-medium text-foreground/45">{{ profile.company_name || 'Company not set' }}</p>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="uploadAvatar"
            >
            <button
              type="button"
              :disabled="isUploadingAvatar"
              class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.35rem] border border-foreground/10 px-2.5 py-1.5 text-[11px] text-foreground/60 transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              @click="openAvatarPicker"
            >
              <Loader2 v-if="isUploadingAvatar" class="h-3.5 w-3.5 animate-spin" />
              <Upload v-else class="h-3.5 w-3.5" />
              {{ isUploadingAvatar ? 'Uploading' : 'Upload' }}
            </button>
          </div>
        </div>

        <form @submit.prevent="updateProfile" class="p-3 md:p-4">
          <div class="grid gap-3 lg:grid-cols-2">
            <section class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.015] p-3">
              <div class="mb-3 flex items-center gap-2">
                <UserCircle class="h-3.5 w-3.5 text-primary" />
                <h3 class="text-xs font-bold text-foreground">Identity</h3>
              </div>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <label class="input-label">Full name</label>
                  <input v-model="profile.full_name" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="setting-input" placeholder="Your name" />
                </div>

                <div>
                  <label class="input-label">Company name</label>
                  <input v-model="profile.company_name" @focus="setInteracting(true)" @blur="setInteracting(false)" type="text" class="setting-input" placeholder="Business or brand name" />
                </div>
              </div>
            </section>

            <section class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.015] p-3">
              <div class="mb-3 flex items-center gap-2">
                <Mail class="h-3.5 w-3.5 text-primary" />
                <h3 class="text-xs font-bold text-foreground">Contact</h3>
              </div>
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                <div>
                  <label class="input-label">Business email</label>
                  <input v-model="profile.contact_email" @focus="setInteracting(true)" @blur="setInteracting(false)" type="email" class="setting-input" placeholder="contact@example.com" />
                </div>

                <div>
                  <label class="input-label">Contact phone</label>
                  <input v-model="profile.phone" @focus="setInteracting(true)" @blur="setInteracting(false)" type="tel" class="setting-input" placeholder="+250..." />
                </div>
              </div>
            </section>

            <section class="rounded-[0.39rem] border border-foreground/10 bg-foreground/[0.015] p-3 lg:col-span-2">
              <div class="mb-3 flex items-center gap-2">
                <FileText class="h-3.5 w-3.5 text-primary" />
                <h3 class="text-xs font-bold text-foreground">Business context</h3>
              </div>
              <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                  <label class="input-label">Short bio</label>
                  <textarea
                    v-model="profile.bio"
                    @focus="setInteracting(true)"
                    @blur="setInteracting(false)"
                    class="setting-input min-h-[94px] resize-none py-2.5"
                    placeholder="Briefly describe your business, tone, and what customers should know..."
                  />
                </div>

                <div class="space-y-3">
                  <div>
                    <label class="input-label"><Globe class="h-3.5 w-3.5" /> Website URL</label>
                    <input v-model="profile.website" @focus="setInteracting(true)" @blur="setInteracting(false)" type="url" class="setting-input" placeholder="https://example.com" />
                  </div>

                  <div>
                    <label class="input-label"><Clock class="h-3.5 w-3.5" /> Timezone</label>
                    <CustomSelect
                      v-model="profile.timezone"
                      :options="timezoneOptions"
                      placeholder="Select timezone"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="mt-4 flex flex-col gap-3 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="max-w-2xl text-xs leading-5 text-foreground/45">
              Save changes after updating business identity, support contact, or assistant context fields.
            </p>
            <button
              type="submit"
              :disabled="loading"
              class="dashboard-action-label inline-flex items-center justify-center gap-1.5 rounded-[0.39rem] bg-primary px-3 py-2 text-black transition hover:bg-primary-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save class="h-3.5 w-3.5" :class="loading ? 'animate-pulse' : ''" />
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
  @apply w-full rounded-[0.39rem] border border-foreground/10 bg-background/70 px-3 py-2 text-sm font-medium text-foreground outline-none transition placeholder:text-foreground/30 focus:border-primary/40 focus:bg-background;
}

.input-label {
  @apply mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-foreground/50;
}
</style>
