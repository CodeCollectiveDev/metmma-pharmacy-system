import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { appFailure } from '@/composables/useFeedback'
const app = createApp(App)
app.config.errorHandler = () => { appFailure.value = 'Something did not load correctly. Your work is still here. Please open the page again.' }
app.use(createPinia())
app.use(router)
app.mount('#app')
