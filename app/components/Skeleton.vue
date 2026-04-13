<script setup lang="ts">
interface Props {
  width?: string
  height?: string
  rounded?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '20px',
  rounded: '0.75rem',
  class: ''
})
</script>

<template>
  <div 
    class="skeleton-loader overflow-hidden relative bg-white/[0.03]"
    :class="props.class"
    :style="{ 
      width: props.width, 
      height: props.height, 
      borderRadius: props.rounded 
    }"
  >
    <div class="shimmer-sweep absolute inset-0"></div>
  </div>
</template>

<style scoped>
.skeleton-loader {
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.shimmer-sweep {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
  transform: translateX(-100%);
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
