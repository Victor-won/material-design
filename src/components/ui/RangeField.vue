<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min: number
    max: number
    step?: number
    unit?: string
    decimals?: number
    disabled?: boolean
  }>(),
  {
    step: 1,
    unit: '',
    decimals: 0,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const display = computed(() => props.modelValue.toFixed(props.decimals))

function emitValue(raw: string | number) {
  if (props.disabled) return
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  const clamped = Math.min(props.max, Math.max(props.min, value))
  emit('update:modelValue', clamped)
}
</script>

<template>
  <div class="range-field" :class="{ 'is-disabled': disabled }">
    <div class="range-head">
      <span>{{ label }}</span>
      <span class="range-value">
        <input
          class="value-input"
          type="number"
          :value="display"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          :aria-label="`${label}数值`"
          @change="emitValue(($event.target as HTMLInputElement).value)"
        />
        <small>{{ unit }}</small>
      </span>
    </div>
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-label="label"
      @input="emitValue(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped>
.range-field {
  min-width: 0;
}

.range-field.is-disabled {
  opacity: 0.55;
}

.range-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 640;
  letter-spacing: 0.03em;
}

.range-value {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  color: var(--ink);
}

.value-input {
  width: 46px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 520;
  text-align: right;
  -moz-appearance: textfield;
}

.value-input::-webkit-inner-spin-button,
.value-input::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

.value-input:focus {
  border-bottom: 1px solid var(--accent);
}

.range-value small {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
}
</style>
