export type BoxType = 'tuck' | 'mailer' | 'lidbase'

export type FaceId =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'lidTop'
  | 'lidFront'
  | 'lidLeft'
  | 'lidRight'
  | 'lidBack'

export type EditorScope = 'global' | FaceId

export type MaterialId = 'white-card' | 'kraft' | 'corrugated' | 'black-card' | 'recycled'
export type FinishId = 'matte' | 'gloss' | 'soft-touch'
export type PatternId =
  | 'none'
  | 'grid'
  | 'dots'
  | 'stripes'
  | 'diagonal'
  | 'checker'
  | 'waves'
  | 'cross'
export type PaperTextureId = 'none' | 'fiber' | 'linen' | 'flute' | 'noise'
export type PropertyTab = 'structure' | 'design' | 'export'
export type TextFont = 'manrope' | 'newsreader' | 'mono'

export interface Point {
  x: number
  y: number
}

export interface Dimensions {
  length: number
  width: number
  height: number
}

export interface BackgroundImage {
  src: string
  fit: 'cover' | 'contain'
  scale: number
  offsetX: number
  offsetY: number
  rotation: number
  opacity: number
}

export interface BaseLayer {
  id: string
  name: string
  visible: boolean
  x: number
  y: number
  rotation: number
  opacity: number
}

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: TextFont
  weight: number
  color: string
  letterSpacing: number
  lineHeight: number
  align: 'left' | 'center' | 'right'
}

export interface ImageLayer extends BaseLayer {
  type: 'image'
  src: string
  widthPct: number
}

export type DesignLayer = TextLayer | ImageLayer

export interface Artwork {
  color: string
  paperTexture: PaperTextureId
  pattern: PatternId
  patternColor: string
  image: BackgroundImage | null
  layers: DesignLayer[]
}

export interface FaceDesign {
  useGlobal: boolean
  artwork: Artwork
}

export interface Project {
  schemaVersion: 1
  id: string
  name: string
  boxType: BoxType
  dimensions: Dimensions
  lidHeight: number
  lidGap: number
  material: MaterialId
  finish: FinishId
  thickness: number
  bleed: number
  safeArea: number
  globalDesign: Artwork
  faces: Partial<Record<FaceId, FaceDesign>>
  createdAt: string
  updatedAt: string
}

export interface ToastMessage {
  id: string
  kind: 'info' | 'success' | 'error'
  text: string
}

export interface UIState {
  activeTab: PropertyTab
  scope: EditorScope
  saveState: 'saved' | 'saving' | 'session-only' | 'error'
  selectedLayerId: string | null
  showBleed: boolean
  showAnnotations: boolean
  showNet: boolean
  showStage: boolean
  showProperties: boolean
  exporting: boolean
  lidOpen: number
  lidLift: number
  toasts: ToastMessage[]
  webglAvailable: boolean
}

export interface BoxModelInfo {
  id: FaceId
  label: string
  short: string
}
