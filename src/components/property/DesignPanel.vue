<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Trash2,
  Type,
  UploadCloud,
} from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'
import type { DesignLayer, ImageLayer, PaperTextureId, PatternId, TextFont, TextLayer } from '@/core/types'
import { compressImageFile } from '@/core/image'
import { ARTWORK_PRESETS, buildPreset } from '@/core/presets'
import SectionCard from '@/components/ui/SectionCard.vue'
import RangeField from '@/components/ui/RangeField.vue'
import ColorField from '@/components/ui/ColorField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const store = useDesignerStore()
const bgInput = ref<HTMLInputElement | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const art = computed(() => store.currentArtwork)
const locked = computed(() => store.ui.scope !== 'global' && store.currentScopeInherited)
const selectedText = computed<TextLayer | null>(() =>
  store.selectedLayer?.type === 'text' ? (store.selectedLayer as TextLayer) : null,
)
const selectedImage = computed<ImageLayer | null>(() =>
  store.selectedLayer?.type === 'image' ? (store.selectedLayer as ImageLayer) : null,
)
const layerList = computed(() => [...art.value.layers].reverse())
const scopeValue = computed(() => (store.ui.scope === 'global' ? 'global' : 'face'))

const selectedFaceLabel = computed(
  () => store.faceInfo.find(face => face.id === store.selectedFace)?.label ?? '当前面',
)
const scopeOptions = computed(() => [
  { value: 'global', label: '全局' },
  { value: 'face', label: selectedFaceLabel.value },
])

const colorSwatches = [
  '#d8b98a',
  '#f2eee4',
  '#1f1e1b',
  '#2447ff',
  '#ff4d1f',
  '#2e7d5b',
  '#e8d5e7',
  '#b9c7a8',
]

const paperTextures: { value: PaperTextureId; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'fiber', label: '纤维' },
  { value: 'linen', label: '布纹' },
  { value: 'flute', label: '瓦楞' },
  { value: 'noise', label: '噪点' },
]

const patterns: { value: PatternId; label: string; style: Record<string, string> }[] = [
  { value: 'none', label: '无', style: {} },
  {
    value: 'grid',
    label: '网格',
    style: {
      backgroundImage:
        'linear-gradient(rgba(30,28,23,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(30,28,23,.6) 1px, transparent 1px)',
      backgroundSize: '7px 7px',
    },
  },
  {
    value: 'dots',
    label: '圆点',
    style: {
      backgroundImage: 'radial-gradient(rgba(30,28,23,.65) 1px, transparent 1px)',
      backgroundSize: '6px 6px',
    },
  },
  {
    value: 'stripes',
    label: '条纹',
    style: {
      backgroundImage: 'repeating-linear-gradient(90deg, rgba(30,28,23,.55) 0 1px, transparent 1px 5px)',
    },
  },
  {
    value: 'diagonal',
    label: '斜纹',
    style: {
      backgroundImage: 'repeating-linear-gradient(45deg, rgba(30,28,23,.55) 0 1px, transparent 1px 6px)',
    },
  },
  {
    value: 'checker',
    label: '棋盘',
    style: {
      backgroundImage:
        'linear-gradient(45deg, rgba(30,28,23,.5) 25%, transparent 25%, transparent 75%, rgba(30,28,23,.5) 75%), linear-gradient(45deg, rgba(30,28,23,.5) 25%, transparent 25%, transparent 75%, rgba(30,28,23,.5) 75%)',
      backgroundSize: '8px 8px',
      backgroundPosition: '0 0, 4px 4px',
    },
  },
  {
    value: 'waves',
    label: '波纹',
    style: {
      backgroundImage:
        'radial-gradient(circle at 50% 0, transparent 7px, rgba(30,28,23,.45) 7.5px, transparent 8px)',
      backgroundSize: '16px 9px',
    },
  },
  {
    value: 'cross',
    label: '十字',
    style: {
      backgroundImage:
        'linear-gradient(rgba(30,28,23,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,28,23,.5) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
      backgroundPosition: '-1px -1px',
    },
  },
]

