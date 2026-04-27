<script setup lang="ts">
interface Props {
  width?: string
  height?: string
  radius?: string
  circle?: boolean
  pulse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1rem',
  radius: '0.75rem',
  circle: false,
  pulse: true
})

const style = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.circle ? '50%' : props.radius
}))
</script>

<template>
  <div 
    class="skeleton-loader bg-foreground/[0.05] overflow-hidden relative"
    :class="{ 'pulse-anim': pulse }"
    :style="style"
  >
    <!-- Shimmer reflection effect -->
    <div class="shimmer-effect absolute inset-0 -translate-x-full"></div>
  </div>
</template>

<style scoped>
.skeleton-loader {
  border: 1px solid rgba(var(--border-color), 0.05);
}

.pulse-anim {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.shimmer-effect {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--text-base), 0.05),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
