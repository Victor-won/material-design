import { describe, expect, it } from 'vitest'
import {
  createDefaultProject,
  enableFaceOverride,
  formatDateStamp,
  resolveArtwork,
  slugify,
  syncFaceToGlobal,
  withArtworkFor,
} from '../core/project'
import { validateProject } from '../core/validation'

describe('project artwork inheritance', () => {
  it('inherits global artwork until an override is enabled', () => {
    let project = createDefaultProject()
    project = withArtworkFor(project, 'global', artwork => ({ ...artwork, color: '#112233' }))
    expect(resolveArtwork(project, 'front').color).toBe('#112233')

    project = enableFaceOverride(project, 'front')
    project = withArtworkFor(project, 'front', artwork => ({ ...artwork, color: '#ff0000' }))
    expect(resolveArtwork(project, 'front').color).toBe('#ff0000')
    expect(resolveArtwork(project, 'back').color).toBe('#112233')
    expect(project.faces.front?.useGlobal).toBe(false)
  })

  it('syncs the current face to every face', () => {
    let project = createDefaultProject()
    project = enableFaceOverride(project, 'front')
    project = withArtworkFor(project, 'front', artwork => ({ ...artwork, color: '#abcdef' }))
    project = syncFaceToGlobal(project, 'front')
    expect(project.globalDesign.color).toBe('#abcdef')
    expect(resolveArtwork(project, 'back').color).toBe('#abcdef')
    expect(project.faces.front?.useGlobal).toBe(true)
  })

  it('keeps per-face layer edits isolated', () => {
    let project = createDefaultProject()
    project = enableFaceOverride(project, 'left')
    project = withArtworkFor(project, 'left', artwork => ({
      ...artwork,
      layers: [
        ...artwork.layers,
        {
          id: 'test-layer',
          type: 'text',
          name: 'Test',
          visible: true,
          x: 50,
          y: 50,
          rotation: 0,
          opacity: 1,
          text: 'LEFT ONLY',
          fontSize: 8,
          fontFamily: 'manrope',
          weight: 500,
          color: '#000000',
          letterSpacing: 0,
          lineHeight: 1,
          align: 'center',
        },
      ],
    }))
    expect(project.faces.left?.artwork.layers.length).toBe(4)
    expect(resolveArtwork(project, 'front').layers.length).toBe(3)
  })
})

describe('project validation', () => {
  it('round-trips the default project', () => {
    const project = createDefaultProject()
    const valid = validateProject(JSON.parse(JSON.stringify(project)))
    expect(valid.boxType).toBe('tuck')
    expect(valid.dimensions.length).toBe(180)
  })

  it('rejects malformed project data', () => {
    expect(() => validateProject({ schemaVersion: 99 })).toThrow(/schemaVersion/)
    expect(() => validateProject({ schemaVersion: 1, boxType: 'nope' })).toThrow(/盒型/)
  })

  it('clamps dimensions into the supported range', () => {
    const project = JSON.parse(JSON.stringify(createDefaultProject()))
    project.dimensions.length = 900
    const valid = validateProject(project)
    expect(valid.dimensions.length).toBe(600)
  })
})

describe('naming helpers', () => {
  it('creates safe filenames', () => {
    expect(slugify('  My Carton / 01  ')).toBe('my-carton-01')
    expect(slugify('纸盒设计')).toBe('纸盒设计')
    expect(slugify('///')).toBe('carton')
  })

  it('formats a stable date stamp', () => {
    expect(formatDateStamp(new Date(2026, 10, 17))).toBe('20261117')
  })
})
