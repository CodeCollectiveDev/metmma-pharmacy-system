import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import TopBar from './TopBar.vue'

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/pos', component: { template: '<div />' } },
      { path: '/dashboard', component: { template: '<div />' } }
    ]
  })
  router.push(path)
  await router.isReady()
  return mount(TopBar, {
    props: { title: 'Test' },
    global: { plugins: [router], stubs: { NotificationsPanel: { template: '<div data-test="notifications" />' } } }
  })
}

describe('TopBar notifications', () => {
  it('does not render the notification bell on the Sell items screen', async () => {
    const w = await mountAt('/pos')
    expect(w.find('[data-test="notifications"]').exists()).toBe(false)
    w.unmount()
  })

  it('keeps the notification bell on other screens', async () => {
    const w = await mountAt('/dashboard')
    expect(w.find('[data-test="notifications"]').exists()).toBe(true)
    w.unmount()
  })
})