const fontOptions: { value: TextFont; label: string }[] = [
  { value: 'newsreader', label: 'Newsreader' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'mono', label: 'Mono' },
]

const weightOptions = [300, 400, 500, 600, 700, 800]
const alignOptions = [
  { value: 'left', label: '左' },
  { value: 'center', label: '中' },
  { value: 'right', label: '右' },
]
const fitOptions = [
  { value: 'cover', label: '铺满' },
  { value: 'contain', label: '适应' },
]

function setScope(value: string) {
  if (value === 'global') store.selectGlobal()
  else store.setScope(store.selectedFace)
}

function patchArtwork(updater: Parameters<typeof store.updateArtwork>[0], key?: string) {
  store.updateArtwork(updater, key)
}

function setBaseColor(color: string, key?: string) {
  patchArtwork(a => ({ ...a, color }), key)
}

function setPaperTexture(value: PaperTextureId) {
  patchArtwork(a => ({ ...a, paperTexture: value }))
}

function setPattern(value: PatternId) {
  patchArtwork(a => ({ ...a, pattern: value }))
}

function patchImage(patch: Record<string, unknown>, key?: string) {
  patchArtwork(a => (a.image ? { ...a, image: { ...a.image, ...patch } } : a), key)
}

async function handleBackgroundFile(file: File) {
  try {
    const image = await compressImageFile(file)
    patchArtwork(a => ({
      ...a,
      image: {
        src: image.src,
        fit: 'cover',
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        opacity: 1,
      },
    }))
    store.addToast('success', '整面图片已应用')
  } catch (error) {
    store.addToast('error', error instanceof Error ? error.message : '图片处理失败')
  }
}

function onBackgroundInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void handleBackgroundFile(file)
  input.value = ''
}

function onBackgroundDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void handleBackgroundFile(file)
}

async function handleLogoFile(file: File) {
  try {
    const image = await compressImageFile(file)
    store.addImageLayer(image.src, 34)
    store.addToast('success', 'Logo 图层已添加，可继续调整位置与大小')
  } catch (error) {
    store.addToast('error', error instanceof Error ? error.message : '图片处理失败')
  }
}

function onLogoInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void handleLogoFile(file)
  input.value = ''
}

function removeBackgroundImage() {
  patchArtwork(a => ({ ...a, image: null }))
}

function patchLayer(patch: Partial<DesignLayer>, key?: string) {
  if (!store.selectedLayer) return
  store.updateLayer(store.selectedLayer.id, patch, key)
}

function patchText(patch: Partial<TextLayer>, key?: string) {
  patchLayer(patch as Partial<DesignLayer>, key)
}

function patchImageLayer(patch: Partial<ImageLayer>, key?: string) {
  patchLayer(patch as Partial<DesignLayer>, key)
}

function applyPreset(presetId: string) {
  const preset = ARTWORK_PRESETS.find(item => item.id === presetId)
  if (!preset) return
  store.updateArtwork(() => buildPreset(preset))
  store.addToast('success', `已应用「${preset.label}」模板`)
}
</script>

