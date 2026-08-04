<script setup lang="ts">
const { showFeedback, feedbackSource, closeFeedback } = useFeedback()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://replysuite.com'
const route = useRoute()
const user = useSupabaseUser()

const useGuestPublicDensity = computed(() => !user.value)

useSeoMeta({
  ogSiteName: 'ReplySuite',
  twitterCard: 'summary_large_image',
  ogType: 'website',
  twitterSite: '@replysuite',
})

useHead({
  link: [
    { rel: 'canonical', href: siteUrl }
  ],
  script: [
    {
      src: '/embed.js',
      async: true,
      'data-chatbot': 'cacdbcdb-7157-4e12-92c4-a715aadf3112'
    }
  ]
})

// Keep public pages compact and responsive.
useHead({
  htmlAttrs: {
    style: 'font-size: 16px'
  }
})
</script>

<template>
  <div class="public-page-shell overflow-x-hidden">
    <div class="public-page-pattern"></div>

    <div class="relative z-10">
      <GuestNavbar />
      <!-- Spacer for fixed navbar -->
      <div :class="useGuestPublicDensity ? 'h-[70px] sm:h-[80px]' : 'h-[72px] sm:h-[82px]'"></div>
      <main class="public-main">
        <slot />
      </main>
      <GuestFooter />
    </div>

    <!-- Global Feedback Modal -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showFeedback" class="fixed inset-0 z-[300] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="closeFeedback"></div>
        <FeedbackForm :source="feedbackSource" @close="closeFeedback" class="relative z-10" />
      </div>
    </Transition>
  </div>
</template>

<style>
/* Global layout styles if needed */
</style>
