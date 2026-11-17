<script setup lang="ts">
defineProps<{
  modelValue: string
  options: { value: string; label: string; hint?: string }[]
  disabled?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="segmented" :class="{ 'is-compact': compact, 'is-disabled': disabled }" role="radiogroup">
    <button
      v-for="option in options"
      :key="option.value"
      class="segment"
      :class="{ 'is-active': modelValue === option.value }"
      role="radio"
      :aria-checked="modelValue === option.value"
      :disabled="disabled"
      :title="option.hint"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(235, 229, 216, 0.5);
}

.segment {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 670;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transition:
    background 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease;
}

.segment:hover:not(.is-active) {
  color: var(--ink);
}

.segment.is-active {
  background: var(--panel-raised);
  box-shadow: 0 2px 8px rgba(65, 50, 26, 0.09);
  color: var(--ink);
}

.segmented.is-compact .segment {
  height: 24px;
  font-size: 10px;
}

.segmented.is-disabled {
  opacity: 0.55;
}
</style>
