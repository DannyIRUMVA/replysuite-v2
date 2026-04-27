<script setup lang="ts">
const { showFeedback, feedbackSource, closeFeedback } = useFeedback()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://replysuite.com'

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

// Global Font Scaling (10% Increase)
useHead({
  htmlAttrs: {
    style: 'font-size: 17.6px' // 16px * 1.1 = 17.6px
  }
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-accent">
    <GuestNavbar />
    <slot />
    <GuestFooter />

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