<template>
  <div class="design-panel">
    <section class="scope-block">
      <div class="scope-head">
        <span class="eyebrow">Artwork scope</span>
        <span class="scope-hint">{{ store.ui.scope === 'global' ? '所有未覆盖面' : '只影响当前面' }}</span>
      </div>
      <SegmentedControl
        :model-value="scopeValue"
        :options="scopeOptions"
        @update:model-value="setScope"
      />
      <div class="face-chips" aria-label="选择设计面">
        <button
          v-for="face in store.faceInfo"
          :key="face.id"
          class="face-chip"
          :class="{ 'is-active': store.ui.scope === face.id, 'is-inherited': !store.hasFaceOverride }"
          :aria-pressed="store.ui.scope === face.id"
          @click="store.selectFace(face.id)"
        >
          <span class="face-chip-dot" />
          {{ face.label }}
        </button>
      </div>
      <div v-if="locked" class="override-banner">
        <div>
          <strong>此面正在跟随全局设计</strong>
          <p>启用单面覆盖后，可单独调整这一面的底色、图片和文字。</p>
        </div>
        <button class="ghost-button is-accent" @click="store.enableOverride()">启用单面覆盖</button>
      </div>
      <div v-else-if="store.ui.scope !== 'global'" class="face-actions">
        <span>单面覆盖已开启</span>
        <div>
          <button class="text-action" @click="store.syncToAll()">同步到所有面</button>
          <button class="text-action muted" @click="store.followGlobal(true)">改回跟随全局</button>
        </div>
      </div>
    </section>

    <div class="design-fields" :class="{ 'is-locked': locked }" :inert="locked || undefined">
      <SectionCard index="01" title="底色与表面" hint="纸张颜色、纹理与印刷图案">
        <div class="color-row">
          <ColorField :model-value="art.color" @update:model-value="setBaseColor($event, 'base-color')" />
          <div class="swatch-row">
            <button
              v-for="swatch in colorSwatches"
              :key="swatch"
              class="mini-swatch"
              :class="{ 'is-active': art.color.toLowerCase() === swatch.toLowerCase() }"
              :style="{ background: swatch }"
              :aria-label="`底色 ${swatch}`"
              @click="setBaseColor(swatch)"
            />
          </div>
        </div>

        <div class="control-block">
          <span class="inline-label">纸张纹理</span>
          <div class="texture-row">
            <button
              v-for="texture in paperTextures"
              :key="texture.value"
              class="texture-pill"
              :class="{ 'is-active': art.paperTexture === texture.value }"
              @click="setPaperTexture(texture.value)"
            >
              {{ texture.label }}
            </button>
          </div>
        </div>

        <div class="control-block">
          <span class="inline-label">印刷图案</span>
          <div class="pattern-grid">
            <button
              v-for="pattern in patterns"
              :key="pattern.value"
              class="pattern-tile"
              :class="{ 'is-active': art.pattern === pattern.value, 'is-none': pattern.value === 'none' }"
              :aria-label="`图案 ${pattern.label}`"
              @click="setPattern(pattern.value)"
            >
              <span class="pattern-swatch" :style="pattern.style">{{ pattern.value === 'none' ? '∅' : '' }}</span>
              <small>{{ pattern.label }}</small>
            </button>
          </div>
          <div v-if="art.pattern !== 'none'" class="pattern-color">
            <span>图案颜色</span>
            <ColorField
              :model-value="art.patternColor"
              @update:model-value="patchArtwork(a => ({ ...a, patternColor: $event }), 'pattern-color')"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard index="02" title="整面图片" hint="图片会按面尺寸裁切，支持出血输出">
        <div
          v-if="!art.image"
          class="upload-zone"
          :class="{ 'is-dragging': dragging }"
          role="button"
          tabindex="0"
          @click="bgInput?.click()"
          @keydown.enter="bgInput?.click()"
          @keydown.space.prevent="bgInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onBackgroundDrop"
        >
          <UploadCloud :size="19" :stroke-width="1.5" />
          <strong>上传整面图片</strong>
          <small>PNG / JPG / WebP / SVG · 最大 8MB</small>
        </div>
        <div v-else class="image-card">
          <div class="image-preview">
            <img :src="art.image.src" alt="整面贴图预览" />
            <button class="remove-image" aria-label="移除整面图片" @click="removeBackgroundImage">
              <Trash2 :size="12" />
            </button>
          </div>
          <div class="image-settings">
            <div class="field-label"><span>填充方式</span></div>
            <SegmentedControl
              :model-value="art.image.fit"
              :options="fitOptions"
              compact
              @update:model-value="patchImage({ fit: $event })"
            />
            <RangeField
              :model-value="art.image.scale * 100"
              label="缩放"
              :min="50"
              :max="200"
              :step="5"
              unit="%"
              @update:model-value="patchImage({ scale: $event / 100 }, 'bg-scale')"
            />
            <div class="two-col">
              <RangeField
                :model-value="art.image.offsetX * 100"
                label="水平位移"
                :min="-50"
                :max="50"
                unit="%"
                @update:model-value="patchImage({ offsetX: $event / 100 }, 'bg-x')"
              />
              <RangeField
                :model-value="art.image.offsetY * 100"
                label="垂直位移"
                :min="-50"
                :max="50"
                unit="%"
                @update:model-value="patchImage({ offsetY: $event / 100 }, 'bg-y')"
              />
            </div>
            <div class="two-col">
              <RangeField
                :model-value="art.image.rotation"
                label="旋转"
                :min="-180"
                :max="180"
                unit="°"
                @update:model-value="patchImage({ rotation: $event }, 'bg-rotate')"
              />
              <RangeField
                :model-value="art.image.opacity * 100"
                label="透明度"
                :min="10"
                :max="100"
                unit="%"
                @update:model-value="patchImage({ opacity: $event / 100 }, 'bg-opacity')"
              />
            </div>
          </div>
        </div>
        <input
          ref="bgInput"
          class="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          @change="onBackgroundInput"
        />
      </SectionCard>

      <SectionCard index="03" title="文字与 Logo" hint="每个图层独立定位，导出时保持毫米比例">
        <template #action>
          <div class="layer-add">
            <button class="mini-add" aria-label="添加文字" title="添加文字" @click="store.addTextLayer()">
              <Type :size="12" />
            </button>
            <button class="mini-add" aria-label="添加 Logo" title="添加 Logo" @click="logoInput?.click()">
              <ImageIcon :size="12" />
            </button>
          </div>
        </template>

        <div v-if="layerList.length" class="layer-list">
          <div
            v-for="layer in layerList"
            :key="layer.id"
            class="layer-row"
            :class="{ 'is-active': store.ui.selectedLayerId === layer.id, 'is-hidden': !layer.visible }"
            role="button"
            tabindex="0"
            @click="store.selectLayer(layer.id)"
            @keydown.enter="store.selectLayer(layer.id)"
          >
            <span class="layer-icon">
              <Type v-if="layer.type === 'text'" :size="12" />
              <ImageIcon v-else :size="12" />
            </span>
            <span class="layer-name">{{ layer.name }}</span>
            <button
              class="layer-tool"
              :aria-label="layer.visible ? '隐藏图层' : '显示图层'"
              @click.stop="store.toggleLayerVisibility(layer.id)"
            >
              <EyeOff v-if="layer.visible" :size="12" />
              <Eye v-else :size="12" />
            </button>
            <button
              class="layer-tool"
              aria-label="删除图层"
              @click.stop="store.removeLayer(layer.id)"
            >
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
        <div v-else class="empty-layers">
          <Type :size="18" :stroke-width="1.4" />
          <p>还没有印刷图层</p>
          <span>添加文字或上传 Logo，开始设计这个面。</span>
        </div>

        <div v-if="selectedText" class="layer-editor">
          <div class="editor-head">
            <span>文字属性</span>
            <div class="editor-actions">
              <button aria-label="复制图层" @click="store.duplicateLayer(selectedText.id)">
                <Copy :size="12" />
              </button>
              <button aria-label="图层上移" @click="store.moveLayer(selectedText.id, 1)">
                <ArrowUp :size="12" />
              </button>
              <button aria-label="图层下移" @click="store.moveLayer(selectedText.id, -1)">
                <ArrowDown :size="12" />
              </button>
            </div>
          </div>
          <textarea
            class="textarea-input"
            :value="selectedText.text"
            aria-label="文字内容"
            @input="patchText({ text: ($event.target as HTMLTextAreaElement).value }, `text-${selectedText.id}`)"
          />
          <div class="two-col">
            <label class="mini-field">
              <span>字体</span>
              <select
                class="select-input"
                :value="selectedText.fontFamily"
                @change="patchText({ fontFamily: ($event.target as HTMLSelectElement).value as TextFont })"
              >
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </label>
            <label class="mini-field">
              <span>字重</span>
              <select
                class="select-input"
                :value="selectedText.weight"
                @change="patchText({ weight: Number(($event.target as HTMLSelectElement).value) })"
              >
                <option v-for="weight in weightOptions" :key="weight" :value="weight">
                  {{ weight }}
                </option>
              </select>
            </label>
          </div>
          <div class="two-col">
            <RangeField
              :model-value="selectedText.fontSize"
              label="字号"
              :min="1"
              :max="60"
              :step="0.5"
              :decimals="1"
              unit="mm"
              @update:model-value="patchText({ fontSize: $event }, `size-${selectedText.id}`)"
            />
            <RangeField
              :model-value="selectedText.letterSpacing"
              label="字距"
              :min="-1"
              :max="5"
              :step="0.05"
              :decimals="2"
              unit="mm"
              @update:model-value="patchText({ letterSpacing: $event }, `tracking-${selectedText.id}`)"
            />
          </div>
          <div class="two-col">
            <RangeField
              :model-value="selectedText.lineHeight"
              label="行高"
              :min="0.7"
              :max="2"
              :step="0.05"
              :decimals="2"
              @update:model-value="patchText({ lineHeight: $event }, `leading-${selectedText.id}`)"
            />
            <div class="align-field">
              <span>对齐</span>
              <SegmentedControl
                :model-value="selectedText.align"
                :options="alignOptions"
                compact
                @update:model-value="patchText({ align: $event as 'left' | 'center' | 'right' })"
              />
            </div>
          </div>
          <ColorField
            :model-value="selectedText.color"
            label="文字颜色"
            @update:model-value="patchText({ color: $event }, `color-${selectedText.id}`)"
          />
          <div class="position-grid">
            <RangeField
              :model-value="selectedText.x"
              label="X 位置"
              :min="0"
              :max="100"
              unit="%"
              @update:model-value="patchText({ x: $event }, `x-${selectedText.id}`)"
            />
            <RangeField
              :model-value="selectedText.y"
              label="Y 位置"
              :min="0"
              :max="100"
              unit="%"
              @update:model-value="patchText({ y: $event }, `y-${selectedText.id}`)"
            />
          </div>
          <div class="two-col">
            <RangeField
              :model-value="selectedText.rotation"
              label="旋转"
              :min="-180"
              :max="180"
              unit="°"
              @update:model-value="patchText({ rotation: $event }, `rotate-${selectedText.id}`)"
            />
            <RangeField
              :model-value="selectedText.opacity * 100"
              label="透明度"
              :min="0"
              :max="100"
              unit="%"
              @update:model-value="patchText({ opacity: $event / 100 }, `opacity-${selectedText.id}`)"
            />
          </div>
        </div>

        <div v-if="selectedImage" class="layer-editor">
          <div class="editor-head">
            <span>Logo 属性</span>
            <div class="editor-actions">
              <button aria-label="复制图层" @click="store.duplicateLayer(selectedImage.id)">
                <Copy :size="12" />
              </button>
              <button aria-label="图层上移" @click="store.moveLayer(selectedImage.id, 1)">
                <ArrowUp :size="12" />
              </button>
              <button aria-label="图层下移" @click="store.moveLayer(selectedImage.id, -1)">
                <ArrowDown :size="12" />
              </button>
            </div>
          </div>
          <div class="logo-preview">
            <img :src="selectedImage.src" alt="Logo 图层预览" />
          </div>
          <RangeField
            :model-value="selectedImage.widthPct"
            label="宽度"
            :min="5"
            :max="120"
            unit="% 面宽"
            @update:model-value="patchImageLayer({ widthPct: $event }, `logo-w-${selectedImage.id}`)"
          />
          <div class="position-grid">
            <RangeField
              :model-value="selectedImage.x"
              label="X 位置"
              :min="0"
              :max="100"
              unit="%"
              @update:model-value="patchImageLayer({ x: $event }, `logo-x-${selectedImage.id}`)"
            />
            <RangeField
              :model-value="selectedImage.y"
              label="Y 位置"
              :min="0"
              :max="100"
              unit="%"
              @update:model-value="patchImageLayer({ y: $event }, `logo-y-${selectedImage.id}`)"
            />
          </div>
          <div class="two-col">
            <RangeField
              :model-value="selectedImage.rotation"
              label="旋转"
              :min="-180"
              :max="180"
              unit="°"
              @update:model-value="patchImageLayer({ rotation: $event }, `logo-rotate-${selectedImage.id}`)"
            />
            <RangeField
              :model-value="selectedImage.opacity * 100"
              label="透明度"
              :min="0"
              :max="100"
              unit="%"
              @update:model-value="patchImageLayer({ opacity: $event / 100 }, `logo-opacity-${selectedImage.id}`)"
            />
          </div>
        </div>
        <input
          ref="logoInput"
          class="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          @change="onLogoInput"
        />
      </SectionCard>

      <SectionCard index="04" title="视觉模板" hint="一键替换当前作用域的整套印刷设计">
        <div class="template-grid">
          <button
            v-for="preset in ARTWORK_PRESETS"
            :key="preset.id"
            class="template-card"
            @click="applyPreset(preset.id)"
          >
            <span class="template-preview" :style="{ background: preset.swatch }">
              <span :style="{ color: preset.accent }">{{ preset.id === 'orange-display' ? 'FOLD' : 'Pf' }}</span>
              <small :style="{ color: preset.accent }">{{ preset.en }}</small>
            </span>
            <span class="template-copy">
              <strong>{{ preset.label }}</strong>
              <small>{{ preset.en }}</small>
            </span>
          </button>
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.design-panel {
  padding: 2px 18px 28px;
}

