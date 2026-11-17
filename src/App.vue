<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { PanelLeft, SlidersHorizontal } from '@lucide/vue'
import AppHeader from '@/components/AppHeader.vue'
import NetViewer from '@/components/NetViewer.vue'
import BoxViewer from '@/components/BoxViewer.vue'
import PropertyPanel from '@/components/PropertyPanel.vue'
import ToastStack from '@/components/ToastStack.vue'
import { useDesignerStore } from '@/stores/designer'
import { isEditableTarget } from '@/core/shortcuts'
import { downloadBlob, exportJson } from '@/core/exporters'

const store = useDesignerStore()

function onKeydown(event: KeyboardEvent) {
  const mod = event.metaKey || event.ctrlKey
  if (event.key === 'Escape') {
    store.ui.leftOpen = false
    store.ui.rightOpen = false
    return
  }
  if (!mod || isEditableTarget(event.target)) return
  const key = event.key.toLowerCase()
  if (key === 'z') {
    event.preventDefault()
    if (event.shiftKey) store.redo()
    else store.undo()
  } else if (key === 's') {
    event.preventDefault()
    const result = exportJson(store.project)
    downloadBlob(result.blob, result.filename)
    store.addToast('success', '工程文件已保存')
  } else if (key === 'e') {
    event.preventDefault()
    store.setTab('export')
    if (window.innerWidth < 1024) store.ui.rightOpen = true
  }
}

onMounted(() => {
  void store.init()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="workspace">
      <div
        v-if="store.ui.leftOpen"
        class="drawer-scrim"
        aria-hidden="true"
        @click="store.ui.leftOpen = false"
      />
      <aside
        class="net-shell"
        :class="{ 'is-open': store.ui.leftOpen }"
        data-test="net-panel"
      >
        <NetViewer />
      </aside>

      <section class="stage-panel" data-test="stage-panel">
        <BoxViewer />
        <button
          class="floating-trigger is-net"
          aria-label="打开展开图"
          title="展开图"
          @click="store.ui.leftOpen = true"
        >
          <PanelLeft :size="15" />
          <span>展开图</span>
        </button>
        <button
          class="floating-trigger is-props"
          aria-label="打开属性面板"
          title="设计属性"
          @click="store.ui.rightOpen = true"
        >
          <SlidersHorizontal :size="15" />
          <span>属性</span>
        </button>
      </section>

      <aside
        class="property-shell"
        :class="{ 'is-open': store.ui.rightOpen }"
        data-test="property-panel"
      >
        <PropertyPanel />
      </aside>
    </main>
    <ToastStack />
  </div>
</template>

<style scoped>
.drawer-scrim {
  display: none;
}

.floating-trigger {
  position: absolute;
  z-index: 8;
  display: none;
  height: 33px;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(18, 18, 16, 0.55);
  color: rgba(255, 255, 255, 0.72);
  font-size: 8px;
  font-weight: 620;
  backdrop-filter: blur(12px);
}

.floating-trigger.is-net {
  top: 74px;
  left: 16px;
}

.floating-trigger.is-props {
  top: 74px;
  right: 16px;
}

@media (max-width: 1279px) {
  .floating-trigger.is-net {
    display: inline-flex;
  }

  .drawer-scrim {
    position: fixed;
    inset: var(--header-height) 0 0 0;
    z-index: 35;
    display: block;
    background: rgba(18, 18, 16, 0.32);
    backdrop-filter: blur(2px);
  }
}

@media (max-width: 1023px) {
  .floating-trigger.is-props {
    display: inline-flex;
  }
}
</style>
