/**
 * useStudentBadges - systeme de badges gamification etudiants.
 * Calcule les badges a partir des donnees du store travaux.
 */
import { computed } from 'vue'
import { useTravauxStore } from '@/stores/travaux'

export interface Badge {
  id: string
  label: string
  emoji: string
  description: string
  earned: boolean
}

export function useStudentBadges() {
  const travauxStore = useTravauxStore()

  const badges = computed((): Badge[] => {
    const devoirs = travauxStore.devoirs
    const submitted = devoirs.filter(t => t.depot_id != null)
    const graded = devoirs.filter(t => t.note != null && t.note !== 'NA')
    const aGrades = graded.filter(t => t.note?.toUpperCase() === 'A')

    return [
      {
        id: 'first-submit',
        label: 'Premier rendu',
        emoji: '🎯',
        description: 'Déposer son premier devoir',
        earned: submitted.length >= 1,
      },
      {
        id: 'five-submits',
        label: 'Assidu',
        emoji: '📚',
        description: 'Déposer 5 devoirs',
        earned: submitted.length >= 5,
      },
      {
        id: 'ten-submits',
        label: 'Travailleur',
        emoji: '💪',
        description: 'Déposer 10 devoirs',
        earned: submitted.length >= 10,
      },
      {
        id: 'all-submitted',
        label: 'Zéro retard',
        emoji: '⚡',
        description: 'Tous les devoirs rendus a temps',
        earned: devoirs.length > 0 && devoirs.every(t => t.depot_id != null || t.requires_submission === 0),
      },
      {
        id: 'first-a',
        label: 'Excellence',
        emoji: '⭐',
        description: 'Obtenir sa première note A',
        earned: aGrades.length >= 1,
      },
      {
        id: 'three-a',
        label: 'Brillant',
        emoji: '🌟',
        description: 'Obtenir 3 notes A',
        earned: aGrades.length >= 3,
      },
      {
        id: 'graded',
        label: 'Évalué',
        emoji: '📝',
        description: 'Recevoir sa première note',
        earned: graded.length >= 1,
      },
      {
        id: 'half-done',
        label: 'Mi-parcours',
        emoji: '🏃',
        description: 'Rendre la moitié des devoirs',
        earned: devoirs.length > 0 && submitted.length >= Math.ceil(devoirs.length / 2),
      },
    ]
  })

  const earnedCount = computed(() => badges.value.filter(b => b.earned).length)
  const totalCount = computed(() => badges.value.length)

  return { badges, earnedCount, totalCount }
}
