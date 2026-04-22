<script setup lang="ts">
import { ChevronDown, Check } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted,  watch } from 'vue'

const props = defineProps<{
    modelValue: any
    options: { label: string, value: any }[]
    placeholder?: string
    disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)

const toggleOpen = () => {
    if (props.disabled) return
    isOpen.value = !isOpen.value
}

const selectOption = (option: { label: string, value: any }) => {
    emit('update:modelValue', option.value)
    isOpen.value = false
}

// Close when clicking outside
const handleClickOutside = (event: MouseEvent) => {
    if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
})

const currentLabel = computed(() => {
    const selected = props.options.find(opt => opt.value === props.modelValue)
    return selected ? selected.label : props.placeholder || 'Select an option'
})
</script>

<template>
  <div class="relative" ref="selectRef">
      <!-- Trigger Button -->
      <button 
          type="button" 
          @click="toggleOpen"
          :disabled="disabled"
          class="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-4 py-3.5 text-[13px] font-bold text-left flex items-center justify-between transition-all outline-none"
          :class="[
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer focus:border-primary/50 shadow-md',
              isOpen ? 'border-primary/50 ring-2 ring-primary/20' : ''
          ]"
      >
          <span :class="modelValue ? 'text-white' : 'text-gray-500 uppercase tracking-widest text-[11px]'">
              {{ currentLabel }}
          </span>
          <ChevronDown class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180 text-primary': isOpen }" />
      </button>

      <!-- Dropdown Menu -->
      <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0 -translate-y-2"
          enter-to-class="transform scale-100 opacity-100 translate-y-0"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100 translate-y-0"
          leave-to-class="transform scale-95 opacity-0 -translate-y-2"
      >
          <div v-if="isOpen" class="absolute z-50 w-full mt-2 bg-[#141414] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-2xl">
              <div class="max-h-60 overflow-y-auto custom-scrollbar p-1">
                  <div 
                      v-for="option in options" 
                      :key="option.value"
                      @click="selectOption(option)"
                      class="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all text-sm font-medium"
                      :class="[
                          modelValue === option.value 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      ]"
                  >
                      <span>{{ option.label }}</span>
                      <Check v-if="modelValue === option.value" class="w-4 h-4" />
                  </div>
              </div>
          </div>
      </Transition>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
