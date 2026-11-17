<script setup lang="ts">
import { computed } from 'vue'
import { Check, Layers } from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'
import { BOX_LABELS, FINISHES, MATERIALS } from '@/core/materials'
import type { BoxType, FinishId, MaterialId } from '@/core/types'
import SectionCard from '@/components/ui/SectionCard.vue'
import RangeField from '@/components/ui/RangeField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import BoxTypeIcon from './BoxTypeIcon.vue'

const store = useDesignerStore()
const boxTypes: BoxType[] = ['tuck', 'mailer', 'lidbase']

const sizePresets = [
  { label: 'XS', dims: [120, 70, 40] },
  { label: 'S', dims: [150, 80, 50] },
  { label: 'M', dims: [180, 90, 60] },
  { label: 'L', dims: [240, 120, 80] },
] as const

const activeSizePreset = computed(() => {
  const { length, width, height } = store.project.dimensions
  return sizePresets.find(
    preset => preset.dims[0] === length && preset.dims[1] === width && preset.dims[2] === height,
  )?.label
})

const finishOptions = FINISHES.map(item => ({ value: item.id, label: item.label }))

function setPreset(dims: readonly [number, number, number]) {
  store.setDimensions({ length: dims[0], width: dims[1], height: dims[2] })
}
</script>

<template>
  <div class="structure-panel">
    <SectionCard index="01" title="盒型结构" hint="选择纸盒的折叠方式与展示形态">
      <div class="box-grid">
        <button
          v-for="type in boxTypes"
          :key="type"
          class="box-card"
          :class="{ 'is-active': store.project.boxType === type }"
          :aria-pressed="store.project.boxType === type"
          @click="store.setBoxType(type)"
        >
          <span class="box-thumb">
            <BoxTypeIcon :type="type" :active="store.project.boxType === type" />
          </span>
          <span class="box-card-copy">
            <strong>{{ BOX_LABELS[type].zh }}</strong>
            <small>{{ BOX_LABELS[type].en }}</small>
          </span>
          <span v-if="store.project.boxType === type" class="box-check"><Check :size="10" /></span>
        </button>
      </div>
      <p class="box-note">{{ BOX_LABELS[store.project.boxType].note }}</p>
    </SectionCard>

    <SectionCard index="02" title="毫米尺寸" hint="尺寸变化实时驱动刀模、3D 与印刷导出">
      <div class="dimension-readout">
        <span>L</span><strong>{{ store.project.dimensions.length }}</strong>
        <i>×</i>
        <span>W</span><strong>{{ store.project.dimensions.width }}</strong>
        <i>×</i>
        <span>H</span><strong>{{ store.project.dimensions.height }}</strong>
        <small>mm</small>
      </div>
      <div class="range-stack">
        <RangeField
          :model-value="store.project.dimensions.length"
          label="长度 L"
          :min="30"
          :max="600"
          unit="mm"
          @update:model-value="store.setDimensions({ length: $event }, 'dim-length')"
        />
        <RangeField
          :model-value="store.project.dimensions.width"
          label="宽度 W"
          :min="30"
          :max="600"
          unit="mm"
          @update:model-value="store.setDimensions({ width: $event }, 'dim-width')"
        />
        <RangeField
          :model-value="store.project.dimensions.height"
          label="高度 H"
          :min="30"
          :max="600"
          unit="mm"
          @update:model-value="store.setDimensions({ height: $event }, 'dim-height')"
        />
      </div>
      <div class="preset-row">
        <span>SIZE PRESET</span>
        <button
          v-for="preset in sizePresets"
          :key="preset.label"
          class="preset-pill"
          :class="{ 'is-active': activeSizePreset === preset.label }"
          @click="setPreset(preset.dims)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div v-if="store.project.boxType === 'lidbase'" class="sub-settings">
        <RangeField
          :model-value="store.project.lidHeight"
          label="盒盖高度"
          :min="20"
          :max="150"
          unit="mm"
          @update:model-value="store.setLidHeight($event, 'lid-height')"
        />
        <RangeField
          :model-value="store.project.lidGap"
          label="天地盖间隙"
          :min="1"
          :max="5"
          :decimals="0"
          unit="mm"
          @update:model-value="store.setLidGap($event, 'lid-gap')"
        />
      </div>
    </SectionCard>

    <SectionCard index="03" title="纸张与表面" hint="材料会影响贴图底色、纸纹与 3D 反射">
      <div class="material-grid">
        <button
          v-for="material in MATERIALS"
          :key="material.id"
          class="material-card"
          :class="{ 'is-active': store.project.material === material.id }"
          :aria-pressed="store.project.material === material.id"
          @click="store.setMaterial(material.id as MaterialId)"
        >
          <span class="material-swatch" :style="{ background: material.baseColor }">
            <span class="material-grain" :class="`grain-${material.texture}`" />
          </span>
          <span class="material-copy">
            <strong>{{ material.label }}</strong>
            <small>{{ material.en }}</small>
          </span>
        </button>
      </div>

      <div class="material-meta">
        <RangeField
          :model-value="store.project.thickness"
          label="纸张厚度"
          :min="0.3"
          :max="3"
          :step="0.1"
          :decimals="1"
          unit="mm"
          @update:model-value="store.setThickness($event, 'thickness')"
        />
        <div class="finish-block">
          <span class="inline-label">表面工艺</span>
          <SegmentedControl
            :model-value="store.project.finish"
            :options="finishOptions"
            compact
            @update:model-value="store.setFinish($event as FinishId)"
          />
        </div>
      </div>

      <div class="material-footnote">
        <Layers :size="12" />
        当前：{{ store.project.thickness.toFixed(1) }}mm / {{ FINISHES.find(f => f.id === store.project.finish)?.label }}
      </div>
    </SectionCard>
  </div>
