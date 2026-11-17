<script setup lang="ts">
import { computed } from 'vue'
import { Download, PanelLeft, Plus, Redo2, Undo2 } from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'

const store = useDesignerStore()

const saveLabel = computed(() => {
  switch (store.ui.saveState) {
    case 'saving':
      return '保存中…'
    case 'session-only':
      return '仅本次会话'
    case 'error':
      return '保存失败'
    default:
      return '全部更改已保存'
  }
})

function onNameChange(event: Event) {
  const target = event.target as HTMLInputElement
  store.setName(target.value)
}

function openExport() {
  store.setTab('export')
  if (window.innerWidth < 1024) store.ui.rightOpen = true
}

function toggleNetDrawer() {
  store.ui.leftOpen = !store.ui.leftOpen
}
</script>

<template>
  <header class="app-header">
    <div class="brand-block">
      <button class="net-trigger" aria-label="打开展开图" title="展开图" @click="toggleNetDrawer">
        <PanelLeft :size="17" :stroke-width="1.7" />
      </button>
      <a class="brand" href="#" aria-label="PAPERFORM 首页" @click.prevent>
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M4 5h24v18.5L21.5 30H4V5Z" stroke="currentColor" stroke-width="1.4" />
            <path d="M4 5 21.5 23.5M28 23.5H21.5V30" stroke="currentColor" stroke-width="1.4" />
            <path d="M9 11.5h8.5" stroke="#ff4d1f" stroke-width="1.7" />
          </svg>
        </span>
        <span class="brand-words">
          <strong>PAPERFORM</strong>
          <small>纸构 / CARTON STUDIO</small>
        </span>
      </a>
    </div>

    <div class="project-block">
      <span class="project-index">PROJECT 01</span>
      <div class="project-name-wrap">
        <input
          class="project-name"
          :value="store.project.name"
          aria-label="项目名称"
          maxlength="40"
          @change="onNameChange"
        />
        <span class="project-edit">RENAME</span>
      </div>
      <span class="save-state" :class="`is-${store.ui.saveState}`">
        <i />
        {{ saveLabel }}
      </span>
    </div>

    <div class="header-actions">
      <button
        class="icon-button header-icon"
        :disabled="!store.canUndo"
        aria-label="撤销"
        title="撤销 ⌘Z"
        @click="store.undo()"
      >
        <Undo2 :size="16" :stroke-width="1.8" />
      </button>
      <button
        class="icon-button header-icon"
        :disabled="!store.canRedo"
        aria-label="重做"
        title="重做 ⇧⌘Z"
        @click="store.redo()"
      >
        <Redo2 :size="16" :stroke-width="1.8" />
      </button>
      <span class="header-divider" />
      <button class="new-button" title="新建纸盒" aria-label="新建纸盒" @click="store.newProject()">
        <Plus :size="15" :stroke-width="2" />
        <span>新建</span>
      </button>
      <button class="export-button" @click="openExport">
        <Download :size="15" :stroke-width="2" />
        导出
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: relative;
  z-index: 60;
  display: grid;
  grid-template-columns: minmax(250px, 1fr) minmax(300px, auto) minmax(300px, 1fr);
  height: var(--header-height);
  flex: 0 0 var(--header-height);
  align-items: center;
  padding: 0 20px 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--ink);
  color: var(--white);
}

.brand-block {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.net-trigger {
  display: none;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.72);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: var(--white);
}

.brand-mark svg {
  width: 30px;
  height: 30px;
}

.brand-words {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.brand-words strong {
  font-size: 13px;
  font-weight: 760;
  letter-spacing: 0.17em;
}

.brand-words small {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 7px;
  font-weight: 620;
  letter-spacing: 0.14em;
}

.project-block {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.project-index {
  color: rgba(255, 255, 255, 0.33);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.project-name-wrap {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
}

.project-name {
  width: min(240px, 22vw);
  padding: 4px 0 5px;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--white);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 440;
  letter-spacing: 0.01em;
  text-align: center;
  transition: border-color 160ms ease;
}

.project-name:hover,
.project-name:focus {
  border-color: rgba(255, 255, 255, 0.26);
}

.project-edit {
  position: absolute;
  right: -2px;
  bottom: -8px;
  color: transparent;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.16em;
  pointer-events: none;
  transition: color 160ms ease;
}

.project-name-wrap:hover .project-edit {
  color: rgba(255, 255, 255, 0.34);
}

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.34);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.save-state i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(46, 125, 91, 0.14);
}

.save-state.is-saving i {
  background: var(--warning);
  box-shadow: 0 0 0 3px rgba(183, 121, 31, 0.14);
  animation: pulse 1.2s infinite;
}

.save-state.is-session-only i,
.save-state.is-error i {
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(255, 77, 31, 0.14);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.header-icon {
  color: rgba(255, 255, 255, 0.58);
}

.header-icon:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--white);
}

.header-divider {
  width: 1px;
  height: 20px;
  margin: 0 8px;
  background: rgba(255, 255, 255, 0.12);
}

.new-button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 10px;
  font-weight: 650;
  transition:
    background 160ms ease,
    color 160ms ease;
}

.new-button:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--white);
}

.export-button {
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 7px;
  margin-left: 8px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--white);
  font-size: 10px;
  font-weight: 780;
  letter-spacing: 0.11em;
  transition:
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.export-button:hover {
  background: #ff5f35;
  box-shadow: 0 8px 26px rgba(255, 77, 31, 0.32);
}

.export-button:active {
  transform: translateY(1px);
}

@media (max-width: 1279px) {
  .app-header {
    grid-template-columns: minmax(190px, 1fr) minmax(240px, auto) minmax(240px, 1fr);
    padding-left: 12px;
  }

  .net-trigger {
    display: grid;
  }

  .project-index {
    display: none;
  }

  .brand-words small {
    display: none;
  }
}

@media (max-width: 1023px) {
  .project-name {
    font-size: 16px;
  }

  .save-state {
    display: none;
  }

  .new-button span {
    display: none;
  }

  .new-button {
    width: 34px;
    padding: 0;
    justify-content: center;
  }
}

@media (max-width: 760px) {
  .app-header {
    grid-template-columns: auto 1fr auto;
    gap: 6px;
  }

  .brand-words {
    display: none;
  }

  .project-block {
    justify-content: flex-start;
    padding-left: 8px;
  }

  .project-name {
    width: 100%;
    text-align: left;
    font-size: 15px;
  }

  .header-icon,
  .header-divider,
  .new-button {
    display: none;
  }

  .export-button {
    padding: 0 14px;
  }
}
</style>
