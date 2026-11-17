import type { Artwork } from './types'
import { createEmptyArtwork, createTextLayer, deepClone } from './project'

export interface ArtworkPreset {
  id: string
  label: string
  en: string
  swatch: string
  accent: string
  build: () => Artwork
}

function text(overrides: Parameters<typeof createTextLayer>[0]) {
  return createTextLayer(overrides)
}

export const ARTWORK_PRESETS: ArtworkPreset[] = [
  {
    id: 'craft-minimal',
    label: '牛皮极简',
    en: 'Craft minimal',
    swatch: '#d8b98a',
    accent: '#1b1711',
    build: () =>
      createEmptyArtwork({
        color: '#d8b98a',
        paperTexture: 'fiber',
        pattern: 'none',
        layers: [
          text({
            text: 'PAPERFORM',
            name: '品牌字标',
            x: 50,
            y: 36,
            fontSize: 10.5,
            fontFamily: 'newsreader',
            weight: 520,
            letterSpacing: 0.45,
            color: '#1b1711',
          }),
          text({
            text: 'OBJECTS FOR EVERYDAY',
            name: '辅助信息',
            x: 50,
            y: 47,
            fontSize: 3.1,
            fontFamily: 'manrope',
            weight: 650,
            letterSpacing: 0.68,
            color: '#2f271d',
          }),
          text({
            text: 'P/F',
            name: '装饰字标',
            x: 84,
            y: 82,
            fontSize: 20,
            fontFamily: 'newsreader',
            weight: 500,
            opacity: 0.16,
            color: '#1b1711',
          }),
        ],
      }),
  },
  {
    id: 'cobalt-editorial',
    label: '钴蓝编辑',
    en: 'Cobalt editorial',
    swatch: '#2447ff',
    accent: '#ffe8da',
    build: () =>
      createEmptyArtwork({
        color: '#2447ff',
        paperTexture: 'none',
        pattern: 'grid',
        patternColor: '#9eb0ff',
        layers: [
          text({
            text: 'FORM\nFOLLOWS\nFEELING',
            name: '编辑标题',
            x: 30,
            y: 40,
            fontSize: 13,
            fontFamily: 'newsreader',
            weight: 430,
            letterSpacing: 0.1,
            lineHeight: 0.88,
            color: '#fff7ed',
            align: 'left',
          }),
          text({
            text: 'VOL. 01 / OBJECT STUDIES',
            name: '期号',
            x: 30,
            y: 72,
            fontSize: 3,
            fontFamily: 'manrope',
            weight: 700,
            letterSpacing: 0.55,
            color: '#d8e2ff',
            align: 'left',
          }),
          text({
            text: '●',
            name: '圆点',
            x: 82,
            y: 22,
            fontSize: 16,
            color: '#ff4d1f',
          }),
        ],
      }),
  },
  {
    id: 'orange-display',
    label: '朱橙大字',
    en: 'Orange display',
    swatch: '#ff4d1f',
    accent: '#181512',
    build: () =>
      createEmptyArtwork({
        color: '#ff4d1f',
        paperTexture: 'noise',
        pattern: 'none',
        layers: [
          text({
            text: 'FOLD',
            name: '主标题',
            x: 50,
            y: 36,
            fontSize: 24,
            fontFamily: 'newsreader',
            weight: 560,
            letterSpacing: -0.4,
            color: '#19130f',
          }),
          text({
            text: 'BUILD / PRESS / REPEAT',
            name: '副标题',
            x: 50,
            y: 52,
            fontSize: 3.4,
            fontFamily: 'manrope',
            weight: 720,
            letterSpacing: 0.8,
            color: '#3b1a0d',
          }),
          text({
            text: '™',
            name: '角标',
            x: 87,
            y: 15,
            fontSize: 5,
            fontFamily: 'manrope',
            weight: 500,
            color: '#3b1a0d',
          }),
        ],
      }),
  },
  {
    id: 'mono-grid',
    label: '黑白网格',
    en: 'Mono grid',
    swatch: '#e8e2d5',
    accent: '#1a1916',
    build: () =>
      createEmptyArtwork({
        color: '#e8e2d5',
        paperTexture: 'linen',
        pattern: 'grid',
        patternColor: '#1a1916',
        layers: [
          text({
            text: 'STRUCTURE',
            name: '主标题',
            x: 50,
            y: 40,
            fontSize: 8,
            fontFamily: 'manrope',
            weight: 780,
            letterSpacing: 0.7,
            color: '#1a1916',
          }),
          text({
            text: 'A STUDY IN PAPER / 01',
            name: '辅助信息',
            x: 50,
            y: 50,
            fontSize: 2.8,
            fontFamily: 'mono',
            weight: 500,
            letterSpacing: 0.35,
            color: '#4d4a42',
          }),
          text({
            text: '□',
            name: '几何符号',
            x: 50,
            y: 68,
            fontSize: 12,
            color: '#ff4d1f',
          }),
        ],
      }),
  },
]

export function buildPreset(preset: ArtworkPreset): Artwork {
  const artwork = preset.build()
  return {
    ...deepClone(artwork),
    layers: artwork.layers.map(layer => ({ ...deepClone(layer), id: `${layer.id}-${Math.random().toString(36).slice(2, 6)}` })),
  }
}
