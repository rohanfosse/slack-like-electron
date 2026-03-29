import { createRouter, createWebHashHistory } from 'vue-router'
import { hasRole, type Role } from '@/utils/permissions'

// Lazy-load toutes les vues pour reduire le bundle initial
const DashboardView = () => import('@/views/DashboardView.vue')
const MessagesView  = () => import('@/views/MessagesView.vue')
const DevoirsView   = () => import('@/views/DevoirsView.vue')
const DocumentsView = () => import('@/views/DocumentsView.vue')

// HashHistory evite les problemes de routing dans Electron
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           redirect: '/dashboard' },
    { path: '/dashboard',  component: DashboardView,  name: 'dashboard'  },
    { path: '/messages',   component: MessagesView,   name: 'messages'   },
    { path: '/devoirs',    component: DevoirsView,    name: 'devoirs'    },
    { path: '/travaux',    redirect: '/devoirs' },
    { path: '/documents',  component: DocumentsView,  name: 'documents'  },
    { path: '/live',       component: () => import('@/views/LiveView.vue'),   name: 'live'   },
    { path: '/rex',        component: () => import('@/views/RexView.vue'),   name: 'rex'    },
    { path: '/agenda',     component: () => import('@/views/AgendaView.vue'), name: 'agenda' },
    { path: '/fichiers',   component: () => import('@/views/FilesView.vue'),  name: 'fichiers', meta: { requiredRole: 'teacher' } },
    // Catch-all → redirect au dashboard
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

// ── Route guard : pages a acces restreint par role ──────────────────────────
router.beforeEach((to, _from, next) => {
  if (to.meta?.requiredRole) {
    // Verifier le role depuis localStorage (le store Pinia peut ne pas etre pret)
    try {
      const raw = localStorage.getItem('cc_session')
      const role = raw ? (JSON.parse(raw).type || 'student') : 'student'
      if (!hasRole(role, to.meta.requiredRole as Role)) {
        return next('/dashboard')
      }
    } catch { /* session corrompue */ }
  }
  next()
})

export default router
