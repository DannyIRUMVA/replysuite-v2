<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'dashboard' })

await navigateTo('/dashboard/agents/tools/website-builder', { replace: true })
</script>

<template>
  <div class="p-6 text-sm font-medium text-foreground/60">
    Redirecting to Website Builder tools…
  </div>
</template>