</template>

<style scoped>
.structure-panel {
  padding: 2px 18px 28px;
}

.box-grid {
  display: grid;
  gap: 7px;
}

.box-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.32);
  text-align: left;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.box-card:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.6);
}

.box-card:active {
  transform: scale(0.995);
}

.box-card.is-active {
  border-color: var(--accent);
  background: linear-gradient(110deg, rgba(255, 77, 31, 0.07), rgba(255, 255, 255, 0.52));
  box-shadow: inset 0 0 0 1px rgba(255, 77, 31, 0.1);
}

.box-thumb {
  width: 64px;
  height: 48px;
  flex: 0 0 64px;
  padding: 3px;
  border-radius: 6px;
  background: rgba(235, 229, 216, 0.5);
}

.box-card-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.box-card-copy strong {
  font-size: 12.5px;
  font-weight: 700;
}

.box-card-copy small {
  margin-top: 2px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.box-check {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  border-radius: 50%;
  background: var(--accent);
  color: var(--white);
}

.box-note {
  margin: 9px 0 0;
  padding-left: 2px;
  color: var(--muted-2);
  font-size: 10px;
}

.dimension-readout {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 0 0 13px;
  padding: 10px 12px;
  border: 1px solid rgba(217, 210, 195, 0.8);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.5), transparent),
    rgba(235, 229, 216, 0.28);
}

.dimension-readout span {
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
}

.dimension-readout strong {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 450;
  letter-spacing: -0.03em;
}

.dimension-readout i {
  margin: 0 2px;
  color: var(--line-strong);
  font-family: var(--font-display);
  font-size: 13.5px;
  font-style: normal;
}

.dimension-readout small {
  margin-left: auto;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
}

.range-stack {
  display: grid;
  gap: 10px;
}

.preset-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 13px;
}

.preset-row > span {
  margin-right: auto;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
}

.preset-pill {
  width: 27px;
  height: 23px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  transition:
    border-color 140ms ease,
    color 140ms ease,
    background 140ms ease;
}

.preset-pill:hover,
.preset-pill.is-active {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--white);
}

.sub-settings {
  display: grid;
  gap: 11px;
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px dashed var(--line);
}

.material-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.material-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.26);
  text-align: left;
  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.material-card:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.55);
}

.material-card.is-active {
  border-color: var(--ink);
  background: var(--panel-raised);
  box-shadow: 0 3px 12px rgba(50, 38, 20, 0.06);
}

.material-swatch {
  position: relative;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  overflow: hidden;
  border: 1px solid rgba(18, 18, 16, 0.1);
  border-radius: 5px;
}

.material-grain {
  position: absolute;
  inset: 0;
  opacity: 0.24;
}

.grain-fiber {
  background:
    repeating-linear-gradient(17deg, rgba(82, 47, 18, 0.4) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(78deg, rgba(255, 255, 255, 0.25) 0 1px, transparent 1px 6px);
}

.grain-linen {
  background:
    repeating-linear-gradient(0deg, rgba(35, 30, 20, 0.32) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(35, 30, 20, 0.2) 0 1px, transparent 1px 3px);
}

.grain-flute {
  background: repeating-linear-gradient(90deg, rgba(72, 42, 12, 0.4) 0 1px, transparent 1px 4px);
}

.grain-noise {
  background-image: radial-gradient(rgba(28, 24, 18, 0.5) 0.5px, transparent 0.5px);
  background-size: 3px 3px;
}

.material-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.material-copy strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 680;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-copy small {
  margin-top: 1px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
}

.material-meta {
  display: grid;
  gap: 12px;
  margin-top: 13px;
}

.finish-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inline-label {
  color: var(--muted);
  font-size: 11px;
  font-weight: 640;
}

.material-footnote {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 13px;
  color: var(--muted-2);
  font-family: var(--font-mono);
  font-size: 10px;
}
</style>
