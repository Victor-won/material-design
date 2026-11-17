<script setup lang="ts">
import { Box, PanelLeft, SlidersHorizontal } from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'

const store = useDesignerStore()
</script>

<template>
  <div class="view-switcher" role="group" aria-label="工作区视图">
    <button
      class="view-toggle"
      :class="{ 'is-active': store.ui.showNet }"
      :aria-pressed="store.ui.showNet"
      :title="store.ui.showNet ? '隐藏展开图' : '显示展开图'"
      aria-label="切换展开图视图"
      @click="store.toggleView('net')"
    >
      <PanelLeft :size="14" :stroke-width="1.8" />
      <span>2D</span>
    </button>
    <button
      class="view-toggle"
      :class="{ 'is-active': store.ui.showStage }"
      :aria-pressed="store.ui.showStage"
      :title="store.ui.showStage ? '隐藏 3D 视图' : '显示 3D 视图'"
      aria-label="切换 3D 视图"
      @click="store.toggleView('stage')"
    >
      <Box :size="14" :stroke-width="1.8" />
      <span>3D</span>
    </button>
    <button
      class="view-toggle"
      :class="{ 'is-active': store.ui.showProperties }"
      :aria-pressed="store.ui.showProperties"
      :title="store.ui.showProperties ? '隐藏属性面板' : '显示属性面板'"
      aria-label="切换属性面板"
      @click="store.toggleView('properties')"
    >
      <SlidersHorizontal :size="14" :stroke-width="1.8" />
      <span>属性</span>
    </button>
  </div>
</template>

<style scoped>
.view-switcher {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
}

.view-toggle {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.03em;
  transition:
    color 150ms ease,
    background 150ms ease;
}

.view-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.82);
}

.view-toggle.is-active {
  background: rgba(255, 77, 31, 0.18);
  color: #ffb5a0;
}

.view-toggle.is-active svg {
  color: var(--accent);
}

@media (max-width: 1023px) {
  .view-toggle {
    width: 32px;
    justify-content: center;
    padding: 0;
  }

  .view-toggle span {
    display: none;
  }
}

@media (max-width: 760px) {
  .view-switcher {
    padding: 2px;
  }

  .view-toggle {
    width: 28px;
    height: 25px;
  }
}
</style>
