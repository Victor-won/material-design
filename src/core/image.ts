import type { Project } from './types'

const imageCache = new Map<string, HTMLImageElement>()
const pending = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return Promise.resolve(cached)
  const existing = pending.get(src)
  if (existing) return existing
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      imageCache.set(src, img)
      pending.delete(src)
      resolve(img)
    }
    img.onerror = () => {
      pending.delete(src)
      reject(new Error('图片载入失败'))
    }
    img.src = src
  })
  pending.set(src, promise)
  return promise
}

export function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) ?? null
}

export function clearImageCache(): void {
  imageCache.clear()
  pending.clear()
}

export function collectImageSources(project: Project): string[] {
  const sources = new Set<string>()
  const artworks = [project.globalDesign, ...Object.values(project.faces).map(f => f?.artwork)]
  for (const artwork of artworks) {
    if (!artwork) continue
    if (artwork.image?.src) sources.add(artwork.image.src)
    for (const layer of artwork.layers) {
      if (layer.type === 'image' && layer.src) sources.add(layer.src)
    }
  }
  return [...sources]
}

export async function preloadProjectImages(project: Project): Promise<void> {
  const sources = collectImageSources(project)
  await Promise.allSettled(sources.map(src => loadImage(src)))
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('无法读取文件'))
    reader.readAsDataURL(file)
  })
}

export interface CompressedImage {
  src: string
  width: number
  height: number
}

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

export async function compressImageFile(file: File, maxEdge = 2000): Promise<CompressedImage> {
  if (!ALLOWED.has(file.type)) {
    throw new Error('仅支持 PNG、JPG、WebP 或 SVG 图片')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('图片不能超过 8MB')
  }
  const dataUrl = await readAsDataUrl(file)
  const img = await loadImage(dataUrl)
  const naturalWidth = img.naturalWidth || img.width
  const naturalHeight = img.naturalHeight || img.height
  if (!naturalWidth || !naturalHeight) throw new Error('图片尺寸无效')
  const ratio = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * ratio))
  const height = Math.max(1, Math.round(naturalHeight * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器无法处理该图片')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  const hasAlpha = file.type === 'image/png' || file.type === 'image/svg+xml' || file.type === 'image/webp'
  const src = hasAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.86)
  await loadImage(src)
  return { src, width, height }
}
