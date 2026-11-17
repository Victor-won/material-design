import type { FaceId, Project } from './types'
import type { BoxModel, NetPanel } from './boxes'
import { getFaceTextureDataUrl } from './textureCache'

interface NetSvgOptions {
  selectedFace?: FaceId | 'global' | null
  showBleed?: boolean
  showAnnotations?: boolean
  revision?: number
  bleed?: number
  technical?: boolean
  forExport?: boolean
}

const dataUrlCache = new Map<string, string>()

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function pathOf(points: { x: number; y: number }[]): string {
  if (!points.length) return ''
  return `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')} Z`
}

function textureUrl(panel: NetPanel, project: Project, revision: number): string | null {
  if (!panel.faceId) return null
  const w = Math.max(1, Math.round(panel.artRect.w))
  const h = Math.max(1, Math.round(panel.artRect.h))
  const key = `${panel.faceId}:${w}x${h}:${revision}`
  const cached = dataUrlCache.get(key)
  if (cached) return cached
  const url = getFaceTextureDataUrl(panel.faceId, w, h, project, revision, 760)
  if (dataUrlCache.size > 180) {
    const first = dataUrlCache.keys().next().value
    if (first) dataUrlCache.delete(first)
  }
  dataUrlCache.set(key, url)
  return url
}

