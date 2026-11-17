import type {
  Artwork,
  BackgroundImage,
  BoxType,
  DesignLayer,
  FaceDesign,
  FaceId,
  Project,
} from './types'
import { MATERIALS } from './materials'

const BOX_TYPES: BoxType[] = ['tuck', 'mailer', 'lidbase']
const FACE_IDS = new Set<FaceId>([
  'front',
  'back',
  'left',
  'right',
  'top',
  'bottom',
  'lidTop',
  'lidFront',
  'lidLeft',
  'lidRight',
  'lidBack',
])
const MATERIAL_IDS = new Set(MATERIALS.map(m => m.id))

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`字段 ${field} 必须是有效数字`)
  }
  return clamp(value, min, max)
}

function requireString(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string') throw new Error(`字段 ${field} 必须是文本`)
  if (value.length > max) throw new Error(`字段 ${field} 超过长度限制`)
  return value
}

function requireDataImage(src: unknown, field: string): string {
  const value = requireString(src, field, 12_000_000)
  if (!/^data:image\/(png|jpe?g|webp|svg\+xml);/i.test(value)) {
    throw new Error(`字段 ${field} 必须内嵌图片`)
  }
  return value
}

function validateBackground(input: unknown, field: string): BackgroundImage | null {
  if (input === null || input === undefined) return null
  if (!isRecord(input)) throw new Error(`字段 ${field} 格式错误`)
  return {
    src: requireDataImage(input.src, `${field}.src`),
    fit: input.fit === 'contain' ? 'contain' : 'cover',
    scale: requireNumber(input.scale ?? 1, `${field}.scale`, 0.2, 4),
    offsetX: requireNumber(input.offsetX ?? 0, `${field}.offsetX`, -1, 1),
    offsetY: requireNumber(input.offsetY ?? 0, `${field}.offsetY`, -1, 1),
    rotation: requireNumber(input.rotation ?? 0, `${field}.rotation`, -360, 360),
    opacity: requireNumber(input.opacity ?? 1, `${field}.opacity`, 0, 1),
  }
}

function validateLayer(input: unknown, index: number): DesignLayer {
  if (!isRecord(input)) throw new Error(`图层 ${index} 格式错误`)
  const id = requireString(input.id, `layers[${index}].id`, 120)
  const common = {
    id,
    name: requireString(input.name ?? '图层', `layers[${index}].name`, 80),
    visible: input.visible !== false,
    x: requireNumber(input.x ?? 50, `layers[${index}].x`, 0, 100),
    y: requireNumber(input.y ?? 50, `layers[${index}].y`, 0, 100),
    rotation: requireNumber(input.rotation ?? 0, `layers[${index}].rotation`, -360, 360),
    opacity: requireNumber(input.opacity ?? 1, `layers[${index}].opacity`, 0, 1),
  }
  if (input.type === 'image') {
    return {
      ...common,
      type: 'image',
      src: requireDataImage(input.src, `layers[${index}].src`),
      widthPct: requireNumber(input.widthPct ?? 40, `layers[${index}].widthPct`, 1, 200),
    }
  }
  if (input.type !== 'text') throw new Error(`图层 ${index} 类型未知`)
  return {
    ...common,
    type: 'text',
    text: requireString(input.text, `layers[${index}].text`, 600),
    fontSize: requireNumber(input.fontSize ?? 8, `layers[${index}].fontSize`, 1, 120),
    fontFamily:
      input.fontFamily === 'newsreader' || input.fontFamily === 'mono'
        ? input.fontFamily
        : 'manrope',
    weight: requireNumber(input.weight ?? 500, `layers[${index}].weight`, 100, 900),
    color: requireString(input.color, `layers[${index}].color`, 20),
    letterSpacing: requireNumber(input.letterSpacing ?? 0, `layers[${index}].letterSpacing`, -5, 20),
    lineHeight: requireNumber(input.lineHeight ?? 1.1, `layers[${index}].lineHeight`, 0.6, 3),
    align: input.align === 'left' || input.align === 'right' ? input.align : 'center',
  }
}

function validateArtwork(input: unknown, field: string): Artwork {
  if (!isRecord(input)) throw new Error(`字段 ${field} 格式错误`)
  const layers = Array.isArray(input.layers) ? input.layers.map(validateLayer) : []
  return {
    color: requireString(input.color, `${field}.color`, 20),
    paperTexture:
      input.paperTexture === 'linen' ||
      input.paperTexture === 'flute' ||
      input.paperTexture === 'noise' ||
      input.paperTexture === 'none'
        ? input.paperTexture
        : 'fiber',
    pattern:
      input.pattern === 'grid' ||
      input.pattern === 'dots' ||
      input.pattern === 'stripes' ||
      input.pattern === 'diagonal' ||
      input.pattern === 'checker' ||
      input.pattern === 'waves' ||
      input.pattern === 'cross'
        ? input.pattern
        : 'none',
    patternColor: requireString(input.patternColor, `${field}.patternColor`, 20),
    image: validateBackground(input.image, `${field}.image`),
    layers,
  }
}

export function validateProject(input: unknown): Project {
  if (!isRecord(input)) throw new Error('工程文件格式错误')
  if (input.schemaVersion !== 1) throw new Error('不支持的 schemaVersion，请使用 1')
  const boxType = input.boxType as BoxType
  if (!BOX_TYPES.includes(boxType)) throw new Error('未知的盒型')
  const dims = input.dimensions
  if (!isRecord(dims)) throw new Error('字段 dimensions 格式错误')
  const material = input.material as Project['material']
  if (!MATERIAL_IDS.has(material)) throw new Error('未知材料')

  const faces: Partial<Record<FaceId, FaceDesign>> = {}
  if (input.faces !== undefined) {
    if (!isRecord(input.faces)) throw new Error('字段 faces 格式错误')
    for (const [key, value] of Object.entries(input.faces)) {
      if (!FACE_IDS.has(key as FaceId)) continue
      if (!isRecord(value)) throw new Error(`面 ${key} 数据格式错误`)
      faces[key as FaceId] = {
        useGlobal: value.useGlobal !== false,
        artwork: validateArtwork(value.artwork, `faces.${key}.artwork`),
      }
    }
  }

  return {
    schemaVersion: 1,
    id: requireString(input.id ?? 'imported', 'id', 120),
    name: requireString(input.name ?? '导入的纸盒', 'name', 120),
    boxType,
    dimensions: {
      length: requireNumber(dims.length, 'dimensions.length', 30, 600),
      width: requireNumber(dims.width, 'dimensions.width', 30, 600),
      height: requireNumber(dims.height, 'dimensions.height', 30, 600),
    },
    lidHeight: requireNumber(input.lidHeight ?? 35, 'lidHeight', 20, 150),
    lidGap: requireNumber(input.lidGap ?? 2, 'lidGap', 1, 5),
    material,
    finish:
      input.finish === 'gloss' || input.finish === 'soft-touch' ? input.finish : 'matte',
    thickness: requireNumber(input.thickness ?? 0.6, 'thickness', 0.3, 3),
    bleed: requireNumber(input.bleed ?? 3, 'bleed', 0, 5),
    safeArea: requireNumber(input.safeArea ?? 3, 'safeArea', 0, 5),
    globalDesign: validateArtwork(input.globalDesign, 'globalDesign'),
    faces,
    createdAt: requireString(input.createdAt ?? new Date().toISOString(), 'createdAt', 50),
    updatedAt: requireString(input.updatedAt ?? new Date().toISOString(), 'updatedAt', 50),
  }
}
