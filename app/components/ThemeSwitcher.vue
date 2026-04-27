<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next'

const colorMode = useColorMode()

const themes = [
  { name: 'system', icon: Monitor },
  { name: 'light', icon: Sun },
  { name: 'dark', icon: Moon }
]
</script>

<template>
  <div class="flex items-center bg-foreground/5 p-1 rounded-xl border border-foreground/5">
    <button
      v-for="theme in themes"
      :key="theme.name"
      @click="colorMode.preference = theme.name"
      class="p-2 rounded-lg transition-all"
      :class="[
        colorMode.preference === theme.name 
          ? 'bg-background text-primary shadow-sm border border-foreground/5' 
          : 'text-foreground/40 hover:text-foreground hover:bg-foreground/5'
      ]"
      :title="`Switch to ${theme.name} mode`"
    >
      <component :is="theme.icon" class="w-4 h-4" />
    </button>
  </div>
</template>
