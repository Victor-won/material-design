import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesignerStore } from '../stores/designer'

describe('workspace view toggles', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with all three views and hides one at a time', () => {
    const store = useDesignerStore()
    expect(store.visibleViewCount()).toBe(3)
    store.toggleView('properties')
    expect(store.ui.showProperties).toBe(false)
    expect(store.visibleViewCount()).toBe(2)
    store.toggleView('net')
    expect(store.ui.showNet).toBe(false)
    expect(store.visibleViewCount()).toBe(1)
    store.toggleView('stage')
    expect(store.ui.showStage).toBe(true)
    expect(store.visibleViewCount()).toBe(1)
    expect(store.ui.toasts.at(-1)?.text).toContain('至少保留')
  })

  it('focuses a single view and can reopen properties', () => {
    const store = useDesignerStore()
    store.focusView('net')
    expect(store.ui.showNet).toBe(true)
    expect(store.ui.showStage).toBe(false)
    expect(store.ui.showProperties).toBe(false)
    store.showPropertiesPanel()
    expect(store.ui.showProperties).toBe(true)
    expect(store.visibleViewCount()).toBe(2)
  })
})
