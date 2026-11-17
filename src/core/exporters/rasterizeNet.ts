import type { Project } from '../types'
import type { BoxModel, NetPanel } from '../boxes'
import { resolveArtwork } from '../project'
import { getFaceTexture } from '../textureCache'

export interface NetBounds {
  minX: number
  minY: number
  width: number
  height: number
}

export function getNetBounds(model: BoxModel, padding = 18): NetBounds {
  const xs: number[] = []
  const ys: number[] = []
  for (const panel of model.net.panels) {
    for (const point of panel.points) {
      xs.push(point.x)
      ys.push(point.y)
    }
  }
  for (const dim of model.net.dimensions) {
    xs.push(dim.x1, dim.x2)
    ys.push(dim.y1, dim.y2)
  }
  for (const item of model.net.labels) {
    xs.push(item.x)
    ys.push(item.y)
  }
  for (const item of model.net.sections) {
    xs.push(item.x)
    ys.push(item.y)
  }
  const minX = Math.min(...xs) - padding
  const minY = Math.min(...ys) - padding
  return {
    minX,
    minY,
    width: Math.max(20, Math.max(...xs) + padding - minX),
    height: Math.max(20, Math.max(...ys) + padding - minY),
  }
}

function panelPath(ctx: CanvasRenderingContext2D, panel: NetPanel) {
  if (!panel.points.length) return
  ctx.beginPath()
  panel.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  ctx.closePath()
}

export interface RasterOptions {
  dpi?: number
  maxPx?: number
  background?: string
  includeAnnotations?: boolean
  pixelScale?: number
}

export interface RasterResult {
  canvas: HTMLCanvasElement
  bounds: NetBounds
  widthMm: number
  heightMm: number
  pxPerMm: number
}

export function rasterizeNet(
  project: Project,
  model: BoxModel,
  revision: number,
  options: RasterOptions = {},
): RasterResult {
  const dpi = options.dpi ?? 300
  const maxPx = options.maxPx ?? 6000
  const bounds = getNetBounds(model, 20)
  const dpiScale = dpi / 25.4
  const pxPerMm = Math.min(dpiScale, maxPx / Math.max(bounds.width, bounds.height))
  const widthPx = Math.max(2, Math.round(bounds.width * pxPerMm))
  const heightPx = Math.max(2, Math.round(bounds.height * pxPerMm))
  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建导出画布')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = options.background ?? '#fbf8f1'
  ctx.fillRect(0, 0, widthPx, heightPx)

  ctx.save()
  ctx.setTransform(
    pxPerMm,
    0,
    0,
    pxPerMm,
    -bounds.minX * pxPerMm,
    -bounds.minY * pxPerMm,
  )

  const baseColor = project.globalDesign.color
  if (project.bleed > 0) {
    for (const panel of model.net.panels) {
      panelPath(ctx, panel)
      ctx.fillStyle = baseColor
      ctx.strokeStyle = baseColor
      ctx.lineWidth = project.bleed * 2
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 0.9
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  for (const panel of model.net.panels) {
    panelPath(ctx, panel)
    if (panel.kind === 'glue') {
      ctx.fillStyle = '#eee6d7'
      ctx.fill()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = '#c5b9a5'
      ctx.lineWidth = 0.24
      for (let x = panel.artRect.x - panel.artRect.h; x < panel.artRect.x + panel.artRect.w + panel.artRect.h; x += 2.2) {
        ctx.beginPath()
        ctx.moveTo(x, panel.artRect.y + panel.artRect.h)
        ctx.lineTo(x + panel.artRect.h, panel.artRect.y)
        ctx.stroke()
      }
      ctx.restore()
    } else if (panel.faceId) {
      ctx.fillStyle = '#f7f3e9'
      ctx.fill()
      ctx.save()
      ctx.clip()
      const texture = getFaceTexture(
        panel.faceId,
        Math.max(1, panel.artRect.w),
        Math.max(1, panel.artRect.h),
        project,
        revision,
        1800,
      )
      ctx.drawImage(texture, panel.artRect.x, panel.artRect.y, panel.artRect.w, panel.artRect.h)
      ctx.restore()
    } else {
      const artwork = resolveArtwork(project, 'front')
      ctx.fillStyle = artwork.color
      ctx.fill()
    }
    panelPath(ctx, panel)
    ctx.strokeStyle = '#16130f'
    ctx.lineWidth = 0.28
    ctx.stroke()
  }

  ctx.strokeStyle = '#2b4cff'
  ctx.lineWidth = 0.28
  ctx.setLineDash([2.4, 2])
  for (const fold of model.net.folds) {
    ctx.beginPath()
    ctx.moveTo(fold.x1, fold.y1)
    ctx.lineTo(fold.x2, fold.y2)
    ctx.stroke()
  }
  ctx.setLineDash([])

  if (options.includeAnnotations !== false && project.safeArea > 0) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 77, 31, 0.32)'
    ctx.lineWidth = 0.22
    ctx.setLineDash([1.2, 1.8])
    for (const panel of model.net.panels) {
      if (panel.kind !== 'panel' || !panel.faceId) continue
      const w = panel.artRect.w - project.safeArea * 2
      const h = panel.artRect.h - project.safeArea * 2
      if (w <= 0 || h <= 0) continue
      ctx.strokeRect(
        panel.artRect.x + project.safeArea,
        panel.artRect.y + project.safeArea,
        w,
        h,
      )
    }
    ctx.restore()
  }

  if (options.includeAnnotations !== false) {
    for (const item of model.net.labels) {
      const size = item.size ?? 4
      ctx.font = `600 ${size}px "Manrope Variable", "PingFang SC", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = item.muted ? 'rgba(76,70,60,0.8)' : 'rgba(28,24,18,0.92)'
      ctx.fillText(item.text, item.x, item.y)
    }
    for (const item of model.net.sections) {
      ctx.font = `italic 500 8px "Newsreader Variable", Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ff4d1f'
      ctx.fillText(item.label, item.x, item.y)
    }
    for (const dim of model.net.dimensions) {
      const horizontal = Math.abs(dim.y2 - dim.y1) < Math.abs(dim.x2 - dim.x1)
      ctx.strokeStyle = 'rgba(102,95,82,0.7)'
      ctx.lineWidth = 0.25
      ctx.beginPath()
      ctx.moveTo(dim.x1, dim.y1)
      ctx.lineTo(dim.x2, dim.y2)
      ctx.stroke()
      ctx.font = `600 3.7px "Manrope Variable", sans-serif`
      ctx.fillStyle = 'rgba(74,68,58,0.95)'
      ctx.textAlign = horizontal ? 'center' : 'left'
      ctx.textBaseline = horizontal ? 'bottom' : 'middle'
      const x = horizontal ? (dim.x1 + dim.x2) / 2 : (dim.x1 + dim.x2) / 2 + 2.4
      const y = horizontal ? (dim.y1 + dim.y2) / 2 - 2.2 : (dim.y1 + dim.y2) / 2
      ctx.fillText(dim.label, x, y)
    }
  }

  ctx.restore()
  return {
    canvas,
    bounds,
    widthMm: bounds.width,
    heightMm: bounds.height,
    pxPerMm,
  }
}
