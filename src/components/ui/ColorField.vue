<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const normalized = computed(() => (/^#[0-9a-f]{6}$/i.test(props.modelValue) ? props.modelValue : '#d8b98a'))

function emitHex(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  if (/^#[0-9a-f]{6}$/i.test(value)) emit('update:modelValue', value.toLowerCase())
  else input.value = normalized.value
}
</script>

<template>
  <div class="color-field" :class="{ 'is-disabled': disabled }">
    <label class="color-swatch" :style="{ background: normalized }">
      <input
        type="color"
        :value="normalized"
        :disabled="disabled"
        :aria-label="label ?? '选择颜色'"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <span class="swatch-check" aria-hidden="true">＋</span>
    </label>
    <input
      class="hex-input"
      :value="normalized.toUpperCase()"
      :disabled="disabled"
      aria-label="十六进制颜色"
      maxlength="7"
      @change="emitHex"
    />
  </div>
</template>

<style scoped>
.color-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-swatch {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(18, 18, 16, 0.12);
  border-radius: 7px;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.color-swatch input {
  position: absolute;
  inset: -8px;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  cursor: pointer;
  opacity: 0;
}

.swatch-check {
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  font-weight: 300;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.hex-input {
  width: 100%;
  height: 34px;
  padding: 0 9px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.5);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.hex-input:focus {
  border-color: var(--accent);
}

.color-field.is-disabled {
  opacity: 0.55;
}
</style>
