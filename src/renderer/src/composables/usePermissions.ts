// ─── Composable permissions ────────────────────────────────────────────────────
// Fournit un acces reactif aux permissions role-based depuis le store app.

import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { hasRole, canAccessModule, type Role } from '@/utils/permissions'

export function usePermissions() {
  const appStore = useAppStore()

  return {
    hasRole: (required: Role) => hasRole(appStore.userRole, required),
    canAccessModule: (mod: string) => canAccessModule(appStore.userRole, mod),
    isAdmin: computed(() => appStore.isAdmin),
    isTeacher: computed(() => appStore.isTeacher),
    isStaff: computed(() => appStore.isStaff),
    isStudent: computed(() => appStore.isStudent),
    userRole: computed(() => appStore.userRole),
  }
}
