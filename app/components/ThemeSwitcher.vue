<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

type ThemeName = 'light' | 'dark'

const colorMode = useColorMode()
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true

  // ReplySuite should open in dark mode by default. If an older browser
  // preference is still set to "system", normalize it to the product default.
  if (!colorMode.preference || colorMode.preference === 'system') {
    colorMode.preference = 'dark'
  }
})

const themes: Array<{ name: ThemeName; label: string; icon: typeof Sun }> = [
  { name: 'light', label: 'Light', icon: Sun },
  { name: 'dark', label: 'Dark', icon: Moon }
]
</script>

<template>
  <div class="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.035] p-0.5 shadow-sm">
    <button
      v-for="theme in themes"
      :key="theme.name"
      type="button"
      @click="colorMode.preference = theme.name"
      class="inline-flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      :class="[
        isMounted && colorMode.preference === theme.name
          ? 'bg-background-card text-primary shadow-sm ring-1 ring-primary/15'
          : 'text-foreground/35 hover:bg-foreground/5 hover:text-foreground/70'
      ]"
      :aria-label="`Switch to ${theme.label.toLowerCase()} mode`"
      :aria-pressed="isMounted && colorMode.preference === theme.name"
      :title="`${theme.label} mode`"
    >
      <component :is="theme.icon" class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
