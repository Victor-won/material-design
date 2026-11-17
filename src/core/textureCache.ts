import type { FaceId, Project } from './types'
import { resolveArtwork } from './project'
import { renderArtworkCanvas, textureCacheKey } from './artworkCanvas'

interface CacheEntry {
  canvas: HTMLCanvasElement
  usedAt: number
}

const cache = new Map<string, CacheEntry>()
const MAX_ENTRIES = 40

export function getFaceTexture(
  faceId: FaceId,
  widthMm: number,
  heightMm: number,
  project: Project,
  revision: number,
  maxPx = 1200,
): HTMLCanvasElement {
  const key = `${textureCacheKey(faceId, widthMm, heightMm, revision)}:${maxPx}`
  const existing = cache.get(key)
  if (existing) {
    existing.usedAt = Date.now()
    return existing.canvas
  }
  const artwork = resolveArtwork(project, faceId)
  const canvas = renderArtworkCanvas(widthMm, heightMm, artwork, { maxPx })
  cache.set(key, { canvas, usedAt: Date.now() })
  if (cache.size > MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].usedAt - b[1].usedAt)[0]
    if (oldest) cache.delete(oldest[0])
  }
  return canvas
}

export function getFaceTextureDataUrl(
  faceId: FaceId,
  widthMm: number,
  heightMm: number,
  project: Project,
  revision: number,
  maxPx = 900,
): string {
  const canvas = getFaceTexture(faceId, widthMm, heightMm, project, revision, maxPx)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export function clearTextureCache(): void {
  cache.clear()
}
