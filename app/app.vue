<script setup lang="ts">
import '~/assets/css/main.css'
</script>

<template>
  <div>
    <NuxtLoadingIndicator color="#D4AF37" :height="3" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Global UI Providers -->
    <ToastProvider />
    <ConfirmModal />
  </div>
</template>

<style>
/* Global transitions or styles if needed */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
