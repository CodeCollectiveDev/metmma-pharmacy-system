import { config } from '@vue/test-utils'
import formFeedback from './directives/formFeedback'

// DOM tests must use browser storage rather than Node's separate native storage.
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: window.localStorage })
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: window.sessionStorage })
config.global.directives['form-feedback'] = formFeedback
config.global.stubs.RouterLink = { props: ['to'], template: '<a><slot /></a>' }
