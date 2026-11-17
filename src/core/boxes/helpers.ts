import type { FaceId } from '../types'
import type {
  NetDimension,
  NetFold,
  NetLabel,
  NetPanel,
  NetPanelKind,
  NetRect,
  NetSection,
} from './types'

export function rectPanel(
  id: string,
  faceId: FaceId | undefined,
  rect: NetRect,
  kind: NetPanelKind,
  label?: string,
): NetPanel {
  return {
    id,
    faceId,
    kind,
    label,
    artRect: { ...rect },
    points: [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
      { x: rect.x, y: rect.y + rect.h },
    ],
  }
}

export function polygonPanel(
  id: string,
  faceId: FaceId | undefined,
  points: { x: number; y: number }[],
  kind: NetPanelKind,
  label?: string,
): NetPanel {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const w = Math.max(...xs) - x
  const h = Math.max(...ys) - y
  return {
    id,
    faceId,
    kind,
    label,
    points,
    artRect: { x, y, w, h },
  }
}

export function fold(x1: number, y1: number, x2: number, y2: number): NetFold {
  return { x1, y1, x2, y2 }
}

export function dimension(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
): NetDimension {
  return { x1, y1, x2, y2, label }
}

export function label(
  x: number,
  y: number,
  text: string,
  size?: number,
  muted = false,
): NetLabel {
  return { x, y, text, size, muted }
}

export function section(x: number, y: number, text: string): NetSection {
  return { x, y, label: text }
}

export function chamferRectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  chamfer = 4,
  side: 'top' | 'bottom' | 'both' = 'both',
): { x: number; y: number }[] {
  const c = Math.min(chamfer, w / 4, h / 2)
  const points: { x: number; y: number }[] = []
  if (side === 'top' || side === 'both') {
    points.push(
      { x, y: y + h },
      { x, y: y + c },
      { x: x + c, y },
      { x: x + w - c, y },
      { x: x + w, y: y + c },
      { x: x + w, y: y + h },
    )
  } else {
    points.push(
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h - c },
      { x: x + w - c, y: y + h },
      { x: x + c, y: y + h },
      { x, y: y + h - c },
    )
  }
  return points
}

export function glueTrapezoid(
  x: number,
  y: number,
  width: number,
  height: number,
  chamfer = 8,
): { x: number; y: number }[] {
  return [
    { x, y: y + chamfer },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height - chamfer },
  ]
}

export function boundsOf(panels: NetPanel[]): NetRect {
  const xs = panels.flatMap(panel => panel.points.map(p => p.x))
  const ys = panels.flatMap(panel => panel.points.map(p => p.y))
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function round(value: number): number {
  return Math.round(value * 100) / 100
}
