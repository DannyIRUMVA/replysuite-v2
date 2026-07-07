<script setup lang="ts">
import { ChevronDown, Check } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
    modelValue: any
    options: { label: string, value: any }[]
    placeholder?: string
    disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})
const dropdownMaxHeight = ref('15rem')

const updateDropdownPosition = () => {
    if (!isOpen.value || !selectRef.value || typeof window === 'undefined') return

    const rect = selectRef.value.getBoundingClientRect()
    const viewportGap = 12
    const menuGap = 8
    const spaceBelow = window.innerHeight - rect.bottom - viewportGap
    const spaceAbove = rect.top - viewportGap
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
    const maxHeight = Math.max(160, Math.min(240, openUp ? spaceAbove - menuGap : spaceBelow - menuGap))
    const top = openUp
      ? Math.max(viewportGap, rect.top - maxHeight - menuGap)
      : Math.min(window.innerHeight - viewportGap - maxHeight, rect.bottom + menuGap)

    dropdownMaxHeight.value = `${maxHeight}px`
    dropdownStyle.value = {
        position: 'fixed',
        left: `${Math.max(viewportGap, rect.left)}px`,
        top: `${Math.max(viewportGap, top)}px`,
        width: `${rect.width}px`,
        zIndex: '9999',
    }
}

const toggleOpen = async () => {
    if (props.disabled) return
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      await nextTick()
      updateDropdownPosition()
    }
}

const selectOption = (option: { label: string, value: any }) => {
    emit('update:modelValue', option.value)
    isOpen.value = false
}

// Close when clicking outside
const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node
    const clickedTrigger = Boolean(selectRef.value?.contains(target))
    const clickedDropdown = Boolean(dropdownRef.value?.contains(target))

    if (!clickedTrigger && !clickedDropdown) {
        isOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', updateDropdownPosition)
    document.addEventListener('scroll', updateDropdownPosition, true)
})

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    window.removeEventListener('resize', updateDropdownPosition)
    document.removeEventListener('scroll', updateDropdownPosition, true)
})

watch(isOpen, async (open) => {
    if (!open) return
    await nextTick()
    updateDropdownPosition()
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
          class="flex w-full items-center justify-between rounded-[0.39rem] border border-foreground/10 bg-background/70 px-3 py-2 text-left text-sm font-medium text-foreground outline-none transition"
          :class="[
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/40 focus:border-primary/40',
              isOpen ? 'border-primary/50 ring-2 ring-primary/10' : ''
          ]"
      >
          <span class="truncate" :class="modelValue ? 'text-foreground' : 'text-foreground/35'">
              {{ currentLabel }}
          </span>
          <ChevronDown class="h-4 w-4 shrink-0 text-foreground/40 transition-transform duration-200" :class="{ 'rotate-180 text-primary': isOpen }" />
      </button>

      <!-- Dropdown Menu -->
      <Teleport to="body">
        <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="scale-95 opacity-0 -translate-y-1"
            enter-to-class="scale-100 opacity-100 translate-y-0"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="scale-100 opacity-100 translate-y-0"
            leave-to-class="scale-95 opacity-0 -translate-y-1"
        >
            <div
              v-if="isOpen"
              ref="dropdownRef"
              :style="dropdownStyle"
              class="overflow-hidden rounded-[0.39rem] border border-foreground/10 bg-background shadow-2xl shadow-black/25"
            >
                <div class="custom-scrollbar overflow-y-auto p-1" :style="{ maxHeight: dropdownMaxHeight }">
                    <button
                        v-for="option in options"
                        :key="option.value"
                        type="button"
                        @click="selectOption(option)"
                        class="flex w-full cursor-pointer items-center justify-between rounded-[0.35rem] px-3 py-2 text-left text-sm font-medium transition"
                        :class="[
                            modelValue === option.value
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/60 hover:bg-foreground/5 hover:text-foreground'
                        ]"
                    >
                        <span class="truncate">{{ option.label }}</span>
                        <Check v-if="modelValue === option.value" class="h-4 w-4 shrink-0" />
                    </button>
                </div>
            </div>
        </Transition>
      </Teleport>
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
  background: rgb(var(--foreground) / 0.1);
  border-radius: 10px;
}
</style>
