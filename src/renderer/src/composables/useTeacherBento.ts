/**
 * useTeacherBento — gestion de la visibilité des tuiles du bento professeur.
 * État partagé (module-level) + persistance localStorage.
 */
import { ref } from 'vue'
import { LayoutDashboard, Percent, Edit3, Award, Wifi, Clock, MessageSquare, PlusCircle, Activity, CheckSquare } from 'lucide-vue-next'
import type { FunctionalComponent } from 'vue'

export interface TeacherTileDef {
  id:    string
  label: string
  icon:  FunctionalComponent
}

export const TEACHER_TILES: TeacherTileDef[] = [
  { id: 'focus',        label: 'Action urgente',  icon: LayoutDashboard },
  { id: 'stat-soumis',  label: 'Soumissions',     icon: Percent         },
  { id: 'stat-noter',   label: 'À noter',         icon: Edit3           },
  { id: 'stat-moyenne', label: 'Moyenne',         icon: Award           },
  { id: 'stat-online',  label: 'En ligne',        icon: Wifi            },
  { id: 'schedule',     label: 'Agenda',          icon: Clock           },
  { id: 'messages',     label: 'Messages',        icon: MessageSquare   },
  { id: 'actions',      label: 'Actions rapides', icon: PlusCircle      },
  { id: 'activity',     label: 'Activité récente',icon: Activity        },
  { id: 'todo',         label: 'Todo',            icon: CheckSquare     },
]

const STORAGE_KEY = 'teacher_bento_hidden'

function loadHidden(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return new Set(JSON.parse(saved) as string[])
  } catch { /* ignore */ }
  return new Set()
}

// État singleton partagé entre tous les composants qui importent ce composable
const hidden = ref<Set<string>>(loadHidden())

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden.value]))
}

export function useTeacherBento() {
  function isVisible(id: string) { return !hidden.value.has(id) }

  function toggleTile(id: string) {
    if (hidden.value.has(id)) hidden.value.delete(id)
    else                      hidden.value.add(id)
    hidden.value = new Set(hidden.value) // déclenche la réactivité
    persist()
  }

  function resetTiles() {
    hidden.value = new Set()
    localStorage.removeItem(STORAGE_KEY)
  }

  return { hidden, isVisible, toggleTile, resetTiles, allTiles: TEACHER_TILES }
}
