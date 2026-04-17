<script setup lang="ts">
// Default layout for Guest/Marketing pages
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
  ]
})
</script>

<template>
  <div class="min-h-screen bg-background text-white selection:bg-primary/30 selection:text-primary-accent">
    <GuestNavbar />
    <slot />
    <GuestFooter />
  </div>
</template>

<style>
/* Global layout styles if needed */
</style>
