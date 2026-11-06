import { beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import CategorySelect from './CategorySelect.vue'
import api from '@/services/api/apiClient'

vi.mock('@/services/api/apiClient', () => ({ default: { get: vi.fn() } }))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

it('loads the category dropdown from the API and renders the categories', async () => {
  let resolveRequest
  api.get.mockReturnValue(new Promise(resolve => { resolveRequest = resolve }))
  const wrapper = mount(CategorySelect)
  await nextTick()
  expect(wrapper.text()).toContain('Loading categories…')
  resolveRequest({ data: { data: [{ id: 1, name: 'Antibiotics' }, { id: 2, name: 'Other' }] } })
  await flushPromises()
  expect(api.get).toHaveBeenCalledWith('/categories', { params: {} })
  expect(wrapper.findAll('option').map(option => option.text())).toEqual(['Choose a category', 'Antibiotics', 'Other'])
})

it('shows an error state and retries loading the categories', async () => {
  api.get.mockRejectedValueOnce(new Error('offline'))
  const wrapper = mount(CategorySelect)
  await flushPromises()
  expect(wrapper.text()).toContain('Categories could not load')
  api.get.mockResolvedValueOnce({ data: { data: [{ id: 3, name: 'Vitamins' }] } })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.findAll('option').map(option => option.text())).toContain('Vitamins')
})
