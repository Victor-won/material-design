<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Code2,
  Download,
  FileJson,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  ShieldCheck,
  Upload,
} from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'
import RangeField from '@/components/ui/RangeField.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import {
  downloadBlob,
  exportFileBase,
  exportJson,
  exportPdf,
  exportPng,
  exportSvg,
} from '@/core/exporters'
import type { Project } from '@/core/types'

const store = useDesignerStore()
const importInput = ref<HTMLInputElement | null>(null)

const fileBase = computed(() => exportFileBase(store.project))
const summary = computed(
  () =>
    `${store.boxModel.name} · ${store.project.dimensions.length} × ${store.project.dimensions.width} × ${store.project.dimensions.height} mm · ${store.project.bleed}mm 出血`,
)

type ExportKind = 'pdf' | 'png' | 'svg' | 'json'

async function runExport(kind: ExportKind) {
  if (store.ui.exporting) return
  store.ui.exporting = true
  try {
    if (kind === 'pdf') {
      const result = await exportPdf(store.project, store.designRevision)
      downloadBlob(result.blob, result.filename)
      store.addToast('success', `印刷 PDF 已生成 · ${(result.blob.size / 1024 / 1024).toFixed(1)}MB`)
    } else if (kind === 'png') {
      const result = await exportPng(store.project, store.designRevision)
      downloadBlob(result.blob, result.filename)
      store.addToast('success', `高清 PNG 已生成 · ${(result.blob.size / 1024 / 1024).toFixed(1)}MB`)
    } else if (kind === 'svg') {
      const result = exportSvg(store.project, store.designRevision)
      downloadBlob(result.blob, result.filename)
      store.addToast('success', 'SVG 刀模已生成')
    } else {
      const result = exportJson(store.project)
      downloadBlob(result.blob, result.filename)
      store.addToast('success', '工程文件已保存')
    }
  } catch (error) {
    store.addToast('error', error instanceof Error ? error.message : '导出失败，请重试')
  } finally {
    store.ui.exporting = false
  }
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as Project
    await store.loadProject(parsed)
    store.addToast('success', '工程已载入，继续设计吧')
  } catch (error) {
    store.addToast('error', error instanceof Error ? error.message : '工程文件无法读取')
  }
}
</script>

<template>
  <div class="export-panel">
    <div class="export-hero">
      <span class="eyebrow">Print handoff</span>
      <h2>交付印刷厂</h2>
      <p>{{ summary }}</p>
      <div class="file-preview">
        <span>{{ fileBase }}</span>
        <small>PDF / PNG / SVG / JSON</small>
      </div>
    </div>

    <SectionCard index="01" title="出血与安全区" hint="裁切后保留的印刷余量，单位毫米">
      <div class="two-col">
        <RangeField
          :model-value="store.project.bleed"
          label="出血"
          :min="0"
          :max="5"
          :step="0.5"
          :decimals="1"
          unit="mm"
          @update:model-value="store.setBleed($event, 'bleed')"
        />
        <RangeField
          :model-value="store.project.safeArea"
          label="安全区"
          :min="0"
          :max="5"
          :step="0.5"
          :decimals="1"
          unit="mm"
          @update:model-value="store.setSafeArea($event, 'safe')"
        />
      </div>
      <div class="dpi-note">
        <ShieldCheck :size="14" />
        <div>
          <strong>300 DPI 输出</strong>
          <span>超大盒型自动限制到 6000px 长边；刀模需印厂复核。</span>
        </div>
      </div>
    </SectionCard>

    <SectionCard index="02" title="导出文件" hint="所有文件以项目名与日期命名">
      <div class="export-list">
        <button class="export-card is-primary" :disabled="store.ui.exporting" @click="runExport('pdf')">
          <span class="export-icon"><FileText :size="18" :stroke-width="1.6" /></span>
          <span class="export-copy">
            <strong>印刷 PDF</strong>
            <small>300dpi 贴图 + 矢量刀模两页</small>
          </span>
          <span class="export-action">
            <LoaderCircle v-if="store.ui.exporting" class="spin" :size="15" />
            <Download v-else :size="15" />
          </span>
        </button>

        <button class="export-card" :disabled="store.ui.exporting" @click="runExport('png')">
          <span class="export-icon"><ImageIcon :size="17" :stroke-width="1.6" /></span>
          <span class="export-copy">
            <strong>高清 PNG</strong>
            <small>含出血与标注的展开图</small>
          </span>
          <span class="export-action"><Download :size="14" /></span>
        </button>

        <button class="export-card" :disabled="store.ui.exporting" @click="runExport('svg')">
          <span class="export-icon"><Code2 :size="17" :stroke-width="1.6" /></span>
          <span class="export-copy">
            <strong>SVG 刀模</strong>
            <small>矢量线 + 内嵌贴图，可继续编辑</small>
          </span>
          <span class="export-action"><Download :size="14" /></span>
        </button>

        <button class="export-card" :disabled="store.ui.exporting" @click="runExport('json')">
          <span class="export-icon"><FileJson :size="17" :stroke-width="1.6" /></span>
          <span class="export-copy">
            <strong>工程文件</strong>
            <small>盒型、尺寸、贴图与图层完整保存</small>
          </span>
          <span class="export-action"><Download :size="14" /></span>
        </button>
      </div>
    </SectionCard>

    <SectionCard index="03" title="工程导入" hint="恢复之前保存的 PAPERFORM JSON">
      <button class="import-zone" @click="importInput?.click()">
        <Upload :size="17" :stroke-width="1.5" />
        <span>
          <strong>导入工程 JSON</strong>
          <small>将替换当前工作区，建议先导出备份</small>
        </span>
      </button>
      <input
        ref="importInput"
        class="sr-only"
        type="file"
        accept="application/json,.json"
        @change="onImport"
      />
    </SectionCard>

    <div class="printer-warning">
      <span class="warning-index">NOTE</span>
      <p>
        刀模尺寸、纸张纹向与印刷工艺需由实际印厂确认。本工具输出的是设计交付文件，不替代结构工程签样。
      </p>
    </div>
  </div>
