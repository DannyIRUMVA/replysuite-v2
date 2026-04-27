<script setup lang="ts">
useHead({ title: 'Confirming Identity | ReplySuite' })

const user = useSupabaseUser()

// Handle redirect after session is established
watch(user, (user) => {
  if (user) {
    return navigateTo('/dashboard')
  }
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="text-center text-foreground">
      <div class="w-16 h-16 border-4 border-primary border-t-foreground rounded-full animate-spin mx-auto mb-6"></div>
      <h2 class="text-2xl font-bold">Authenticating...</h2>
      <p class="text-foreground/50 mt-2">Setting up your secure growth environment.</p>
    </div>
  </div>
</template>
