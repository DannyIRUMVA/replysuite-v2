<script setup lang="ts">
// Default layout for Guest/Marketing pages
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
