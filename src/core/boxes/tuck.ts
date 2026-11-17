import { FACE_LABELS } from '../materials'
import type { NetBuildResult, NetPanel, SceneFace } from './types'
import type { BuildContext } from './types'
import {
  chamferRectPoints,
  dimension,
  fold,
  glueTrapezoid,
  label,
  polygonPanel,
  rectPanel,
} from './helpers'

export function buildTuckBox(ctx: BuildContext): NetBuildResult {
  const { length: L, width: W, height: H } = ctx
  const glue = 12
  const tuck = Math.max(14, W * 0.85)
  const dust = Math.max(10, W * 0.55)
  const bodyTop = tuck + 6
  const bodyBottom = bodyTop + H
  const x0 = 0
  const xGlue = glue
  const xBackEnd = xGlue + L
  const xRightEnd = xBackEnd + W
  const xFrontEnd = xRightEnd + L
  const xLeftEnd = xFrontEnd + W
  const frontX1 = xRightEnd
  const frontX2 = xFrontEnd
  const rightX1 = xBackEnd
  const rightX2 = xRightEnd
  const leftX1 = xFrontEnd
  const leftX2 = xLeftEnd
  const totalW = xLeftEnd
  const totalH = bodyBottom + tuck + 6

  const panels: NetPanel[] = []

  panels.push(
    polygonPanel(
      'glue',
      undefined,
      glueTrapezoid(x0, bodyTop + 3, glue, H - 6, 10),
      'glue',
      'GLUE',
    ),
  )

  panels.push(
    rectPanel(
      'back',
      'back',
      { x: xGlue, y: bodyTop, w: L, h: H },
      'panel',
      FACE_LABELS.back.en,
    ),
    rectPanel(
      'right',
      'right',
      { x: rightX1, y: bodyTop, w: W, h: H },
      'panel',
      FACE_LABELS.right.en,
    ),
    rectPanel(
      'front',
      'front',
      { x: frontX1, y: bodyTop, w: L, h: H },
      'panel',
      FACE_LABELS.front.en,
    ),
    rectPanel(
      'left',
      'left',
      { x: leftX1, y: bodyTop, w: W, h: H },
      'panel',
      FACE_LABELS.left.en,
    ),
  )

  // Top closure: front tuck + dust flaps on both side panels.
  panels.push(
    polygonPanel(
      'top-tuck',
      'top',
      chamferRectPoints(frontX1, bodyTop - tuck, L, tuck, 9, 'top'),
      'flap',
      'TOP',
    ),
    polygonPanel(
      'top-dust-left',
      'top',
      chamferRectPoints(leftX1, bodyTop - dust, W, dust, 6, 'top'),
      'flap',
    ),
    polygonPanel(
      'top-dust-right',
      'top',
      chamferRectPoints(rightX1, bodyTop - dust, W, dust, 6, 'top'),
      'flap',
    ),
  )

  // Bottom closure: back tuck + dust flaps on both side panels.
  panels.push(
    polygonPanel(
      'bottom-tuck',
      'bottom',
      chamferRectPoints(xGlue, bodyBottom, L, tuck, 9, 'bottom'),
      'flap',
      'BOTTOM',
    ),
    polygonPanel(
      'bottom-dust-left',
      'bottom',
      chamferRectPoints(leftX1, bodyBottom, W, dust, 6, 'bottom'),
      'flap',
    ),
    polygonPanel(
      'bottom-dust-right',
      'bottom',
      chamferRectPoints(rightX1, bodyBottom, W, dust, 6, 'bottom'),
      'flap',
    ),
  )

  const folds = [
    fold(xGlue, bodyTop, xGlue, bodyBottom),
    fold(xBackEnd, bodyTop, xBackEnd, bodyBottom),
    fold(xRightEnd, bodyTop, xRightEnd, bodyBottom),
    fold(xFrontEnd, bodyTop, xFrontEnd, bodyBottom),
    fold(frontX1, bodyTop, frontX2, bodyTop),
    fold(leftX1, bodyTop, leftX2, bodyTop),
    fold(rightX1, bodyTop, rightX2, bodyTop),
    fold(xGlue, bodyBottom, xBackEnd, bodyBottom),
    fold(leftX1, bodyBottom, leftX2, bodyBottom),
    fold(rightX1, bodyBottom, rightX2, bodyBottom),
  ]

  const labels = [
    label(frontX1 + L / 2, bodyTop + 9, 'FRONT', 4.2),
    label(xGlue + L / 2, bodyTop + 9, 'BACK', 4.2, true),
    label(rightX1 + W / 2, bodyTop + 9, 'RIGHT', 3.7, true),
    label(leftX1 + W / 2, bodyTop + 9, 'LEFT', 3.7, true),
    label(frontX1 + L / 2, bodyTop - tuck + 9, 'TUCK / TOP', 3.4, true),
    label(xGlue + L / 2, bodyBottom + 9, 'TUCK / BOTTOM', 3.4, true),
  ]

  const dimensions = [
    dimension(frontX1, totalH + 12, frontX2, totalH + 12, `L ${L}`),
    dimension(rightX1, totalH + 28, rightX2, totalH + 28, `W ${W}`),
    dimension(totalW + 16, bodyTop, totalW + 16, bodyBottom, `H ${H}`),
  ]

  const faces: SceneFace[] = [
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
      id: 'face-right',
      faceId: 'right',
      width: W,
      height: H,
      position: [L / 2, 0, 0],
      rotation: [0, Math.PI / 2, 0],
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
      id: 'face-top',
      faceId: 'top',
      width: L,
      height: W,
      position: [0, H / 2, 0],
      rotation: [-Math.PI / 2, 0, 0],
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

  return {
    net: {
      width: totalW,
      height: totalH,
      panels,
      folds,
      dimensions,
      labels,
      sections: [],
    },
    faces,
    groups: [],
    bodyHeight: H,
    lidHeight: 0,
    lidGap: 0,
    faceInfo: (['front', 'back', 'left', 'right', 'top', 'bottom'] as const).map(id => ({
      id,
      label: FACE_LABELS[id].zh,
    })),
  }
}
