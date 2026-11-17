<script setup lang="ts">
import { useDesignerStore } from '@/stores/designer'

const store = useDesignerStore()
</script>

<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="true">
    <TransitionGroup name="toast">
      <button
        v-for="toast in store.ui.toasts"
        :key="toast.id"
        class="toast"
        :class="`is-${toast.kind}`"
        @click="store.removeToast(toast.id)"
      >
        <span class="toast-dot" />
        <span>{{ toast.text }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  width: min(340px, calc(100vw - 32px));
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(23, 23, 20, 0.94);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.25);
  color: var(--white);
  font-size: 12.5px;
  line-height: 1.45;
  text-align: left;
  backdrop-filter: blur(10px);
  pointer-events: auto;
}

.toast-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.toast.is-success .toast-dot {
  background: #49d29d;
}

.toast.is-info .toast-dot {
  background: #8ba3ff;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
