import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

import { syncWorker } from './services/sync/syncWorker'

// Start Background Sync
syncWorker.start();

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
