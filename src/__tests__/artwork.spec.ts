import { describe, expect, it } from 'vitest'
import { hexToRgb, patternTileMm, textureCacheKey, rgba } from '../core/artworkCanvas'

describe('artwork helpers', () => {
  it('parses hex colors', () => {
    expect(hexToRgb('#ff4d1f')).toEqual({ r: 255, g: 77, b: 31 })
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(rgba('#ff4d1f', 0.5)).toBe('rgba(255,77,31,0.5)')
  })

  it('uses stable pattern physical sizes', () => {
    expect(patternTileMm('grid')).toBe(10)
    expect(patternTileMm('dots')).toBe(8)
    expect(patternTileMm('none')).toBe(0)
  })

  it('builds a deterministic texture cache key', () => {
    expect(textureCacheKey('front', 180, 60, 4)).toBe('front:180x60:4')
  })
})