export function buildNetSvg(
  model: BoxModel,
  project: Project,
  revision: number,
  options: NetSvgOptions = {},
): string {
  const {
    selectedFace = null,
    showBleed = true,
    showAnnotations = true,
    bleed = project.bleed,
    technical = true,
    forExport = false,
  } = options
  const padding = forExport ? 22 : 18
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
  const maxX = Math.max(...xs) + padding
  const maxY = Math.max(...ys) + padding
  const width = Math.max(40, maxX - minX)
  const height = Math.max(40, maxY - minY)
  const baseColor = project.globalDesign.color
  const labelScale = technical ? Math.min(2.2, Math.max(1, model.net.width / 300)) : 1

  const defs: string[] = []
  const panelMarkup: string[] = []
  const bleedMarkup: string[] = []
  const hitMarkup: string[] = []

  if (technical) {
    defs.push(`
      <pattern id="pf-tech-grid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#cfc6b4" stroke-width="0.18" opacity="0.5"/>
      </pattern>
      <pattern id="pf-glue-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#b6aa95" stroke-width="1.1"/>
      </pattern>
    `)
  } else {
    defs.push(`
      <pattern id="pf-glue-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#b6aa95" stroke-width="0.8"/>
      </pattern>
    `)
  }

  model.net.panels.forEach((panel, index) => {
    const path = pathOf(panel.points)
    const clipId = `pf-clip-${index}`
    defs.push(`<clipPath id="${clipId}"><path d="${path}"/></clipPath>`)
    if (showBleed) {
      bleedMarkup.push(
        `<path d="${path}" fill="${baseColor}" fill-opacity="0.55" stroke="${baseColor}" stroke-width="${bleed * 2}" stroke-opacity="0.22" stroke-linejoin="round" data-bleed="true"/>`,
      )
    }
    if (panel.kind === 'glue') {
      panelMarkup.push(
        `<path d="${path}" fill="url(#pf-glue-hatch)" stroke="none" opacity="0.7"/>`,
      )
    } else {
      const url = textureUrl(panel, project, revision)
      const image = url
        ? `<image href="${url}" x="${panel.artRect.x}" y="${panel.artRect.y}" width="${panel.artRect.w}" height="${panel.artRect.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
        : ''
      panelMarkup.push(`
        <g class="pf-face-group">
          <path d="${path}" fill="#f7f3e9"/>
          ${image}
          <path d="${path}" fill="none" stroke="#1b1813" stroke-width="0.55" stroke-opacity="0.58"/>
          ${
            selectedFace && panel.faceId === selectedFace
              ? `<path d="${path}" fill="#ff4d1f" fill-opacity="0.075" stroke="#ff4d1f" stroke-width="1.65" stroke-linejoin="round" data-selected="true"/>`
              : ''
          }
        </g>
      `)
    }
    if (panel.faceId) {
      hitMarkup.push(
        `<g data-face="${panel.faceId}" class="pf-face-hit" tabindex="0" role="button" aria-label="${escapeXml(panel.faceId)}">
          <path d="${path}" fill="transparent" stroke="none"/>
          <path class="pf-hover-line" d="${path}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-opacity="0" pointer-events="none"/>
        </g>`,
      )
    }
  })

  const foldMarkup = model.net.folds
    .map(
      fold =>
        `<line data-fold="true" x1="${fold.x1}" y1="${fold.y1}" x2="${fold.x2}" y2="${fold.y2}" stroke="#2b4cff" stroke-width="0.52" stroke-opacity="0.78" stroke-dasharray="2.6 2.2"/>`,
    )
    .join('')

  const safeMarkup =
    showAnnotations && project.safeArea > 0
      ? model.net.panels
          .filter(panel => panel.kind === 'panel' && panel.faceId)
          .map(panel => {
            const inset = project.safeArea
            const w = panel.artRect.w - inset * 2
            const h = panel.artRect.h - inset * 2
            if (w <= 0 || h <= 0) return ''
            return `<rect data-safe="true" x="${(panel.artRect.x + inset).toFixed(2)}" y="${(panel.artRect.y + inset).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="none" stroke="#ff4d1f" stroke-opacity="0.2" stroke-width="0.3" stroke-dasharray="1.3 1.9"/>`
          })
          .join('')
      : ''

  const labelMarkup = showAnnotations
    ? model.net.labels
        .map(item => {
          const size = (item.size ?? 4) * labelScale
          return `<text x="${item.x}" y="${item.y}" text-anchor="middle" font-family="'Manrope Variable', 'PingFang SC', sans-serif" font-size="${size.toFixed(2)}" font-weight="650" letter-spacing="0.28" fill="${item.muted ? '#776f61' : '#2a251e'}" paint-order="stroke" stroke="#f7f3e9" stroke-width="1.2" stroke-opacity="0.7">${escapeXml(item.text)}</text>`
        })
        .join('')
    : ''

  const sectionMarkup = model.net.sections
    .map(
      section =>
        `<text x="${section.x}" y="${section.y}" text-anchor="middle" font-family="'Newsreader Variable', Georgia, serif" font-size="${(8 * labelScale).toFixed(2)}" font-style="italic" fill="#ff4d1f">${escapeXml(section.label)}</text>`,
    )
    .join('')

  const dimMarkup = showAnnotations
    ? model.net.dimensions
        .map(dim => {
          const horizontal = Math.abs(dim.y2 - dim.y1) < Math.abs(dim.x2 - dim.x1)
          const midX = (dim.x1 + dim.x2) / 2
          const midY = (dim.y1 + dim.y2) / 2
          const tick = 3
          if (horizontal) {
            return `
              <g class="pf-dim">
                <line x1="${dim.x1}" y1="${dim.y1}" x2="${dim.x2}" y2="${dim.y2}" stroke="#847a69" stroke-width="0.45"/>
                <line x1="${dim.x1}" y1="${dim.y1 - tick}" x2="${dim.x1}" y2="${dim.y1 + tick}" stroke="#847a69" stroke-width="0.45"/>
                <line x1="${dim.x2}" y1="${dim.y2 - tick}" x2="${dim.x2}" y2="${dim.y2 + tick}" stroke="#847a69" stroke-width="0.45"/>
                <text x="${midX}" y="${midY - 2.4}" text-anchor="middle" font-family="'Manrope Variable', sans-serif" font-size="${(4.1 * labelScale).toFixed(2)}" font-weight="650" letter-spacing="0.15" fill="#675f52" paint-order="stroke" stroke="#f7f3e9" stroke-width="1.4">${escapeXml(dim.label)}</text>
              </g>
            `
          }
          return `
            <g class="pf-dim">
              <line x1="${dim.x1}" y1="${dim.y1}" x2="${dim.x2}" y2="${dim.y2}" stroke="#847a69" stroke-width="0.45"/>
              <line x1="${dim.x1 - tick}" y1="${dim.y1}" x2="${dim.x1 + tick}" y2="${dim.y1}" stroke="#847a69" stroke-width="0.45"/>
              <line x1="${dim.x2 - tick}" y1="${dim.y2}" x2="${dim.x2 + tick}" y2="${dim.y2}" stroke="#847a69" stroke-width="0.45"/>
              <text x="${midX + 2.5}" y="${midY}" text-anchor="start" font-family="'Manrope Variable', sans-serif" font-size="${(4.1 * labelScale).toFixed(2)}" font-weight="650" letter-spacing="0.15" fill="#675f52" paint-order="stroke" stroke="#f7f3e9" stroke-width="1.4">${escapeXml(dim.label)}</text>
            </g>
          `
        })
        .join('')
    : ''

  const style = technical
    ? `<style>
        .pf-face-hit { cursor: pointer; outline: none; }
        .pf-face-hit:hover .pf-hover-line, .pf-face-hit:focus-visible .pf-hover-line { stroke-opacity: .72; }
        .pf-face-hit:focus-visible .pf-hover-line { stroke: #ff4d1f; stroke-opacity: 1; }
      </style>`
    : ''

  const background = technical
    ? `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#pf-tech-grid)"/>`
    : ''

  const widthAttr = forExport ? `${width.toFixed(2)}mm` : width.toFixed(2)
  const heightAttr = forExport ? `${height.toFixed(2)}mm` : height.toFixed(2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" width="${widthAttr}" height="${heightAttr}" role="img" aria-label="纸盒展开刀模图">
    <title>${escapeXml(project.name)} — ${escapeXml(model.name)}</title>
    ${style}
    <defs>${defs.join('')}</defs>
    ${background}
    <g transform="translate(${(-minX).toFixed(2)} ${(-minY).toFixed(2)})">
      <g data-layer="bleed">${bleedMarkup.join('')}</g>
      <g data-layer="artwork">${panelMarkup.join('')}</g>
      <g data-layer="folds">${foldMarkup}</g>
      <g data-layer="safe">${safeMarkup}</g>
      <g data-layer="hits">${hitMarkup.join('')}</g>
      ${labelMarkup}
      ${sectionMarkup}
      ${dimMarkup}
    </g>
  </svg>`
}

export function clearNetSvgCache(): void {
  dataUrlCache.clear()
}
