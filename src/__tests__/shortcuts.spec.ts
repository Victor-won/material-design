import { describe, expect, it } from 'vitest'
import { isEditableTarget } from '../core/shortcuts'

describe('keyboard shortcut guards', () => {
  it('ignores inputs, textareas and selects', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true)
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true)
    expect(isEditableTarget(document.createElement('select'))).toBe(true)
  })

  it('allows shortcuts on ordinary elements', () => {
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})
