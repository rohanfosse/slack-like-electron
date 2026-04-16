/**
 * useLiveTemplates : persiste des modeles de sessions Live dans localStorage.
 * Chaque modele = un tableau d'activites (sans les IDs / timestamps) qu'on peut
 * pousser vers une session neuve en une fois.
 */
import { ref, computed } from 'vue'
import type { LiveActivity } from '@/types'

const STORAGE_KEY = 'cursus:live:templates'
const MAX_TEMPLATES = 30

export interface LiveTemplate {
  id: string
  name: string
  createdAt: string
  activities: TemplatedActivity[]
}

type TemplatedActivity = Pick<LiveActivity,
  'type' | 'title' | 'options' | 'max_words' | 'max_rating'
  | 'timer_seconds' | 'correct_answers' | 'language'
>

function readAll(): LiveTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr as LiveTemplate[] : []
  } catch { return [] }
}

function writeAll(templates: LiveTemplate[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.slice(0, MAX_TEMPLATES))) }
  catch { /* quota / private mode */ }
}

function activityToTemplate(a: LiveActivity): TemplatedActivity {
  return {
    type: a.type,
    title: a.title,
    options: a.options ?? null,
    max_words: a.max_words,
    max_rating: a.max_rating,
    timer_seconds: a.timer_seconds,
    correct_answers: a.correct_answers ?? null,
    language: a.language ?? null,
  }
}

export function useLiveTemplates() {
  const templates = ref<LiveTemplate[]>(readAll())

  function save(name: string, activities: LiveActivity[]): LiveTemplate | null {
    const trimmed = name.trim()
    if (!trimmed || !activities.length) return null
    const template: LiveTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed.slice(0, 80),
      createdAt: new Date().toISOString(),
      activities: activities.map(activityToTemplate),
    }
    templates.value = [template, ...templates.value].slice(0, MAX_TEMPLATES)
    writeAll(templates.value)
    return template
  }

  function remove(id: string): boolean {
    const next = templates.value.filter(t => t.id !== id)
    if (next.length === templates.value.length) return false
    templates.value = next
    writeAll(templates.value)
    return true
  }

  function rename(id: string, newName: string): boolean {
    const trimmed = newName.trim()
    if (!trimmed) return false
    const idx = templates.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    templates.value = [
      ...templates.value.slice(0, idx),
      { ...templates.value[idx], name: trimmed.slice(0, 80) },
      ...templates.value.slice(idx + 1),
    ]
    writeAll(templates.value)
    return true
  }

  function get(id: string): LiveTemplate | null {
    return templates.value.find(t => t.id === id) ?? null
  }

  return {
    templates: computed(() => templates.value),
    save, remove, rename, get,
  }
}