.scope-block {
  padding: 13px 0 15px;
  border-bottom: 1px solid rgba(217, 210, 195, 0.72);
}

.scope-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.scope-hint {
  color: var(--muted-2);
  font-size: 8px;
}

.face-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 9px;
}

.face-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 620;
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background 140ms ease;
}

.face-chip:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.face-chip.is-active {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--white);
}

.face-chip-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}

.face-chip.is-active .face-chip-dot {
  background: var(--accent);
  opacity: 1;
}

.override-banner {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(255, 77, 31, 0.2);
  border-radius: 8px;
  background: linear-gradient(110deg, rgba(255, 77, 31, 0.08), rgba(255, 255, 255, 0.3));
}

.override-banner strong {
  font-size: 9px;
  font-weight: 700;
}

.override-banner p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 8px;
  line-height: 1.45;
}

.face-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 9px;
  color: var(--success);
  font-size: 8px;
  font-weight: 640;
}

.face-actions > div {
  display: flex;
  gap: 9px;
}

.text-action {
  padding: 0;
  color: var(--accent);
  font-size: 8px;
  font-weight: 670;
}

.text-action.muted {
  color: var(--muted);
}

.design-fields {
  transition: opacity 160ms ease;
}

.design-fields.is-locked {
  opacity: 0.48;
  pointer-events: none;
}

