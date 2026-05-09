<script setup lang="ts">
import { Cookie, ShieldCheck, SlidersHorizontal, Check, X } from 'lucide-vue-next'

const user = useSupabaseUser()
const route = useRoute()
const { isOpen, isReady, preferences, acceptAll, acceptEssential, savePreferences, closeSettings } = useCookieConsent()

const analytics = ref(false)
const functional = ref(false)
const isCustomizing = ref(false)

watch(() => preferences.value, (value) => {
  analytics.value = value.analytics
  functional.value = value.functional
}, { immediate: true, deep: true })

const shouldShow = computed(() => {
  if (user.value) return false
  if (!isReady.value || !isOpen.value) return false
  return !route.path.startsWith('/widget/')
})

const applyPreferences = () => {
  savePreferences({ analytics: analytics.value, functional: functional.value })
  isCustomizing.value = false
}

if (import.meta.client) {
  watch(shouldShow, (open) => {
    document.body.classList.toggle('cookie-modal-open', open)
  }, { immediate: true })

  onBeforeUnmount(() => {
    document.body.classList.remove('cookie-modal-open')
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="shouldShow" class="fixed inset-0 z-[1100] flex items-end justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-md"></div>

        <div class="relative w-full max-w-3xl rounded-[32px] border border-foreground/10 bg-background-card p-6 sm:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <button
            class="absolute top-4 right-4 w-10 h-10 rounded-2xl border border-foreground/10 bg-foreground/[0.03] text-foreground/50 hover:text-foreground transition-colors"
            aria-label="Close cookie settings"
            @click="closeSettings"
          >
            <X class="w-4 h-4 mx-auto" />
          </button>

          <div class="flex items-start gap-4 mb-6">
            <div class="w-12 h-12 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Cookie class="w-6 h-6" />
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-primary mb-2">Cookie settings</div>
              <h2 class="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-2">Choose how ReplySuite uses cookies.</h2>
              <p class="text-sm md:text-base text-foreground/60 font-medium leading-relaxed max-w-2xl">
                We use essential cookies to keep the website secure and working. Optional analytics and functional cookies help us improve the website and remember your preferences.
              </p>
            </div>
          </div>

          <div v-if="!isCustomizing" class="grid md:grid-cols-3 gap-4 mb-8">
            <div class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5">
              <div class="flex items-center gap-2 mb-3 text-primary">
                <ShieldCheck class="w-4 h-4" />
                <span class="text-[10px] font-black uppercase tracking-[0.22em]">Essential</span>
              </div>
              <p class="text-sm text-foreground/65 font-medium leading-relaxed">Required for core website security and functionality.</p>
            </div>
            <div class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5">
              <div class="flex items-center gap-2 mb-3 text-foreground/70">
                <SlidersHorizontal class="w-4 h-4" />
                <span class="text-[10px] font-black uppercase tracking-[0.22em]">Analytics</span>
              </div>
              <p class="text-sm text-foreground/65 font-medium leading-relaxed">Helps us understand traffic and website performance.</p>
            </div>
            <div class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5">
              <div class="flex items-center gap-2 mb-3 text-foreground/70">
                <Check class="w-4 h-4" />
                <span class="text-[10px] font-black uppercase tracking-[0.22em]">Functional</span>
              </div>
              <p class="text-sm text-foreground/65 font-medium leading-relaxed">Remembers choices like settings you select on future visits.</p>
            </div>
          </div>

          <div v-else class="space-y-4 mb-8">
            <div class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5 flex items-start justify-between gap-6">
              <div>
                <h3 class="text-lg font-bold text-foreground mb-1">Essential cookies</h3>
                <p class="text-sm text-foreground/60 font-medium">Always on. These support security, navigation, and core website behavior.</p>
              </div>
              <div class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 border border-primary/20 text-primary">Required</div>
            </div>

            <label class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5 flex items-start justify-between gap-6 cursor-pointer">
              <div>
                <h3 class="text-lg font-bold text-foreground mb-1">Analytics cookies</h3>
                <p class="text-sm text-foreground/60 font-medium">Allow traffic measurement and website-performance insights.</p>
              </div>
              <input v-model="analytics" type="checkbox" class="mt-1 h-5 w-5 rounded border-foreground/20 bg-transparent text-primary focus:ring-primary" />
            </label>

            <label class="rounded-[24px] border border-foreground/10 bg-foreground/[0.02] p-5 flex items-start justify-between gap-6 cursor-pointer">
              <div>
                <h3 class="text-lg font-bold text-foreground mb-1">Functional cookies</h3>
                <p class="text-sm text-foreground/60 font-medium">Remember preference choices for a more consistent return visit.</p>
              </div>
              <input v-model="functional" type="checkbox" class="mt-1 h-5 w-5 rounded border-foreground/20 bg-transparent text-primary focus:ring-primary" />
            </label>
          </div>

          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div class="text-xs text-foreground/45 font-semibold leading-relaxed">
              Read our <NuxtLink to="/cookie" class="text-primary hover:underline">Cookie Policy</NuxtLink> and <NuxtLink to="/privacy" class="text-primary hover:underline">Privacy Policy</NuxtLink>.
            </div>

            <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
              <button
                class="px-5 py-3 rounded-full border border-foreground/10 text-sm font-bold text-foreground/70 hover:text-foreground hover:border-foreground/20 transition-colors"
                @click="isCustomizing ? applyPreferences() : (isCustomizing = true)"
              >
                {{ isCustomizing ? 'Save preferences' : 'Customize' }}
              </button>
              <button
                class="px-5 py-3 rounded-full border border-foreground/10 text-sm font-bold text-foreground/70 hover:text-foreground hover:border-foreground/20 transition-colors"
                @click="acceptEssential"
              >
                Essential only
              </button>
              <button class="btn-gradient px-6 py-3 text-sm" @click="acceptAll">
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
