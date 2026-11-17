import type { Project } from '../types'
import { buildBoxModel } from '../boxes'
import { getMaterial } from '../materials'
import { formatDateStamp, slugify } from '../project'
import { buildNetSvg } from '../netSvg'
import { rasterizeNet } from './rasterizeNet'

export function exportFileBase(project: Project): string {
  return `paperform-${slugify(project.name)}-${formatDateStamp()}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface ExportResult {
  blob: Blob
  filename: string
}

export async function exportPdf(project: Project, revision: number): Promise<ExportResult> {
  const { jsPDF } = await import('jspdf')
  const model = buildBoxModel(project)
  const raster = rasterizeNet(project, model, revision, { dpi: 300, maxPx: 6000, includeAnnotations: false })
  const margin = 20
  const header = 28
  const pageW = Math.max(200, raster.bounds.width + margin * 2)
  const pageH = Math.max(240, raster.bounds.height + header + margin * 2)
  const orientation = pageW >= pageH ? 'landscape' : 'portrait'
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageW, pageH],
    compress: true,
  })

  const actualW = doc.internal.pageSize.getWidth()
  const actualH = doc.internal.pageSize.getHeight()
  const material = getMaterial(project.material)
  const dims = project.dimensions

  const headerText = (pageLabel: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(18, 18, 16)
    doc.text('PAPERFORM', margin, 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(110, 105, 94)
    doc.text(pageLabel, margin + 49, 14.6)
    doc.setDrawColor(215, 210, 198)
    doc.setLineWidth(0.2)
    doc.line(margin, 20, actualW - margin, 20)
    doc.setFontSize(6.5)
    doc.text(
      `${model.nameEn.toUpperCase()}  /  ${dims.length} x ${dims.width} x ${dims.height} MM  /  ${project.bleed} MM BLEED  /  ${material.en.toUpperCase()} ${project.thickness}MM  /  ${project.finish.toUpperCase()}`,
      margin,
      24.5,
    )
  }

  headerText('PRINT ARTWORK / 01 — 300 DPI')
  const availableW = actualW - margin * 2
  const availableH = actualH - header - margin * 2
  const fit = Math.min(1, availableW / raster.bounds.width, availableH / raster.bounds.height)
  const imageW = raster.bounds.width * fit
  const imageH = raster.bounds.height * fit
  const imageX = (actualW - imageW) / 2
  const imageY = header + 4
  doc.addImage(
    raster.canvas.toDataURL('image/jpeg', 0.94),
    'JPEG',
    imageX,
    imageY,
    imageW,
    imageH,
    undefined,
    'FAST',
  )

  const mark = 5
  doc.setDrawColor(18, 18, 16)
  doc.setLineWidth(0.22)
  for (const [x, y, sx, sy] of [
    [imageX, imageY, 1, 1],
    [imageX + imageW, imageY, -1, 1],
    [imageX, imageY + imageH, 1, -1],
    [imageX + imageW, imageY + imageH, -1, -1],
  ] as const) {
    doc.line(x, y, x + mark * sx, y)
    doc.line(x, y, x, y + mark * sy)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(126, 119, 105)
  doc.text(
    'Artwork is placed 1:1. Cut, crease and bleed lines are shown for reference. Confirm dieline with your printer before production.',
    margin,
    actualH - 10,
  )

  // Page 2 — vector dieline.
  doc.addPage([pageW, pageH], orientation)
  headerText('DIELINE / 02 — VECTOR')
  const contentW = actualW - margin * 2
  const contentH = actualH - header - margin * 2
  const netW = raster.bounds.width - 40
  const netH = raster.bounds.height - 40
  const scale = Math.min(1, contentW / raster.bounds.width, contentH / raster.bounds.height)
  const dx = (actualW - raster.bounds.width * scale) / 2
  const dy = header + 8
  const toX = (x: number) => dx + (x - raster.bounds.minX) * scale
  const toY = (y: number) => dy + (y - raster.bounds.minY) * scale

  doc.setLineWidth(0.25)
  doc.setDrawColor(20, 18, 14)
  for (const panel of model.net.panels) {
    for (let i = 0; i < panel.points.length; i += 1) {
      const a = panel.points[i]!
      const b = panel.points[(i + 1) % panel.points.length]!
      doc.line(toX(a.x), toY(a.y), toX(b.x), toY(b.y))
    }
  }

  doc.setDrawColor(43, 76, 255)
  doc.setLineDashPattern([2, 1.5], 0)
  for (const fold of model.net.folds) {
    doc.line(toX(fold.x1), toY(fold.y1), toX(fold.x2), toY(fold.y2))
  }
  doc.setLineDashPattern([], 0)

  if (project.bleed > 0) {
    const bleedX = toX(raster.bounds.minX + 20 - project.bleed)
    const bleedY = toY(raster.bounds.minY + 20 - project.bleed)
    const bleedW = (netW + project.bleed * 2) * scale
    const bleedH = (netH + project.bleed * 2) * scale
    doc.setDrawColor(196, 185, 165)
    doc.setLineWidth(0.2)
    doc.setLineDashPattern([1, 1.4], 0)
    doc.rect(bleedX, bleedY, bleedW, bleedH)
    doc.setLineDashPattern([], 0)
    doc.setFontSize(5)
    doc.setTextColor(150, 141, 124)
    doc.text('BLEED', bleedX + 1.5, bleedY + 3.2)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.4)
  doc.setTextColor(74, 68, 58)
  for (const label of model.net.labels) {
    if (!label.text) continue
    doc.text(label.text, toX(label.x), toY(label.y), { align: 'center' })
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5)
  doc.setTextColor(110, 103, 90)
  for (const dim of model.net.dimensions) {
    doc.text(dim.label, toX((dim.x1 + dim.x2) / 2), toY((dim.y1 + dim.y2) / 2) - 2, {
      align: 'center',
    })
  }

  const legendX = actualW - margin - 54
  const legendY = actualH - 15
  doc.setDrawColor(20, 18, 14)
  doc.setLineWidth(0.25)
  doc.line(legendX, legendY, legendX + 10, legendY)
  doc.text('CUT', legendX + 13, legendY + 1)
  doc.setDrawColor(43, 76, 255)
  doc.setLineDashPattern([2, 1.5], 0)
  doc.line(legendX + 25, legendY, legendX + 35, legendY)
  doc.setLineDashPattern([], 0)
  doc.text('CREASE', legendX + 38, legendY + 1)
  doc.setDrawColor(196, 185, 165)
  doc.setLineDashPattern([1, 1.4], 0)
  doc.line(legendX + 26, legendY + 4.5, legendX + 36, legendY + 4.5)
  doc.setLineDashPattern([], 0)
  doc.text('BLEED', legendX + 38, legendY + 5.5)

  doc.setFontSize(5.6)
  doc.setTextColor(126, 119, 105)
  doc.text(`SCALE 1:1  ·  NET ${Math.round(netW)} x ${Math.round(netH)} MM  ·  BLEED ${project.bleed} MM`, margin, actualH - 15)
  doc.text('DIELINE — VERIFY WITH PRINTER', margin, actualH - 10)

  const blob = doc.output('blob')
  return { blob, filename: `${exportFileBase(project)}-print.pdf` }
}

export async function exportPng(project: Project, revision: number): Promise<ExportResult> {
  const model = buildBoxModel(project)
  const raster = rasterizeNet(project, model, revision, {
    dpi: 300,
    maxPx: 8000,
    background: '#fbf8f1',
    includeAnnotations: true,
  })
  const blob = await new Promise<Blob>((resolve, reject) => {
    raster.canvas.toBlob(value => {
      if (value) resolve(value)
      else reject(new Error('PNG 编码失败'))
    }, 'image/png')
  })
  return { blob, filename: `${exportFileBase(project)}-dieline.png` }
}

export function exportSvg(project: Project, revision: number): ExportResult {
  const model = buildBoxModel(project)
  const svg = buildNetSvg(model, project, revision, {
    showBleed: true,
    showAnnotations: true,
    bleed: project.bleed,
    technical: false,
    forExport: true,
    selectedFace: null,
  })
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], {
    type: 'image/svg+xml;charset=utf-8',
  })
  return { blob, filename: `${exportFileBase(project)}-dieline.svg` }
}

export function exportJson(project: Project): ExportResult {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  return { blob, filename: `${exportFileBase(project)}.json` }
}