.color-row {
  display: grid;
  gap: 9px;
}

.swatch-row {
  display: flex;
  gap: 5px;
}

.mini-swatch {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(18, 18, 16, 0.12);
  border-radius: 4px;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.mini-swatch:hover {
  transform: translateY(-1px);
}

.mini-swatch.is-active {
  box-shadow:
    0 0 0 2px var(--panel),
    0 0 0 3px var(--accent);
}

.control-block {
  margin-top: 13px;
}

.inline-label {
  display: block;
  margin-bottom: 7px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 640;
}

.texture-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.texture-pill {
  padding: 5px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 620;
}

.texture-pill.is-active {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--white);
}

.pattern-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}

.pattern-tile {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: 5px;
  color: var(--muted-2);
  font-size: 6px;
}

.pattern-tile:hover {
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.4);
}

.pattern-tile.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.pattern-swatch {
  display: grid;
  width: 100%;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgba(18, 18, 16, 0.1);
  border-radius: 3px;
  background-color: #f5f0e5;
  color: var(--muted-2);
  font-size: 9px;
}

.pattern-tile.is-none .pattern-swatch {
  background:
    linear-gradient(45deg, transparent 47%, #d9d2c3 48%, #d9d2c3 52%, transparent 53%),
    #f5f0e5;
}

.pattern-color {
  display: grid;
  gap: 5px;
  margin-top: 9px;
}

.pattern-color > span {
  color: var(--muted);
  font-size: 8px;
}

.upload-zone {
  display: flex;
  min-height: 100px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px;
  border: 1px dashed var(--line-strong);
  border-radius: 9px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.36), rgba(235, 229, 216, 0.2));
  color: var(--muted);
  text-align: center;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease;
}

