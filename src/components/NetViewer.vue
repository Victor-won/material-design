<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Maximize2, Ruler, ScanLine, ZoomIn, ZoomOut } from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'
import { buildNetSvg } from '@/core/netSvg'
import { FACE_LABELS } from '@/core/materials'
import type { FaceId } from '@/core/types'

const store = useDesignerStore()
const viewport = ref<HTMLElement | null>(null)
const host = ref<HTMLElement | null>(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const natural = ref({ w: 800, h: 500, scale: 0.6 })
const fitted = ref(false)
const hoveredFace = ref<FaceId | null>(null)

const svgMarkup = computed(() =>
  buildNetSvg(store.boxModel, store.project, store.designRevision, {
    selectedFace: store.selectedFace,
    showBleed: store.ui.showBleed,
    showAnnotations: store.ui.showAnnotations,
    bleed: store.project.bleed,
    technical: true,
  }),
)

const wrapperStyle = computed(() => ({
  width: `${natural.value.w * natural.value.scale}px`,
  height: `${natural.value.h * natural.value.scale}px`,
}))

const selectedLabel = computed(() => FACE_LABELS[store.selectedFace].zh)
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)
const netMeta = computed(
  () =>
    `${Math.round(store.boxModel.net.width)} × ${Math.round(store.boxModel.net.height)} mm`,
)

let ro: ResizeObserver | null = null
const lastNatural = { w: 0, h: 0 }

function measure() {
  const el = host.value?.querySelector('svg')
  if (!el) return
  const w = Number(el.getAttribute('data-net-width')) || 800
  const h = Number(el.getAttribute('data-net-height')) || 500
  const changed = Math.abs(w - lastNatural.w) > 0.5 || Math.abs(h - lastNatural.h) > 0.5
  lastNatural.w = w
  lastNatural.h = h
  natural.value = { w, h, scale: natural.value.scale }
  if (!fitted.value || (changed && zoom.value === 1)) {
    fit()
  } else {
    applyViewBox()
  }
}

function applyViewBox() {
  const el = host.value?.querySelector('svg')
  if (!el) return
  const wrapW = natural.value.w * natural.value.scale
  const wrapH = natural.value.h * natural.value.scale
  if (wrapW < 1 || wrapH < 1) return
  const visibleW = natural.value.w / zoom.value
  const visibleH = natural.value.h / zoom.value
  const centerX = natural.value.w / 2 - (pan.value.x / wrapW) * visibleW
  const centerY = natural.value.h / 2 - (pan.value.y / wrapH) * visibleH
  el.setAttribute('viewBox', `${(centerX - visibleW / 2).toFixed(3)} ${(centerY - visibleH / 2).toFixed(3)} ${visibleW.toFixed(3)} ${visibleH.toFixed(3)}`)
  el.setAttribute('width', '100%')
  el.setAttribute('height', '100%')
}

function fit() {
  const rect = viewport.value?.getBoundingClientRect()
  if (!rect || rect.width < 20 || rect.height < 20) return
  const availableW = rect.width - 48
  const availableH = rect.height - 56
  const scale = Math.min(availableW / natural.value.w, availableH / natural.value.h)
  natural.value.scale = Math.max(0.1, scale)
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
  fitted.value = true
  applyViewBox()
}

function zoomBy(factor: number) {
  zoom.value = Math.min(4, Math.max(0.25, zoom.value * factor))
  applyViewBox()
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const factor = event.deltaY < 0 ? 1.1 : 0.9
  zoomBy(factor)
}

let dragging = false
let pointerId = -1
let startX = 0
let startY = 0
let lastX = 0
let lastY = 0
let moved = 0
let downTarget: Element | null = null

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const target = event.target as Element
  if (target.closest('button')) return
  dragging = true
  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  lastX = event.clientX
  lastY = event.clientY
  moved = 0
  downTarget = target
  viewport.value?.setPointerCapture(event.pointerId)
  if (viewport.value) viewport.value.style.cursor = 'grabbing'
}

