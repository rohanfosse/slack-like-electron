// ─── Point d'entrée web — charge le shim window.api puis monte Vue ────────────
import './api-shim'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '../renderer/src/router'
import App from '../renderer/src/App.vue'

import '../../renderer/css/base.css'
import '../../renderer/css/layout.css'
import '../../renderer/css/components.css'
import 'highlight.js/styles/atom-one-dark.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
