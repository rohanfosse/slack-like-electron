import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { wireDemoMissionRouter } from './composables/useDemoMission'

// ── Fonts ───────────────────────────────────────────────────────────────────
// Plus Jakarta Sans (primaire, alignement landing) + Inter (--font-reading).
// On charge un CSS custom qui ne declare que les subsets latin / latin-ext
// au lieu de l'index.css fontsource (qui inclut cyrillic, greek, vietnamese).
// Cf. design-system/cursus/MASTER.md §2 et assets/css/fonts.css.
import '@css/fonts.css'

// ── CSS de base ─────────────────────────────────────────────────────────────
import '@css/base.css'
import '@css/layout.css'
import '@css/components.css'
import '@css/devoirs-shared.css'
import '@css/dashboard-shared.css'
import 'highlight.js/styles/atom-one-dark.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Mission tracker du mode demo : observe les routes pour cocher
// automatiquement les 5 etapes "decouverte de l'app". No-op hors demo.
// Branche avant le mount pour que le hook capture la 1re navigation.
wireDemoMissionRouter(router)

app.mount('#app')
