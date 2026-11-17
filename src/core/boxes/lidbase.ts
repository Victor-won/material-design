import { FACE_LABELS } from '../materials'
import type { FaceId } from '../types'
import type { BuildContext, NetBuildResult, NetFold, NetPanel, SceneFace } from './types'
import { dimension, fold, label, rectPanel, section } from './helpers'

interface CrossFaces {
  center: FaceId
  top: FaceId
  bottom: FaceId
  left: FaceId
  right: FaceId
}

interface CrossResult {
  panels: NetPanel[]
  folds: NetFold[]
  labels: ReturnType<typeof label>[]
  width: number
  height: number
}

function buildCross(
  idPrefix: string,
  originX: number,
  originY: number,
  innerW: number,
  innerH: number,
  wallH: number,
  faces: CrossFaces,
): CrossResult {
  const panels: NetPanel[] = [
    rectPanel(
      `${idPrefix}-center`,
      faces.center,
      { x: originX, y: originY, w: innerW, h: innerH },
      'panel',
      faces.center === 'lidTop' ? 'LID TOP' : 'BOTTOM',
    ),
    rectPanel(
      `${idPrefix}-top`,
      faces.top,
      { x: originX, y: originY - wallH, w: innerW, h: wallH },
      'panel',
      'BACK',
    ),
    rectPanel(
      `${idPrefix}-bottom`,
      faces.bottom,
      { x: originX, y: originY + innerH, w: innerW, h: wallH },
      'panel',
      'FRONT',
    ),
    rectPanel(
      `${idPrefix}-left`,
      faces.left,
      { x: originX - wallH, y: originY, w: wallH, h: innerH },
      'panel',
      'LEFT',
    ),
    rectPanel(
      `${idPrefix}-right`,
      faces.right,
      { x: originX + innerW, y: originY, w: wallH, h: innerH },
      'panel',
      'RIGHT',
    ),
    rectPanel(
      `${idPrefix}-glue-tl`,
      undefined,
      { x: originX - wallH, y: originY - 12, w: wallH, h: 12 },
      'glue',
    ),
    rectPanel(
      `${idPrefix}-glue-bl`,
      undefined,
      { x: originX - wallH, y: originY + innerH, w: wallH, h: 12 },
      'glue',
    ),
    rectPanel(
      `${idPrefix}-glue-tr`,
      undefined,
      { x: originX + innerW, y: originY - 12, w: wallH, h: 12 },
      'glue',
    ),
    rectPanel(
      `${idPrefix}-glue-br`,
      undefined,
      { x: originX + innerW, y: originY + innerH, w: wallH, h: 12 },
      'glue',
    ),
  ]

  const folds: NetFold[] = [
    fold(originX, originY - wallH, originX + innerW, originY - wallH),
    fold(originX, originY + innerH, originX + innerW, originY + innerH),
    fold(originX - wallH, originY, originX - wallH, originY + innerH),
    fold(originX + innerW, originY, originX + innerW, originY + innerH),
  ]

  const labels = [
    label(originX + innerW / 2, originY - wallH + 8, 'BACK', 3.7, true),
    label(originX + innerW / 2, originY + innerH + 8, 'FRONT', 3.7),
    label(originX - wallH / 2, originY + 9, 'LEFT', 3.4, true),
    label(originX + innerW + wallH / 2, originY + 9, 'RIGHT', 3.4, true),
  ]

  return {
    panels,
    folds,
    labels,
    width: innerW + wallH * 2,
    height: innerH + wallH * 2,
  }
}

