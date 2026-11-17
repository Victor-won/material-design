import { FACE_LABELS } from '../materials'
import type { BuildContext, NetBuildResult, NetPanel, SceneFace } from './types'
import {
  dimension,
  fold,
  label,
  rectPanel,
  section,
} from './helpers'

export function buildMailerBox(ctx: BuildContext): NetBuildResult {
  const { length: L, width: W, height: H } = ctx
  const bodyH = Math.max(16, Math.round(H * 0.56))
  const lidH = Math.max(14, H - bodyH)
  const sidePad = Math.max(bodyH, lidH) + 10
  const baseX = sidePad
  const lidSkirtY = 0
  const lidTopY = lidH
  const backWallY = lidTopY + W
  const baseY = backWallY + bodyH
  const frontWallY = baseY + W
  const totalW = baseX + L + sidePad
  const totalH = frontWallY + bodyH

  const panels: NetPanel[] = [
    rectPanel('base', 'bottom', { x: baseX, y: baseY, w: L, h: W }, 'panel', 'BOTTOM'),
    rectPanel('body-front', 'front', { x: baseX, y: frontWallY, w: L, h: bodyH }, 'panel', 'FRONT'),
    rectPanel(
      'body-back',
      'back',
      { x: baseX, y: backWallY, w: L, h: bodyH },
      'panel',
      'BACK',
    ),
    rectPanel(
      'body-left',
      'left',
      { x: baseX - bodyH, y: baseY, w: bodyH, h: W },
      'panel',
      'LEFT',
    ),
    rectPanel(
      'body-right',
      'right',
      { x: baseX + L, y: baseY, w: bodyH, h: W },
      'panel',
      'RIGHT',
    ),
    rectPanel('lid-top', 'top', { x: baseX, y: lidTopY, w: L, h: W }, 'panel', 'LID TOP'),
    rectPanel(
      'lid-front',
      'lidFront',
      { x: baseX, y: lidSkirtY, w: L, h: lidH },
      'panel',
      'LID FRONT',
    ),
    rectPanel(
      'lid-left',
      'lidLeft',
      { x: baseX - lidH, y: lidTopY, w: lidH, h: W },
      'flap',
      'LID LEFT',
    ),
    rectPanel(
      'lid-right',
      'lidRight',
      { x: baseX + L, y: lidTopY, w: lidH, h: W },
      'flap',
      'LID RIGHT',
    ),
    rectPanel(
      'glue-left',
      undefined,
      { x: baseX - bodyH, y: baseY + W, w: 12, h: 14 },
      'glue',
    ),
    rectPanel(
      'glue-right',
      undefined,
      { x: baseX + L + bodyH - 12, y: baseY + W, w: 12, h: 14 },
      'glue',
    ),
  ]

  const folds = [
    fold(baseX, lidTopY, baseX + L, lidTopY),
    fold(baseX, backWallY, baseX + L, backWallY),
    fold(baseX, baseY, baseX + L, baseY),
    fold(baseX, frontWallY, baseX + L, frontWallY),
    fold(baseX, lidTopY, baseX, lidTopY + W),
    fold(baseX + L, lidTopY, baseX + L, lidTopY + W),
    fold(baseX, baseY, baseX, baseY + W),
    fold(baseX + L, baseY, baseX + L, baseY + W),
  ]

  const labels = [
    label(baseX + L / 2, lidTopY + 9, 'LID / TOP', 4.6),
    label(baseX + L / 2, baseY + 9, 'BODY / BOTTOM', 4.2, true),
    label(baseX + L / 2, frontWallY + 9, 'FRONT', 4.2),
    label(baseX + L / 2, backWallY + 9, 'BACK', 4.2, true),
  ]

  const dimensions = [
    dimension(baseX, totalH + 14, baseX + L, totalH + 14, `L ${L}`),
    dimension(totalW + 14, baseY, totalW + 14, baseY + W, `W ${W}`),
    dimension(totalW + 30, lidTopY, totalW + 30, frontWallY + bodyH, `H ${H}`),
  ]

  const sections = [
    section(baseX + L / 2, lidSkirtY + 10, 'LID'),
    section(baseX + L / 2, baseY + W + bodyH + 18, 'BODY'),
  ]

  const faces: SceneFace[] = [
    {
      id: 'face-front',
      faceId: 'front',
      width: L,
      height: bodyH,
      position: [0, -H / 2 + bodyH / 2, W / 2],
      rotation: [0, 0, 0],
    },
    {
      id: 'face-back',
      faceId: 'back',
      width: L,
      height: bodyH,
      position: [0, -H / 2 + bodyH / 2, -W / 2],
      rotation: [0, Math.PI, 0],
    },
    {
      id: 'face-left',
      faceId: 'left',
      width: W,
      height: bodyH,
      position: [-L / 2, -H / 2 + bodyH / 2, 0],
      rotation: [0, -Math.PI / 2, 0],
    },
    {
      id: 'face-right',
      faceId: 'right',
      width: W,
      height: bodyH,
      position: [L / 2, -H / 2 + bodyH / 2, 0],
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
    {
      id: 'lid-face-top',
      faceId: 'top',
      width: L,
      height: W,
      position: [0, lidH, W / 2],
      rotation: [-Math.PI / 2, 0, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-front',
      faceId: 'lidFront',
      width: L,
      height: lidH,
      position: [0, lidH / 2, W],
      rotation: [0, 0, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-left',
      faceId: 'lidLeft',
      width: W,
      height: lidH,
      position: [-L / 2, lidH / 2, W / 2],
      rotation: [0, -Math.PI / 2, 0],
      group: 'lid',
    },
    {
      id: 'lid-face-right',
      faceId: 'lidRight',
      width: W,
      height: lidH,
      position: [L / 2, lidH / 2, W / 2],
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
    faces,
    groups: [{ id: 'lid', position: [0, -H / 2 + bodyH, -W / 2] }],
    bodyHeight: bodyH,
    lidHeight: lidH,
    lidGap: 0,
    faceInfo: (
      ['front', 'back', 'left', 'right', 'bottom', 'top', 'lidFront', 'lidLeft', 'lidRight'] as const
    ).map(id => ({ id, label: FACE_LABELS[id].zh })),
  }
}
