import type { BoxType, FaceId, FinishId, MaterialId, PaperTextureId } from './types'

export interface MaterialPreset {
  id: MaterialId
  label: string
  en: string
  baseColor: string
  roughness: number
  metalness: number
  texture: PaperTextureId
  thickness: number
}

export const MATERIALS: MaterialPreset[] = [
  {
    id: 'white-card',
    label: '白卡 350g',
    en: 'White card',
    baseColor: '#f2eee4',
    roughness: 0.86,
    metalness: 0,
    texture: 'none',
    thickness: 0.5,
  },
  {
    id: 'kraft',
    label: '牛皮卡 300g',
    en: 'Kraft',
    baseColor: '#c99d68',
    roughness: 0.92,
    metalness: 0,
    texture: 'fiber',
    thickness: 0.6,
  },
  {
    id: 'corrugated',
    label: '瓦楞 E 楞',
    en: 'Corrugated',
    baseColor: '#c7a878',
    roughness: 0.96,
    metalness: 0,
    texture: 'flute',
    thickness: 1.5,
  },
  {
    id: 'black-card',
    label: '黑卡 350g',
    en: 'Black card',
    baseColor: '#1f1e1b',
    roughness: 0.88,
    metalness: 0,
    texture: 'none',
    thickness: 0.5,
  },
  {
    id: 'recycled',
    label: '再生纸 300g',
    en: 'Recycled',
    baseColor: '#d8d3c5',
    roughness: 0.94,
    metalness: 0,
    texture: 'linen',
    thickness: 0.55,
  },
]

export const FINISHES: { id: FinishId; label: string; roughness: number }[] = [
  { id: 'matte', label: '哑光', roughness: 1 },
  { id: 'gloss', label: '亮光', roughness: 0.42 },
  { id: 'soft-touch', label: '触感膜', roughness: 0.78 },
]

export const BOX_LABELS: Record<BoxType, { zh: string; en: string; note: string }> = {
  tuck: {
    zh: '插口折叠盒',
    en: 'Tuck-end carton',
    note: '经典四侧板与上下插舌，闭合展示',
  },
  mailer: {
    zh: '飞机盒',
    en: 'Mailer box',
    note: '后铰链盒盖，可开合查看内侧',
  },
  lidbase: {
    zh: '天地盖',
    en: 'Lid & base',
    note: '盒身与盒盖分体，可升起预览',
  },
}

export const FACE_LABELS: Record<FaceId, { zh: string; en: string }> = {
  front: { zh: '正面', en: 'Front' },
  back: { zh: '背面', en: 'Back' },
  left: { zh: '左侧面', en: 'Left' },
  right: { zh: '右侧面', en: 'Right' },
  top: { zh: '顶面', en: 'Top' },
  bottom: { zh: '底面', en: 'Bottom' },
  lidTop: { zh: '盒盖顶面', en: 'Lid top' },
  lidFront: { zh: '盒盖正面', en: 'Lid front' },
  lidLeft: { zh: '盒盖左侧', en: 'Lid left' },
  lidRight: { zh: '盒盖右侧', en: 'Lid right' },
  lidBack: { zh: '盒盖背面', en: 'Lid back' },
}

export const BASE_FACE_IDS: FaceId[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

export const BOX_FACE_IDS: Record<BoxType, FaceId[]> = {
  tuck: ['front', 'back', 'left', 'right', 'top', 'bottom'],
  mailer: ['front', 'back', 'left', 'right', 'bottom', 'top', 'lidFront', 'lidLeft', 'lidRight'],
  lidbase: ['front', 'back', 'left', 'right', 'bottom', 'lidTop', 'lidFront', 'lidLeft', 'lidRight', 'lidBack'],
}

export function getMaterial(id: MaterialId): MaterialPreset {
  return MATERIALS.find(m => m.id === id) ?? MATERIALS[1]!
}

export function getFinish(id: FinishId) {
  return FINISHES.find(f => f.id === id) ?? FINISHES[0]!
}

export function getFaceLabel(id: FaceId) {
  return FACE_LABELS[id]
}
