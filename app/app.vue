<script setup lang="ts">
import '~/assets/css/main.css'

const { showFeedback, feedbackSource, closeFeedback } = useFeedback()
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

    <!-- Global Feedback -->
    <Teleport to="body">
      <div v-if="showFeedback" class="fixed inset-0 z-[1000] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="closeFeedback"></div>
        <FeedbackForm :source="feedbackSource" @close="closeFeedback" class="relative z-10" />
      </div>
    </Teleport>
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