function onPointerMove(event: PointerEvent) {
  if (dragging) {
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    moved += Math.abs(dx) + Math.abs(dy)
    pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
    lastX = event.clientX
    lastY = event.clientY
    applyViewBox()
    return
  }
  const target = (event.target as Element).closest('[data-face]')
  if (target) {
    const face = target.getAttribute('data-face') as FaceId | null
    hoveredFace.value = face
  } else {
    hoveredFace.value = null
  }
}

function onPointerUp(event: PointerEvent) {
  if (!dragging) return
  dragging = false
  viewport.value?.releasePointerCapture(pointerId)
  if (viewport.value) viewport.value.style.cursor = ''
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance < 5 && moved < 12 && downTarget) {
    const target = downTarget.closest('[data-face]') as HTMLElement | null
    const face = target?.getAttribute('data-face') as FaceId | null
    if (face) store.selectFace(face)
  }
  downTarget = null
}

function onKeyDown(event: KeyboardEvent) {
  const target = (event.target as Element).closest('[data-face]')
  if (!target) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const face = target.getAttribute('data-face') as FaceId | null
    if (face) store.selectFace(face)
  }
}

function onLeave() {
  hoveredFace.value = null
}

watch(svgMarkup, async () => {
  await nextTick()
  measure()
  applyViewBox()
})

watch(
  () => store.ui.showNet,
  async visible => {
    if (!visible) return
    await nextTick()
    measure()
    fit()
  },
)

onMounted(async () => {
  await nextTick()
  measure()
  ro = new ResizeObserver(() => {
    if (!fitted.value) measure()
    else {
      const rect = viewport.value?.getBoundingClientRect()
      if (!rect) return
      const availableW = rect.width - 48
      const availableH = rect.height - 56
      natural.value.scale = Math.max(
        0.1,
        Math.min(availableW / natural.value.w, availableH / natural.value.h),
      )
      applyViewBox()
    }
  })
  if (viewport.value) ro.observe(viewport.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
})
</script>

<template>
  <div class="net-viewer">
    <header class="net-header">
      <div>
        <span class="eyebrow">01 / Dieline</span>
        <div class="title-row">
          <h1 class="display-title">展开图</h1>
          <span class="net-meta">{{ netMeta }}</span>
        </div>
      </div>
      <div class="net-tools">
        <button class="icon-button" title="缩小" aria-label="缩小" @click="zoomBy(0.86)">
          <ZoomOut :size="15" :stroke-width="1.8" />
        </button>
        <span class="zoom-value">{{ zoomLabel }}</span>
        <button class="icon-button" title="放大" aria-label="放大" @click="zoomBy(1.16)">
          <ZoomIn :size="15" :stroke-width="1.8" />
        </button>
        <span class="tool-separator" />
        <button class="icon-button" title="适配画布" aria-label="适配画布" @click="fit">
          <Maximize2 :size="15" :stroke-width="1.8" />
        </button>
        <button
          class="icon-button"
          :class="{ 'is-active': store.ui.showBleed }"
          title="显示出血"
          aria-label="显示出血"
          @click="store.toggleBleed()"
        >
          <ScanLine :size="15" :stroke-width="1.8" />
        </button>
        <button
          class="icon-button"
          :class="{ 'is-active': store.ui.showAnnotations }"
          title="显示标注"
          aria-label="显示标注"
          @click="store.toggleAnnotations()"
        >
          <Ruler :size="15" :stroke-width="1.8" />
        </button>
      </div>
    </header>

    <div
      ref="viewport"
      class="net-viewport"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onLeave"
      @keydown="onKeyDown"
    >
      <span class="net-watermark" aria-hidden="true">NET</span>
      <div class="net-stage">
        <div ref="host" class="net-svg-wrap" :style="wrapperStyle" v-html="svgMarkup" />
      </div>

      <div class="net-hover-chip" :class="{ 'is-visible': hoveredFace }">
        <span class="chip-dot" />
        {{ hoveredFace ? FACE_LABELS[hoveredFace].zh : '' }}
        <small>{{ hoveredFace ? FACE_LABELS[hoveredFace].en : '' }}</small>
      </div>

      <div class="net-selection">
        <span>当前选中</span>
        <strong>{{ selectedLabel }}</strong>
        <span class="selection-mode">{{ store.ui.scope === 'global' ? '全局设计' : '单面编辑' }}</span>
      </div>
    </div>

    <footer class="net-footer">
      <div class="legend">
        <span><i class="legend-cut" />裁切线</span>
        <span><i class="legend-fold" />折线</span>
        <span><i class="legend-bleed" />出血</span>
      </div>
      <span class="net-note">3mm BLEED · 300 DPI</span>
    </footer>
  </div>
</template>

<style scoped>
.net-viewer {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.net-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 18px 14px 20px;
  border-bottom: 1px solid rgba(217, 210, 195, 0.72);
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 8px;
}

.display-title {
  font-size: 32px;
  white-space: nowrap;
}

.net-meta {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.net-tools {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 3px;
  border: 1px solid rgba(217, 210, 195, 0.8);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
}

.net-tools .icon-button {
  width: 27px;
  height: 27px;
}

.zoom-value {
  min-width: 34px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  text-align: center;
}

.tool-separator {
  width: 1px;
  height: 15px;
  margin: 0 3px;
  background: var(--line);
}

.net-viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(217, 210, 195, 0.18) 1px, transparent 1px) 0 0 / 40px 40px,
    linear-gradient(rgba(217, 210, 195, 0.18) 1px, transparent 1px) 0 0 / 40px 40px,
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.7), transparent 67%);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.net-watermark {
  position: absolute;
  top: 14px;
  right: 14px;
  color: rgba(116, 110, 98, 0.1);
  font-family: var(--font-display);
  font-size: 64px;
  font-style: italic;
  line-height: 1;
  pointer-events: none;
}

