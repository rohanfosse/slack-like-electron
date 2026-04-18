/**
 * useLumenCollapsedState : persiste dans localStorage trois etats de la
 * sidebar Lumen :
 *   - collapsedKinds  : Set<LumenRepoKind>  → categories repliees
 *   - collapsedRepos  : Set<number>         → repos individuellement replies
 *   - openSections    : Record<repoId, ?section> → accordeon section par repo
 *
 * Chaque setter met a jour le localStorage avec try/catch silencieux pour
 * les modes prive / quota depasse.
 */
import { ref } from 'vue'
import type { LumenRepoKind } from '@/types'

const COLLAPSED_KINDS_KEY = 'lumen.sidebar.collapsedKinds'
const COLLAPSED_REPOS_KEY = 'lumen.sidebar.collapsedRepos'
const OPEN_SECTION_KEY    = 'lumen.sidebar.openSections'

export function useLumenCollapsedState(validKinds: readonly LumenRepoKind[]) {
  // ── Kinds ──────────────────────────────────────────────────────────────
  function loadKinds(): Set<LumenRepoKind> {
    try {
      const raw = localStorage.getItem(COLLAPSED_KINDS_KEY)
      if (!raw) return new Set()
      const parts = raw.split(',').filter((k): k is LumenRepoKind =>
        (validKinds as readonly string[]).includes(k),
      )
      return new Set(parts)
    } catch { return new Set() }
  }
  function saveKinds(set: Set<LumenRepoKind>) {
    try { localStorage.setItem(COLLAPSED_KINDS_KEY, Array.from(set).join(',')) } catch { /* noop */ }
  }
  const collapsedKinds = ref<Set<LumenRepoKind>>(loadKinds())
  function toggleKind(k: LumenRepoKind) {
    const next = new Set(collapsedKinds.value)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    collapsedKinds.value = next
    saveKinds(next)
  }
  function setKinds(set: Set<LumenRepoKind>) {
    collapsedKinds.value = set
    saveKinds(set)
  }

  // ── Repos ──────────────────────────────────────────────────────────────
  function loadRepos(): Set<number> {
    try {
      const raw = localStorage.getItem(COLLAPSED_REPOS_KEY)
      if (!raw) return new Set()
      return new Set(raw.split(',').map(Number).filter(Boolean))
    } catch { return new Set() }
  }
  function saveRepos(set: Set<number>) {
    try { localStorage.setItem(COLLAPSED_REPOS_KEY, Array.from(set).join(',')) } catch { /* noop */ }
  }
  const collapsedRepos = ref<Set<number>>(loadRepos())
  function toggleRepo(repoId: number) {
    const next = new Set(collapsedRepos.value)
    if (next.has(repoId)) next.delete(repoId)
    else next.add(repoId)
    collapsedRepos.value = next
    saveRepos(next)
  }

  // ── Sections accordion ──────────────────────────────────────────────────
  function loadOpenSections(): Record<number, string | null> {
    try {
      const raw = localStorage.getItem(OPEN_SECTION_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }
  function saveOpenSections(value: Record<number, string | null>) {
    try { localStorage.setItem(OPEN_SECTION_KEY, JSON.stringify(value)) } catch { /* noop */ }
  }
  const openSections = ref<Record<number, string | null>>(loadOpenSections())
  function toggleSection(repoId: number, sectionTitle: string) {
    const current = openSections.value[repoId]
    openSections.value = {
      ...openSections.value,
      [repoId]: current === sectionTitle ? null : sectionTitle,
    }
    saveOpenSections(openSections.value)
  }
  function isSectionOpen(repoId: number, sectionTitle: string): boolean {
    return openSections.value[repoId] === sectionTitle
  }
  function setSectionOpen(repoId: number, sectionTitle: string) {
    openSections.value = { ...openSections.value, [repoId]: sectionTitle }
    saveOpenSections(openSections.value)
  }

  return {
    collapsedKinds, toggleKind, setKinds,
    collapsedRepos, toggleRepo,
    openSections, toggleSection, isSectionOpen, setSectionOpen,
  }
}
