<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import NetViewer from '@/components/NetViewer.vue'
import BoxViewer from '@/components/BoxViewer.vue'
import PropertyPanel from '@/components/PropertyPanel.vue'
import ToastStack from '@/components/ToastStack.vue'
import { useDesignerStore } from '@/stores/designer'
import { isEditableTarget } from '@/core/shortcuts'
import { downloadBlob, exportJson } from '@/core/exporters'

const store = useDesignerStore()

const layoutClass = computed(() => {
  const views: string[] = []
  if (store.ui.showNet) views.push('net')
  if (store.ui.showStage) views.push('stage')
  if (store.ui.showProperties) views.push('properties')
  if (views.length >= 3) return 'layout-three'
  if (views.length === 2) return `layout-two layout-two-${views.join('-')}`
  return `layout-one layout-one-${views[0] ?? 'stage'}`
})

function syncCompactLayout() {
  if (typeof window === 'undefined' || window.innerWidth >= 1024) return
  if (store.visibleViewCount() <= 1) return
  const preferred = store.ui.showStage ? 'stage' : store.ui.showNet ? 'net' : 'properties'
  store.focusView(preferred)
}

function onKeydown(event: KeyboardEvent) {
  const mod = event.metaKey || event.ctrlKey
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
    store.showPropertiesPanel()
  }
}

onMounted(() => {
  void store.init()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', syncCompactLayout)
  syncCompactLayout()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', syncCompactLayout)
})
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="workspace" :class="layoutClass" data-test="workspace">
      <aside v-show="store.ui.showNet" class="net-shell" data-test="net-panel">
        <NetViewer />
      </aside>

      <section v-show="store.ui.showStage" class="stage-panel" data-test="stage-panel">
        <BoxViewer />
      </section>

      <aside v-show="store.ui.showProperties" class="property-shell" data-test="property-panel">
        <PropertyPanel />
      </aside>
    </main>
    <ToastStack />
  </div>
</template>
