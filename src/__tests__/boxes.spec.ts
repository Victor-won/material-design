import { describe, expect, it } from 'vitest'
import { buildBoxModel } from '../core/boxes'
import { createDefaultProject } from '../core/project'
import { BOX_FACE_IDS } from '../core/materials'
import type { BoxType } from '../core/types'

const types: BoxType[] = ['tuck', 'mailer', 'lidbase']

describe.each(types)('%s box model', type => {
  const project = { ...createDefaultProject(), boxType: type }
  const model = buildBoxModel(project)

  it('builds a complete dieline', () => {
    expect(model.net.width).toBeGreaterThan(100)
    expect(model.net.height).toBeGreaterThan(100)
    expect(model.net.panels.length).toBeGreaterThan(4)
    expect(model.net.folds.length).toBeGreaterThan(3)
    expect(model.net.panels.some(panel => panel.kind === 'glue')).toBe(true)
    expect(model.faces.length).toBeGreaterThanOrEqual(6)
    expect(model.net.dimensions.length).toBeGreaterThan(1)
  })

  it('has valid unique face ids', () => {
    const ids = model.faces.map(face => face.faceId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(model.faceInfo.map(face => face.id)).toEqual(BOX_FACE_IDS[type])
  })

  it('keeps all geometry finite', () => {
    const values = model.faces.flatMap(face => [
      face.width,
      face.height,
      ...face.position,
      ...face.rotation,
    ])
    expect(values.every(Number.isFinite)).toBe(true)
    expect(model.net.panels.every(panel => panel.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))).toBe(true)
  })
})

it('mailer exposes a lid hinge group', () => {
  const model = buildBoxModel({ ...createDefaultProject(), boxType: 'mailer' })
  expect(model.groups).toHaveLength(1)
  expect(model.groups[0].id).toBe('lid')
  expect(model.faces.filter(face => face.group === 'lid').length).toBeGreaterThan(3)
})

it('lidbase renders base and lid sections', () => {
  const model = buildBoxModel({ ...createDefaultProject(), boxType: 'lidbase' })
  expect(model.net.sections.map(section => section.label)).toContain('BASE / 盒身')
  expect(model.net.sections.map(section => section.label)).toContain('LID / 盒盖')
  expect(model.faceInfo.map(face => face.id)).toContain('lidTop')
})

it('dimensions affect the generated dieline', () => {
  const base = createDefaultProject()
  const bigger = { ...base, dimensions: { length: 240, width: 120, height: 80 } }
  const a = buildBoxModel(base)
  const b = buildBoxModel(bigger)
  expect(b.net.width).toBeGreaterThan(a.net.width)
  expect(b.net.height).toBeGreaterThan(a.net.height)
})
