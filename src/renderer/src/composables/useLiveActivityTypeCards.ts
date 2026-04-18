/**
 * useLiveActivityTypeCards : catalogue des types d'activite Live (cards)
 * regroupes par categorie (spark/pulse/code/board) + gestion du filtre
 * locked/default pour le formulaire de creation.
 *
 * Si `lockedCategory` : on ne montre que cette categorie (sauf en edition
 * ou tous les types sont accessibles).
 * Si `defaultCategory` : la categorie est hissee en premiere position.
 */
import { computed, watch, type Component } from 'vue'
import type { Ref } from 'vue'
import {
  ListChecks, ToggleLeft, Type, Link2, Hash,
  Code2, StickyNote, MessageSquare, Cloud, Star, FileText,
  BarChart, Smile, ArrowUpDown, Grid3X3, TextCursorInput,
} from 'lucide-vue-next'
import { ACTIVITY_CATEGORIES, type ActivityCategory } from '@/utils/liveActivity'
import type { LiveV2ActivityType } from '@/types'

export interface ActivityTypeCard {
  id: LiveV2ActivityType
  label: string
  icon: Component
  desc: string
  category: ActivityCategory
}

export const LIVE_ACTIVITY_TYPE_CARDS: ActivityTypeCard[] = [
  // Spark
  { id: 'qcm',              label: 'QCM',              icon: ListChecks,      desc: 'Choix multiple',         category: 'spark' },
  { id: 'vrai_faux',        label: 'Vrai / Faux',      icon: ToggleLeft,      desc: 'Question binaire',       category: 'spark' },
  { id: 'reponse_courte',   label: 'Reponse courte',   icon: Type,            desc: 'Texte libre note',       category: 'spark' },
  { id: 'association',      label: 'Association',      icon: Link2,           desc: 'Relier les paires',      category: 'spark' },
  { id: 'estimation',       label: 'Estimation',       icon: Hash,            desc: 'Reponse numerique',      category: 'spark' },
  { id: 'texte_a_trous',    label: 'Texte a trous',    icon: TextCursorInput, desc: 'Remplir les blancs',     category: 'spark' },
  { id: 'tri',              label: 'Tri (ordre)',      icon: ArrowUpDown,     desc: "Remettre dans l'ordre",  category: 'spark' },
  // Pulse
  { id: 'sondage_libre',    label: 'Sondage libre',    icon: MessageSquare,   desc: 'Texte libre anonyme',    category: 'pulse' },
  { id: 'nuage',            label: 'Nuage de mots',    icon: Cloud,           desc: 'Mots-cles anonymes',     category: 'pulse' },
  { id: 'echelle',          label: 'Echelle',          icon: Star,            desc: 'Note 1 a N',             category: 'pulse' },
  { id: 'question_ouverte', label: 'Question ouverte', icon: FileText,        desc: 'Reponse longue',         category: 'pulse' },
  { id: 'sondage',          label: 'Sondage',          icon: BarChart,        desc: 'Choix parmi options',    category: 'pulse' },
  { id: 'humeur',           label: 'Humeur',           icon: Smile,           desc: 'Emoji ressenti',         category: 'pulse' },
  { id: 'priorite',         label: 'Priorite',         icon: ArrowUpDown,     desc: 'Classer des items',      category: 'pulse' },
  { id: 'matrice',          label: 'Matrice',          icon: Grid3X3,         desc: 'Noter des criteres',     category: 'pulse' },
  // Code / Board
  { id: 'live_code',        label: 'Live Code',        icon: Code2,           desc: 'Coder en direct',        category: 'code' },
  { id: 'board',            label: 'Tableau',          icon: StickyNote,      desc: 'Post-its collaboratifs', category: 'board' },
  { id: 'message_wall',     label: 'Mur de messages',  icon: MessageSquare,   desc: 'Messages + likes',       category: 'board' },
]

export interface UseTypeCardsArgs {
  isEditing: boolean
  lockedCategory: Ref<ActivityCategory | null | undefined>
  defaultCategory: Ref<ActivityCategory | null | undefined>
  activityType: Ref<LiveV2ActivityType>
}

export function useLiveActivityTypeCards(args: UseTypeCardsArgs) {
  const categories = computed(() => {
    const grouped = new Map<ActivityCategory, ActivityTypeCard[]>()
    for (const card of LIVE_ACTIVITY_TYPE_CARDS) {
      if (!grouped.has(card.category)) grouped.set(card.category, [])
      grouped.get(card.category)!.push(card)
    }
    let all = [...grouped.entries()].map(([key, cards]) => ({
      key,
      meta: ACTIVITY_CATEGORIES[key],
      cards,
    }))
    if (args.lockedCategory.value && !args.isEditing) {
      return all.filter((c) => c.key === args.lockedCategory.value)
    }
    if (args.defaultCategory.value) {
      const idx = all.findIndex((c) => c.key === args.defaultCategory.value)
      if (idx > 0) {
        const [cat] = all.splice(idx, 1)
        all.unshift(cat)
      }
    }
    return all
  })

  // Si la categorie verrouillee change, s'assurer que activityType y appartient.
  watch(() => args.lockedCategory.value, (locked) => {
    if (!locked || args.isEditing) return
    const allowed = LIVE_ACTIVITY_TYPE_CARDS.filter((c) => c.category === locked).map((c) => c.id)
    if (allowed.length && !allowed.includes(args.activityType.value)) {
      args.activityType.value = allowed[0]
    }
  }, { immediate: true })

  return { typeCards: LIVE_ACTIVITY_TYPE_CARDS, categories }
}
