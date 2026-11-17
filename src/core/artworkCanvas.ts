import type { Artwork, BackgroundImage, DesignLayer, ImageLayer, PatternId, TextLayer } from './types'
import { getCachedImage } from './image'

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '')
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map(char => char + char)
          .join('')
      : value.padEnd(6, '0').slice(0, 6)
  const int = Number.parseInt(normalized, 16)
  if (!Number.isFinite(int)) return { r: 0, g: 0, b: 0 }
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

export function patternTileMm(pattern: PatternId): number {
  switch (pattern) {
    case 'grid':
      return 10
    case 'dots':
      return 8
    case 'stripes':
      return 12
    case 'diagonal':
      return 10
    case 'checker':
      return 8
    case 'waves':
      return 14
    case 'cross':
      return 10
    default:
      return 0
  }
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function textureCacheKey(faceId: string, w: number, h: number, revision: number): string {
  return `${faceId}:${Math.round(w)}x${Math.round(h)}:${revision}`
}

function drawPaperTexture(
  ctx: CanvasRenderingContext2D,
  art: Artwork,
  width: number,
  height: number,
  pxPerMm: number,
): void {
  if (art.paperTexture === 'none') return
  const random = mulberry32(hashString(`${art.color}:${art.paperTexture}`))
  ctx.save()
  if (art.paperTexture === 'fiber') {
    ctx.strokeStyle = 'rgba(89, 58, 28, 0.09)'
    ctx.lineWidth = Math.max(0.6, pxPerMm * 0.08)
    for (let i = 0; i < 320; i += 1) {
      const x = random() * width
      const y = random() * height
      const length = (3 + random() * 10) * pxPerMm
      const angle = (random() - 0.5) * 0.7
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
      ctx.stroke()
    }
  } else if (art.paperTexture === 'linen') {
    const step = Math.max(2, pxPerMm * 0.35)
    ctx.strokeStyle = 'rgba(92, 78, 54, 0.055)'
    ctx.lineWidth = 0.7
    for (let x = 0; x < width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  } else if (art.paperTexture === 'flute') {
    const step = Math.max(4, pxPerMm * 6)
    ctx.strokeStyle = 'rgba(73, 50, 25, 0.1)'
    ctx.lineWidth = Math.max(1, pxPerMm * 0.25)
    for (let x = 0; x < width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    for (let x = step / 2; x < width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  } else if (art.paperTexture === 'noise') {
    const count = Math.min(6000, Math.round((width * height) / 160))
    for (let i = 0; i < count; i += 1) {
      const alpha = 0.02 + random() * 0.06
      ctx.fillStyle = random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(20,15,10,${alpha})`
      const size = Math.max(1, pxPerMm * 0.12)
      ctx.fillRect(random() * width, random() * height, size, size)
    }
  }
  ctx.restore()
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  art: Artwork,
  width: number,
  height: number,
  pxPerMm: number,
): void {
  if (art.pattern === 'none') return
  const tile = patternTileMm(art.pattern) * pxPerMm
  if (tile <= 0) return
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = art.patternColor
  ctx.fillStyle = art.patternColor
  ctx.lineWidth = Math.max(1, pxPerMm * 0.16)
  if (art.pattern === 'grid') {
    for (let x = 0; x <= width; x += tile) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += tile) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  } else if (art.pattern === 'dots') {
    const radius = Math.max(1, pxPerMm * 0.55)
    for (let y = tile / 2; y < height; y += tile) {
      for (let x = tile / 2; x < width; x += tile) {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (art.pattern === 'stripes') {
    for (let x = 0; x < width + height; x += tile) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
  } else if (art.pattern === 'diagonal') {
    for (let x = -height; x < width + height; x += tile) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + height, height)
      ctx.stroke()
    }
  } else if (art.pattern === 'checker') {
    for (let y = 0; y < height; y += tile) {
      for (let x = 0; x < width; x += tile) {
        const col = Math.floor(x / tile)
        const row = Math.floor(y / tile)
        if ((col + row) % 2 === 0) ctx.fillRect(x, y, tile, tile)
      }
    }
  } else if (art.pattern === 'waves') {
    ctx.lineWidth = Math.max(1, pxPerMm * 0.22)
    for (let y = 0; y < height + tile; y += tile) {
      ctx.beginPath()
      for (let x = 0; x <= width; x += 2) {
        const offset = Math.sin((x / tile) * Math.PI * 2) * tile * 0.18
        if (x === 0) ctx.moveTo(x, y + offset)
        else ctx.lineTo(x, y + offset)
      }
      ctx.stroke()
    }
  } else if (art.pattern === 'cross') {
    const arm = tile * 0.18
    for (let y = tile / 2; y < height; y += tile) {
      for (let x = tile / 2; x < width; x += tile) {
        ctx.beginPath()
        ctx.moveTo(x - arm, y)
        ctx.lineTo(x + arm, y)
        ctx.moveTo(x, y - arm)
        ctx.lineTo(x, y + arm)
        ctx.stroke()
      }
    }
  }
  ctx.restore()
}

function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  image: BackgroundImage,
  width: number,
  height: number,
): void {
  const img = getCachedImage(image.src)
  if (!img) return
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return
  const baseScale =
    image.fit === 'cover' ? Math.max(width / iw, height / ih) : Math.min(width / iw, height / ih)
  const scale = baseScale * image.scale
  ctx.save()
  ctx.globalAlpha = image.opacity
  ctx.translate(
    width / 2 + image.offsetX * width,
    height / 2 + image.offsetY * height,
  )
  ctx.rotate((image.rotation * Math.PI) / 180)
  ctx.drawImage(img, (-iw * scale) / 2, (-ih * scale) / 2, iw * scale, ih * scale)
  ctx.restore()
}

function fontFamily(family: TextLayer['fontFamily']): string {
  if (family === 'newsreader') return "'Newsreader Variable', 'Songti SC', Georgia, serif"
  if (family === 'mono') return "'SFMono-Regular', Menlo, Consolas, monospace"
  return "'Manrope Variable', 'PingFang SC', 'Microsoft YaHei', sans-serif"
}

function measureSpaced(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let width = 0
  for (const char of text) width += ctx.measureText(char).width + spacing
  return Math.max(0, width - spacing)
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: CanvasTextAlign,
): void {
  const total = measureSpaced(ctx, text, spacing)
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  ctx.textAlign = 'left'
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + spacing
  }
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
  pxPerMm: number,
): void {
  const sizePx = layer.fontSize * pxPerMm
  const spacingPx = layer.letterSpacing * pxPerMm
  const lineHeightPx = sizePx * layer.lineHeight
  const lines = layer.text.split('\n')
  ctx.save()
  ctx.globalAlpha = layer.opacity
  ctx.fillStyle = layer.color
  ctx.font = `${layer.weight} ${sizePx}px ${fontFamily(layer.fontFamily)}`
  ctx.textBaseline = 'middle'
  ctx.translate((layer.x / 100) * width, (layer.y / 100) * height)
  ctx.rotate((layer.rotation * Math.PI) / 180)
  const start = -((lines.length - 1) * lineHeightPx) / 2
  lines.forEach((line, index) => {
    drawSpacedText(ctx, line, 0, start + index * lineHeightPx, spacingPx, layer.align)
  })
  ctx.restore()
}

function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  width: number,
  height: number,
): void {
  const img = getCachedImage(layer.src)
  if (!img) return
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return
  const targetW = (layer.widthPct / 100) * width
  const targetH = targetW * (ih / iw)
  ctx.save()
  ctx.globalAlpha = layer.opacity
  ctx.translate((layer.x / 100) * width, (layer.y / 100) * height)
  ctx.rotate((layer.rotation * Math.PI) / 180)
  ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH)
  ctx.restore()
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  width: number,
  height: number,
  pxPerMm: number,
): void {
  if (!layer.visible) return
  if (layer.type === 'text') drawTextLayer(ctx, layer, width, height, pxPerMm)
  else drawImageLayer(ctx, layer, width, height)
}

export interface RenderOptions {
  maxPx?: number
  dpi?: number
  background?: 'transparent' | 'paper'
  includeGuides?: boolean
}

export function renderArtworkCanvas(
  widthMm: number,
  heightMm: number,
  art: Artwork,
  opts: RenderOptions = {},
): HTMLCanvasElement {
  const maxPx = opts.maxPx ?? 1600
  const longest = Math.max(widthMm, heightMm, 1)
  const pxPerMm = maxPx / longest
  const width = Math.max(2, Math.round(widthMm * pxPerMm))
  const height = Math.max(2, Math.round(heightMm * pxPerMm))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建贴图画布')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (opts.background !== 'transparent') {
    ctx.fillStyle = art.color
    ctx.fillRect(0, 0, width, height)
  }

  drawPaperTexture(ctx, art, width, height, pxPerMm)
  drawPattern(ctx, art, width, height, pxPerMm)
  if (art.image) drawBackgroundImage(ctx, art.image, width, height)
  for (const layer of art.layers) drawLayer(ctx, layer, width, height, pxPerMm)

  if (opts.includeGuides) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 77, 31, 0.35)'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1)
    ctx.restore()
  }

  return canvas
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9): string {
  return canvas.toDataURL(type, quality)
}