</template>

<style scoped>
.export-panel {
  padding: 2px 18px 28px;
}

.export-hero {
  padding: 14px 0 18px;
  border-bottom: 1px solid rgba(217, 210, 195, 0.72);
}

.export-hero h2 {
  margin: 10px 0 5px;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 440;
  letter-spacing: -0.025em;
  line-height: 1;
}

.export-hero p {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.6;
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 13px;
  padding: 9px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.32);
}

.file-preview span {
  overflow: hidden;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-preview small {
  flex: 0 0 auto;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.05em;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dpi-note {
  display: flex;
  gap: 8px;
  margin-top: 13px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(46, 125, 91, 0.07);
  color: var(--success);
}

.dpi-note div {
  display: flex;
  flex-direction: column;
}

.dpi-note strong {
  font-size: 11px;
  font-weight: 720;
}

.dpi-note span {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.45;
}

.export-list {
  display: grid;
  gap: 6px;
}

.export-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.32);
  text-align: left;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.export-card:hover {
  border-color: var(--ink);
  background: var(--panel-raised);
  transform: translateY(-1px);
}

.export-card.is-primary {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--white);
}

.export-card.is-primary:hover {
  background: #24221c;
}

.export-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 7px;
  background: var(--paper-deep);
  color: var(--ink);
}

.export-card.is-primary .export-icon {
  background: rgba(255, 255, 255, 0.1);
  color: var(--accent);
}

.export-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.export-copy strong {
  font-size: 12px;
  font-weight: 690;
}

.export-copy small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.export-card.is-primary .export-copy small {
  color: rgba(255, 255, 255, 0.44);
}

.export-action {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border-radius: 50%;
  color: var(--muted);
}

.export-card.is-primary .export-action {
  background: var(--accent);
  color: var(--white);
}

.spin {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.import-zone {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 11px;
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
  color: var(--muted);
  text-align: left;
  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.import-zone:hover {
  border-color: var(--accent);
  background: rgba(255, 77, 31, 0.04);
  color: var(--accent-deep);
}

.import-zone span {
  display: flex;
  flex-direction: column;
}

.import-zone strong {
  color: var(--ink);
  font-size: 11px;
  font-weight: 680;
}

.import-zone small {
  margin-top: 2px;
  color: var(--muted-2);
  font-size: 10px;
}

.printer-warning {
  display: flex;
  gap: 9px;
  margin-top: 14px;
  padding: 11px;
  border: 1px solid rgba(183, 121, 31, 0.22);
  border-radius: 8px;
  background: rgba(183, 121, 31, 0.06);
}

.warning-index {
  color: var(--warning);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.printer-warning p {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}
</style>
