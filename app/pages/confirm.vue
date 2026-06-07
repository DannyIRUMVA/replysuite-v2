<script setup lang="ts">
useHead({ title: 'Signing you in | ReplySuite' })

const user = useSupabaseUser()
const { track } = useActivity()
const loginTracked = ref(false)

watch(user, async (currentUser) => {
  if (!currentUser) return

  if (process.client && !loginTracked.value) {
    loginTracked.value = true
    await track('LOGIN_SUCCESS', {
      provider: 'google',
      email: currentUser.email,
      method: 'oauth_callback',
    })
  }

  return navigateTo('/dashboard')
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="text-center text-foreground max-w-md px-6">
      <div class="w-16 h-16 border-4 border-primary border-t-foreground rounded-full animate-spin mx-auto mb-6"></div>
      <h2 class="text-2xl font-bold">Signing you in...</h2>
      <p class="text-foreground/50 mt-2">Please wait a moment.</p>
    </div>
  </div>
</template>
