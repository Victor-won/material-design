<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Box, Download, Sparkles, X } from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'
import StructurePanel from './property/StructurePanel.vue'
import DesignPanel from './property/DesignPanel.vue'
import ExportPanel from './property/ExportPanel.vue'

const store = useDesignerStore()
const scrollEl = ref<HTMLElement | null>(null)

watch(
  () => [store.ui.activeTab, store.ui.scope],
  async () => {
    await nextTick()
    if (!scrollEl.value) return
    if (typeof scrollEl.value.scrollTo === 'function') scrollEl.value.scrollTo({ top: 0 })
    else scrollEl.value.scrollTop = 0
  },
)

const tabs = [
  { id: 'structure', label: '结构', icon: Box },
  { id: 'design', label: '设计', icon: Sparkles },
  { id: 'export', label: '输出', icon: Download },
] as const
</script>

<template>
  <div class="property-panel">
    <header class="property-head">
      <div class="property-topline">
        <span class="eyebrow">02 / Properties</span>
        <button
          class="close-property"
          aria-label="关闭属性面板"
          @click="store.ui.rightOpen = false"
        >
          <X :size="15" />
        </button>
      </div>
      <div class="property-title-row">
        <h1 class="display-title">设计属性</h1>
        <button
          v-if="store.ui.scope !== 'global'"
          class="scope-chip"
          title="回到全局设计"
          @click="store.selectGlobal()"
        >
          <i />
          {{ store.currentFaceLabel }}
          <span>×</span>
        </button>
        <span v-else class="scope-chip is-global"><i />全局设计</span>
      </div>

      <div class="property-tabs" role="tablist" aria-label="属性分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="property-tab"
          :class="{ 'is-active': store.ui.activeTab === tab.id }"
          :data-tab="tab.id"
          role="tab"
          :aria-selected="store.ui.activeTab === tab.id"
          @click="store.setTab(tab.id)"
        >
          <component :is="tab.icon" :size="13" :stroke-width="1.8" />
          {{ tab.label }}
        </button>
      </div>
    </header>

    <div ref="scrollEl" class="property-scroll">
      <StructurePanel v-if="store.ui.activeTab === 'structure'" />
      <DesignPanel v-else-if="store.ui.activeTab === 'design'" />
      <ExportPanel v-else />
    </div>

    <footer class="property-footer">
      <span>PAPERFORM / PRINT STUDIO</span>
      <span>v0.1</span>
    </footer>
  </div>
</template>

<style scoped>
.property-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.property-head {
  flex: 0 0 auto;
  padding: 19px 18px 0;
}

.property-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-property {
  display: none;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--muted);
}

.property-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.display-title {
  font-size: 29px;
}

.scope-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid rgba(255, 77, 31, 0.26);
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 8px;
  font-weight: 660;
  white-space: nowrap;
}

.scope-chip i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}

.scope-chip span {
  margin-left: 2px;
  opacity: 0.5;
}

.scope-chip.is-global {
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.34);
  color: var(--muted);
}

.scope-chip.is-global i {
  background: var(--success);
}

.property-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin: 17px -18px 0;
  padding: 0 18px;
  border-bottom: 1px solid var(--line);
}

.property-tab {
  position: relative;
  display: flex;
  height: 37px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.02em;
  transition: color 160ms ease;
}

.property-tab::after {
  position: absolute;
  right: 9px;
  bottom: -1px;
  left: 9px;
  height: 2px;
  background: var(--accent);
  content: '';
  opacity: 0;
  transform: scaleX(0.5);
  transition:
    opacity 160ms ease,
    transform 180ms var(--ease-out);
}

.property-tab:hover {
  color: var(--ink);
}

.property-tab.is-active {
  color: var(--ink);
}

.property-tab.is-active::after {
  opacity: 1;
  transform: scaleX(1);
}

.property-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.property-footer {
  display: flex;
  height: 29px;
  flex: 0 0 29px;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  border-top: 1px solid var(--line);
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 6px;
  letter-spacing: 0.08em;
}

@media (max-width: 1023px) {
  .close-property {
    display: grid;
  }
}
</style>
