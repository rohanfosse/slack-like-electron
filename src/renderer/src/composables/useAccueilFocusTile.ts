/**
 * useAccueilFocusTile : calcule l'etat de la "focus tile" de l'accueil prof.
 *
 * Priorite descendante :
 *   1. Rendus a noter        → urgency critical/warning selon count
 *   2. Deadline dans 24h     → urgency critical/warning (du action)
 *   3. Brouillons oublies    → urgency normal
 *   4. Sinon "Tout est a jour" → urgency clear
 *
 * Le parent fournit aNoterCount, actionItems (pour grade/deadline), et les
 * forgottenDrafts. Il ecoute aussi les evenements `publishDraft` pour les
 * brouillons isoles.
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { GanttRow } from '@/composables/useDashboardTeacher'

export type FocusUrgency = 'critical' | 'warning' | 'normal' | 'clear'
export type FocusType = 'grade' | 'deadline' | 'draft' | 'clear'

export interface FocusActionItem {
  id: string
  type: string
  title: string
  subtitle: string
  urgency: string
  action: () => void
}

export interface FocusState {
  type: FocusType
  urgency: FocusUrgency
  title: string
  subtitle: string
  actionLabel: string
  action: (() => void) | null
}

export interface UseAccueilFocusTileArgs {
  aNoterCount: Ref<number>
  actionItems: Ref<FocusActionItem[]>
  forgottenDrafts: Ref<GanttRow[]>
  onPublishSingleDraft: (id: number) => void
}

export function useAccueilFocusTile(args: UseAccueilFocusTileArgs) {
  const state = computed<FocusState>(() => {
    // 1. Ungraded submissions
    if (args.aNoterCount.value > 0) {
      const gradeAction = args.actionItems.value.find((a) => a.type === 'grade')
      return {
        type: 'grade',
        urgency: args.aNoterCount.value >= 10 ? 'critical' : 'warning',
        title: `${args.aNoterCount.value} rendu${args.aNoterCount.value > 1 ? 's' : ''} a noter`,
        subtitle: gradeAction?.subtitle ?? 'Des travaux attendent votre evaluation',
        actionLabel: 'Corriger',
        action: gradeAction?.action ?? null,
      }
    }

    // 2. Deadline within 24h
    const deadlineAction = args.actionItems.value.find((a) => a.type === 'deadline')
    if (deadlineAction) {
      return {
        type: 'deadline',
        urgency: deadlineAction.urgency === 'critical' ? 'critical' : 'warning',
        title: deadlineAction.title,
        subtitle: deadlineAction.subtitle,
        actionLabel: 'Rappeler',
        action: deadlineAction.action,
      }
    }

    // 3. Forgotten drafts
    if (args.forgottenDrafts.value.length > 0) {
      const count = args.forgottenDrafts.value.length
      return {
        type: 'draft',
        urgency: 'normal',
        title: `${count} brouillon${count > 1 ? 's' : ''} non publie${count > 1 ? 's' : ''}`,
        subtitle: "Des devoirs attendent d'etre publies",
        actionLabel: 'Publier',
        action: count === 1
          ? () => args.onPublishSingleDraft(args.forgottenDrafts.value[0].id)
          : null,
      }
    }

    // 4. All clear
    return {
      type: 'clear',
      urgency: 'clear',
      title: 'Tout est a jour',
      subtitle: 'Aucune action urgente requise',
      actionLabel: '',
      action: null,
    }
  })

  const bgClass = computed(() => {
    switch (state.value.urgency) {
      case 'critical': return 'focus--critical'
      case 'warning':  return 'focus--warning'
      case 'normal':   return 'focus--normal'
      case 'clear':    return 'focus--clear'
      default:         return 'focus--normal'
    }
  })

  return { state, bgClass }
}
