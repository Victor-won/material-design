import { beforeAll, describe, expect, it } from 'vitest'
import { buildNetSvg } from '../core/netSvg'
import { buildBoxModel } from '../core/boxes'
import { createDefaultProject } from '../core/project'

const fakeContext = () =>
  new Proxy(
    { measureText: () => ({ width: 12 }) },
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string | symbol, unknown>)[prop]
        return () => undefined
      },
      set() {
        return true
      },
    },
  )

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => fakeContext(),
    configurable: true,
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: () => 'data:image/jpeg;base64,ZHVtbXk=',
    configurable: true,
  })
})

describe('net svg serializer', () => {
  it('emits dieline, folds, bleed and face hit targets', () => {
    const project = createDefaultProject()
    const model = buildBoxModel(project)
    const svg = buildNetSvg(model, project, 1, {
      selectedFace: 'front',
      showBleed: true,
      showAnnotations: true,
    })
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('data-net-width=')
    expect(svg).toContain('data-net-height=')
    expect(svg).toContain('data-face="front"')
    expect(svg).toContain('data-fold="true"')
    expect(svg).toContain('stroke-dasharray')
    expect(svg).toContain('data-bleed="true"')
    expect(svg).toContain('data-selected="true"')
    expect(svg).toContain('data:image/jpeg')
  })

  it('escapes project names in the exported title', () => {
    const project = { ...createDefaultProject(), name: 'A < B & "C"' }
    const model = buildBoxModel(project)
    const svg = buildNetSvg(model, project, 1)
    expect(svg).toContain('A &lt; B &amp; &quot;C&quot;')
  })
})