export function buildLidbaseBox(ctx: BuildContext): NetBuildResult {
  const { length: L, width: W, height: H } = ctx
  const gap = ctx.project.lidGap
  const lidHeight = ctx.project.lidHeight
  const Ll = L + gap * 2
  const Wl = W + gap * 2

  const baseOriginX = 24 + H
  const baseOriginY = 40 + H
  const baseCross = buildCross(
    'base',
    baseOriginX,
    baseOriginY,
    L,
    W,
    H,
    {
      center: 'bottom',
      top: 'back',
      bottom: 'front',
      left: 'left',
      right: 'right',
    },
  )

  const lidOriginX = 24 + baseCross.width + 64 + lidHeight
  const lidOriginY = 40 + lidHeight
  const lidCross = buildCross(
    'lid',
    lidOriginX,
    lidOriginY,
    Ll,
    Wl,
    lidHeight,
    {
      center: 'lidTop',
      top: 'lidBack',
      bottom: 'lidFront',
      left: 'lidLeft',
      right: 'lidRight',
    },
  )

  const panels = [...baseCross.panels, ...lidCross.panels]
  const folds = [...baseCross.folds, ...lidCross.folds]
  const totalW = lidOriginX + Ll + lidHeight
  const totalH = Math.max(baseOriginY + W + H, lidOriginY + Wl + lidHeight)

  const labels = [...baseCross.labels, ...lidCross.labels]

  const dimensions = [
    dimension(baseOriginX, totalH + 18, baseOriginX + L, totalH + 18, `L ${L}`),
    dimension(baseOriginX + L + H + 18, baseOriginY, baseOriginX + L + H + 18, baseOriginY + W, `W ${W}`),
    dimension(baseOriginX - H - 16, baseOriginY, baseOriginX - H - 16, baseOriginY + W, `H ${H}`),
    dimension(lidOriginX, totalH + 18, lidOriginX + Ll, totalH + 18, `LID ${Ll}`),
    dimension(lidOriginX + Ll + lidHeight + 16, lidOriginY, lidOriginX + Ll + lidHeight + 16, lidOriginY + Wl, `LID W ${Wl}`),
  ]

  const sections = [
    section(baseOriginX + L / 2, baseOriginY - H - 18, 'BASE / 盒身'),
    section(lidOriginX + Ll / 2, lidOriginY - lidHeight - 18, 'LID / 盒盖'),
  ]

  const baseFaces: SceneFace[] = [
    {
      id: 'face-front',
      faceId: 'front',
      width: L,
      height: H,
      position: [0, 0, W / 2],
      rotation: [0, 0, 0],
    },
    {
      id: 'face-back',
      faceId: 'back',
      width: L,
      height: H,
      position: [0, 0, -W / 2],
      rotation: [0, Math.PI, 0],
    },
    {
      id: 'face-left',
      faceId: 'left',
      width: W,
      height: H,
      position: [-L / 2, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
    },
    {
      id: 'face-right',
      faceId: 'right',
      width: W,
      height: H,
      position: [L / 2, 0, 0],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      id: 'face-bottom',
      faceId: 'bottom',
      width: L,
      height: W,
      position: [0, -H / 2, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]

  const lidFaces: SceneFace[] = [
    {
      id: 'lid-face-top',
      faceId: 'lidTop',
      width: Ll,
      height: Wl,
      position: [0, lidHeight, 0],
      rotation: [-Math.PI / 2, 0, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-front',
      faceId: 'lidFront',
      width: Ll,
      height: lidHeight,
      position: [0, lidHeight / 2, Wl / 2],
      rotation: [0, 0, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-back',
      faceId: 'lidBack',
      width: Ll,
      height: lidHeight,
      position: [0, lidHeight / 2, -Wl / 2],
      rotation: [0, Math.PI, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-left',
      faceId: 'lidLeft',
      width: Wl,
      height: lidHeight,
      position: [-Ll / 2, lidHeight / 2, 0],
      rotation: [0, -Math.PI / 2, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-right',
      faceId: 'lidRight',
      width: Wl,
      height: lidHeight,
      position: [Ll / 2, lidHeight / 2, 0],
      rotation: [0, Math.PI / 2, 0],
      group: 'lid',
    },
  ]

  return {
    net: {
      width: totalW,
      height: totalH,
      panels,
      folds,
      dimensions,
      labels,
      sections,
    },
    faces: [...baseFaces, ...lidFaces],
    groups: [{ id: 'lid', position: [0, H / 2, 0] }],
    bodyHeight: H,
    lidHeight,
    lidGap: gap,
    faceInfo: (
      [
        'front',
        'back',
        'left',
        'right',
        'bottom',
        'lidTop',
        'lidFront',
        'lidLeft',
        'lidRight',
        'lidBack',
      ] as const
    ).map(id => ({ id, label: FACE_LABELS[id].zh })),
  }
}