.net-stage {
  position: absolute;
  inset: 0;
}

.net-svg-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.net-svg-wrap :deep(svg) {
  width: 100%;
  height: 100%;
  overflow: visible;
  shape-rendering: geometricPrecision;
  image-rendering: auto;
}

.net-hover-chip {
  position: absolute;
  bottom: 18px;
  left: 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(217, 210, 195, 0.9);
  border-radius: 6px;
  background: rgba(251, 248, 241, 0.88);
  color: var(--ink);
  font-size: 12px;
  font-weight: 650;
  opacity: 0;
  transform: translateY(3px);
  transition:
    opacity 150ms ease,
    transform 150ms ease;
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.net-hover-chip.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.chip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.net-hover-chip small {
  margin-left: 2px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
}

.net-selection {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid rgba(217, 210, 195, 0.9);
  border-radius: 6px;
  background: rgba(251, 248, 241, 0.86);
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.04em;
  backdrop-filter: blur(8px);
}

.net-selection strong {
  color: var(--ink);
  font-size: 12px;
  font-weight: 680;
}

.selection-mode {
  padding-left: 7px;
  border-left: 1px solid var(--line);
  color: var(--accent);
  font-size: 10px;
  font-weight: 650;
}

.net-footer {
  display: flex;
  flex: 0 0 45px;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-top: 1px solid var(--line);
  background: rgba(251, 248, 241, 0.72);
}

.legend {
  display: flex;
  align-items: center;
  gap: 13px;
  color: var(--muted);
  font-size: 10px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend i {
  display: inline-block;
  width: 13px;
  height: 1px;
  background: var(--ink);
}

.legend .legend-fold {
  height: 0;
  border-top: 1px dashed var(--fold);
  background: transparent;
}

.legend .legend-bleed {
  height: 4px;
  border: 1px solid #d7ccb8;
  background: rgba(215, 204, 184, 0.28);
}

.net-note {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
}

@media (max-width: 1439px) {
  .net-header {
    padding: 18px 14px 12px 16px;
  }

  .display-title {
    font-size: 28px;
  }

  .net-meta {
    display: none;
  }

  .net-tools {
    padding: 2px;
  }

  .net-tools .icon-button {
    width: 24px;
    height: 24px;
  }

  .zoom-value {
    min-width: 29px;
  }
}
</style>
