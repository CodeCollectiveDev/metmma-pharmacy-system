import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { appFailure } from '@/composables/useFeedback'
import formFeedback from '@/directives/formFeedback'
const savedTheme = localStorage.getItem('metmma-theme')
document.documentElement.classList.toggle('dark', savedTheme === 'dark')
document.documentElement.style.colorScheme = savedTheme === 'dark' ? 'dark' : 'light'
const app = createApp(App)
app.directive('form-feedback', formFeedback)
app.config.errorHandler = () => { appFailure.value = 'Something did not load correctly. Your work is still here. Please open the page again.' }
app.use(createPinia())
app.use(router)
app.mount('#app')