.upload-zone:hover,
.upload-zone.is-dragging {
  border-color: var(--accent);
  background: rgba(255, 77, 31, 0.05);
  color: var(--accent-deep);
}

.upload-zone strong {
  margin-top: 3px;
  font-size: 9px;
  font-weight: 700;
}

.upload-zone small {
  color: var(--muted-2);
  font-size: 7px;
}

.image-card {
  display: grid;
  gap: 9px;
}

.image-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  aspect-ratio: 2.7 / 1;
  background: var(--paper-deep);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: rgba(18, 18, 16, 0.78);
  color: var(--white);
}

.image-settings {
  display: grid;
  gap: 9px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.layer-add {
  display: flex;
  gap: 3px;
}

.mini-add {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted);
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background 140ms ease;
}

.mini-add:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.layer-list {
  display: grid;
  gap: 3px;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  transition:
    background 140ms ease,
    border-color 140ms ease;
}

.layer-row:hover {
  background: rgba(255, 255, 255, 0.42);
}

.layer-row.is-active {
  border-color: var(--line);
  background: var(--panel-raised);
  color: var(--ink);
}

.layer-row.is-hidden {
  opacity: 0.45;
}

.layer-icon {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 4px;
  background: var(--paper-deep);
  color: var(--ink-soft);
}

