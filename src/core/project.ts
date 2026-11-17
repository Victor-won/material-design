import type {
  Artwork,
  BoxType,
  DesignLayer,
  EditorScope,
  FaceId,
  Project,
  TextLayer,
} from './types'

export function uid(prefix = 'id'): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
  return `${prefix}-${raw}`
}

export function deepClone<T>(value: T): T {
  return structuredClone(value)
}

export function createEmptyArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    color: '#d8b98a',
    paperTexture: 'fiber',
    pattern: 'none',
    patternColor: '#6f4b2b',
    image: null,
    layers: [],
    ...overrides,
  }
}

export function createTextLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: uid('text'),
    type: 'text',
    name: '文字图层',
    visible: true,
    x: 50,
    y: 50,
    rotation: 0,
    opacity: 1,
    text: 'YOUR BRAND',
    fontSize: 10,
    fontFamily: 'newsreader',
    weight: 500,
    color: '#181512',
    letterSpacing: 0.15,
    lineHeight: 1.05,
    align: 'center',
    ...overrides,
  }
}

function defaultLayers(): DesignLayer[] {
  return [
    createTextLayer({
      id: uid('text'),
      name: '品牌字标',
      text: 'PAPERFORM',
      x: 50,
      y: 37,
      fontSize: 10.5,
      weight: 520,
      letterSpacing: 0.45,
      color: '#1b1711',
    }),
    createTextLayer({
      id: uid('text'),
      name: '辅助信息',
      text: 'OBJECTS FOR EVERYDAY',
      x: 50,
      y: 48,
      fontSize: 3.1,
      fontFamily: 'manrope',
      weight: 650,
      letterSpacing: 0.68,
      color: '#2f271d',
    }),
    createTextLayer({
      id: uid('text'),
      name: '装饰字标',
      text: 'P/F',
      x: 84,
      y: 82,
      fontSize: 20,
      fontFamily: 'newsreader',
      weight: 500,
      letterSpacing: 0.1,
      opacity: 0.16,
      color: '#1b1711',
    }),
  ]
}

export function createDefaultArtwork(): Artwork {
  return {
    color: '#d8b98a',
    paperTexture: 'fiber',
    pattern: 'none',
    patternColor: '#6f4b2b',
    image: null,
    layers: defaultLayers(),
  }
}

export function createDefaultProject(): Project {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    id: uid('project'),
    name: '未命名纸盒 01',
    boxType: 'tuck',
    dimensions: { length: 180, width: 90, height: 60 },
    lidHeight: 35,
    lidGap: 2,
    material: 'kraft',
    finish: 'matte',
    thickness: 0.6,
    bleed: 3,
    safeArea: 3,
    globalDesign: createDefaultArtwork(),
    faces: {},
    createdAt: now,
    updatedAt: now,
  }
}

export function resolveArtwork(project: Project, faceId: FaceId): Artwork {
  const record = project.faces[faceId]
  if (!record || record.useGlobal) return project.globalDesign
  return record.artwork
}

export function isFaceOverridden(project: Project, faceId: FaceId): boolean {
  const record = project.faces[faceId]
  return Boolean(record && !record.useGlobal)
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

export function withArtworkFor(
  project: Project,
  scope: EditorScope,
  updater: (artwork: Artwork) => Artwork,
): Project {
  const next = deepClone(project)
  if (scope === 'global') {
    next.globalDesign = updater(next.globalDesign)
  } else {
    const existing = next.faces[scope]
    const base = existing && !existing.useGlobal ? existing.artwork : resolveArtwork(next, scope)
    next.faces[scope] = {
      useGlobal: false,
      artwork: updater(deepClone(base)),
    }
  }
  return touch(next)
}

export function enableFaceOverride(project: Project, faceId: FaceId): Project {
  const next = deepClone(project)
  if (!isFaceOverridden(next, faceId)) {
    next.faces[faceId] = {
      useGlobal: false,
      artwork: deepClone(resolveArtwork(next, faceId)),
    }
  }
  return touch(next)
}

export function setFaceFollowGlobal(project: Project, faceId: FaceId, follow: boolean): Project {
  const next = deepClone(project)
  if (follow) {
    const current = next.faces[faceId]
    if (current) current.useGlobal = true
  } else {
    return enableFaceOverride(next, faceId)
  }
  return touch(next)
}

export function syncFaceToGlobal(project: Project, faceId: FaceId): Project {
  const next = deepClone(project)
  next.globalDesign = deepClone(resolveArtwork(next, faceId))
  for (const key of Object.keys(next.faces) as FaceId[]) {
    const record = next.faces[key]
    if (record) record.useGlobal = true
  }
  return touch(next)
}

export function setBoxType(project: Project, boxType: BoxType): Project {
  const next = deepClone(project)
  next.boxType = boxType
  return touch(next)
}

export function formatDateStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}${m}${day}`
}

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || 'carton'
}
