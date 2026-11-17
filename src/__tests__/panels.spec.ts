import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PropertyPanel from '../components/PropertyPanel.vue'
import { useDesignerStore } from '../stores/designer'

describe('property panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('switches between structure, design and export tabs', async () => {
    const wrapper = mount(PropertyPanel)
    expect(wrapper.text()).toContain('盒型结构')

    await wrapper.find('[data-tab="design"]').trigger('click')
    expect(wrapper.text()).toContain('底色与表面')
    expect(wrapper.text()).toContain('整面图片')

    await wrapper.find('[data-tab="export"]').trigger('click')
    expect(wrapper.text()).toContain('交付印刷厂')
    expect(wrapper.text()).toContain('印刷 PDF')
  })

  it('changes box type from the structure tab', async () => {
    const wrapper = mount(PropertyPanel)
    const store = useDesignerStore()
    const mailer = wrapper.findAll('button').find(button => button.text().includes('飞机盒'))
    expect(mailer).toBeTruthy()
    await mailer!.trigger('click')
    expect(store.project.boxType).toBe('mailer')
  })
})