.layer-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 9px;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-tool {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 4px;
  color: var(--muted-2);
}

.layer-tool:hover {
  background: var(--paper-deep);
  color: var(--ink);
}

.empty-layers {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 12px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  color: var(--muted-2);
  text-align: center;
}

.empty-layers p {
  margin: 6px 0 2px;
  color: var(--ink);
  font-size: 9px;
  font-weight: 650;
}

.empty-layers span {
  font-size: 8px;
}

.layer-editor {
  display: grid;
  gap: 10px;
  margin-top: 10px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.28);
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ink);
  font-size: 9px;
  font-weight: 700;
}

.editor-actions {
  display: flex;
  gap: 2px;
}

.editor-actions button {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 4px;
  color: var(--muted);
}

.editor-actions button:hover {
  background: var(--paper-deep);
  color: var(--ink);
}

.mini-field {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 640;
}

.align-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.align-field > span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 640;
}

.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.logo-preview {
  display: grid;
  height: 66px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background:
    linear-gradient(45deg, rgba(217, 210, 195, 0.3) 25%, transparent 25%, transparent 75%, rgba(217, 210, 195, 0.3) 75%) 0 0 / 12px 12px,
    linear-gradient(45deg, rgba(217, 210, 195, 0.3) 25%, transparent 25%, transparent 75%, rgba(217, 210, 195, 0.3) 75%) 6px 6px / 12px 12px,
    #faf7ef;
}

.logo-preview img {
  max-width: 82%;
  max-height: 48px;
  object-fit: contain;
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.template-card {
  display: grid;
  gap: 5px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: left;
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.template-card:hover {
  border-color: var(--ink);
  transform: translateY(-1px);
}

.template-preview {
  display: flex;
  height: 52px;
  flex-direction: column;
  justify-content: space-between;
  padding: 7px;
  border-radius: 5px;
}

.template-preview > span {
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1;
}

.template-preview small {
  font-family: var(--font-mono);
  font-size: 5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.template-copy {
  display: flex;
  flex-direction: column;
  padding: 0 2px 2px;
}

.template-copy strong {
  font-size: 8px;
  font-weight: 680;
}

.template-copy small {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 6px;
}
</style>
