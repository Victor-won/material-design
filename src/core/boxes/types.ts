import type { BoxType, FaceId, Project } from '../types'

export interface NetRect {
  x: number
  y: number
  w: number
  h: number
}

export type NetPanelKind = 'panel' | 'flap' | 'glue'

export interface NetPanel {
  id: string
  faceId?: FaceId
  points: { x: number; y: number }[]
  artRect: NetRect
  kind: NetPanelKind
  label?: string
}

export interface NetFold {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface NetDimension {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
}

export interface NetLabel {
  x: number
  y: number
  text: string
  size?: number
  muted?: boolean
}

export interface NetSection {
  x: number
  y: number
  label: string
}

export interface NetModel {
  width: number
  height: number
  panels: NetPanel[]
  folds: NetFold[]
  dimensions: NetDimension[]
  labels: NetLabel[]
  sections: NetSection[]
}

export interface SceneFace {
  id: string
  faceId: FaceId
  width: number
  height: number
  position: [number, number, number]
  rotation: [number, number, number]
  group?: 'lid'
}

export interface SceneGroup {
  id: 'lid'
  position: [number, number, number]
}

export interface BoxModel {
  type: BoxType
  name: string
  nameEn: string
  net: NetModel
  faces: SceneFace[]
  groups: SceneGroup[]
  bodyHeight: number
  lidHeight: number
  lidGap: number
  faceInfo: { id: FaceId; label: string }[]
}

export interface BuildContext {
  project: Project
  length: number
  width: number
  height: number
}

export interface NetBuildResult {
  net: NetModel
  faces: SceneFace[]
  groups: SceneGroup[]
  bodyHeight: number
  lidHeight: number
  lidGap: number
  faceInfo: { id: FaceId; label: string }[]
}
