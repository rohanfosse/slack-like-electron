// ─── Composable : frise chronologique / timeline ─────────────────────────────
import { ref, computed } from 'vue'
import { useRouter }       from 'vue-router'
import { useAppStore }     from '@/stores/app'
import { useModalsStore }  from '@/stores/modals'
import { useTravauxStore } from '@/stores/travaux'
import { parseCategoryIcon } from '@/utils/categoryIcon'
import { formatDate }      from '@/utils/date'
import { FRISE_DEFAULT_SPAN_DAYS, PROJECT_COLORS } from '@/constants'
import type { Component, Ref } from 'vue'
import type { GanttRow }   from './useDashboardTeacher'

// ── Types ────────────────────────────────────────────────────────────────────
export interface FriseMilestone {
  id: number; title: string; type: string; deadline: string; published: boolean; done: boolean
}
export interface FriseProject {
  key: string; label: string; icon: Component | null; milestones: FriseMilestone[]
}
export interface FrisePromo {
  name: string; color: string; projects: FriseProject[]
}

export interface EnrichedMilestone extends FriseMilestone {
  projectKey: string; projectLabel: string; color: string
}

export interface DayGroup {
  dateKey: string       // "2026-03-21"
  deadline: string      // ISO string du premier
  items: EnrichedMilestone[]
  mainColor: string     // couleur du premier item
  hasMultipleProjects: boolean
}

export interface PositionedGroup extends DayGroup {
  pct: number
  offsetY: number
}

export function buildProjectColorMap(promos: FrisePromo[]): Map<string, string> {
  const map = new Map<string, string>()
  const allProjects = new Set<string>()
  for (const promo of promos) {
    for (const proj of promo.projects) allProjects.add(proj.key)
  }
  let i = 0
  for (const key of allProjects) {
    map.set(key, PROJECT_COLORS[i % PROJECT_COLORS.length])
    i++
  }
  return map
}

export function flattenMilestones(promos: FrisePromo[], colorMap: Map<string, string>, excludePast = true): EnrichedMilestone[] {
  const now = Date.now()
  const all: EnrichedMilestone[] = []
  for (const promo of promos) {
    for (const proj of promo.projects) {
      const color = colorMap.get(proj.key) ?? '#6366F1'
      for (const ms of proj.milestones) {
        if (excludePast && new Date(ms.deadline).getTime() < now) continue
        all.push({ ...ms, projectKey: proj.key, projectLabel: proj.label, color })
      }
    }
  }
  return all.sort((a, b) => a.deadline.localeCompare(b.deadline))
}

export function groupByDay(milestones: EnrichedMilestone[]): DayGroup[] {
  const map = new Map<string, EnrichedMilestone[]>()
  for (const ms of milestones) {
    const dateKey = ms.deadline.slice(0, 10)
    if (!map.has(dateKey)) map.set(dateKey, [])
    map.get(dateKey)!.push(ms)
  }
  return Array.from(map.entries())
    .map(([dateKey, items]) => ({
      dateKey,
      deadline: items[0].deadline,
      items,
      mainColor: items[0].color,
      hasMultipleProjects: items.some(item => item.projectKey !== items[0].projectKey),
    }))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}

const OVERLAP_THRESHOLD_PCT = 5
const VERTICAL_OFFSETS_PX = [-50, -30, -10, 10, 30, 50]

export function positionGroups(
  groups: DayGroup[],
  milestoneLeftFn: (deadline: string) => string,
): PositionedGroup[] {
  const positioned = groups.map(g => ({
    ...g,
    pct: parseFloat(milestoneLeftFn(g.deadline)) || 0,
    offsetY: 0,
  }))
  positioned.sort((a, b) => a.pct - b.pct)
  let level = 0
  for (let i = 1; i < positioned.length; i++) {
    if (Math.abs(positioned[i].pct - positioned[i - 1].pct) < OVERLAP_THRESHOLD_PCT) {
      level = (level + 1) % VERTICAL_OFFSETS_PX.length
      positioned[i].offsetY = VERTICAL_OFFSETS_PX[level]
    } else {
      level = 0
      positioned[i].offsetY = 0
    }
  }
  return positioned
}

export function useFrise(ganttFiltered: Ref<GanttRow[]>) {
  const appStore     = useAppStore()
  const modals       = useModalsStore()
  const travauxStore = useTravauxStore()
  const router       = useRouter()

  const friseOffset  = ref(0)
  const friseDragging = ref(false)
  const friseSpanDays = ref(FRISE_DEFAULT_SPAN_DAYS)
  let _friseDragStart = 0

  function setFriseZoom(days: number) {
    friseSpanDays.value = days
  }

  // ── Date range ────────────────────────────────────────────────────────────
  const ganttDateRange = computed(() => {
    const rows = (appStore.isTeacher ? ganttFiltered.value : travauxStore.devoirs) as { deadline: string }[]
    if (!rows.length) return null
    const center = Date.now() + friseOffset.value * 86_400_000
    const halfSpan = (friseSpanDays.value / 2) * 86_400_000
    return { start: new Date(center - halfSpan), end: new Date(center + halfSpan) }
  })

  // ── Interaction ───────────────────────────────────────────────────────────
  function onFriseWheel(e: WheelEvent) {
    e.preventDefault()
    friseOffset.value += e.deltaY > 0 ? 14 : -14
  }

  function onFriseDragStart(e: MouseEvent) {
    friseDragging.value = true
    _friseDragStart = e.clientX
  }
  function onFriseDragMove(e: MouseEvent) {
    if (!friseDragging.value) return
    const diff = _friseDragStart - e.clientX
    if (Math.abs(diff) > 10) {
      friseOffset.value += diff > 0 ? 7 : -7
      _friseDragStart = e.clientX
    }
  }
  function onFriseDragEnd() { friseDragging.value = false }

  // ── Time axis (adaptatif : jours pour semaine, semaines pour mois, mois sinon)
  const ganttMonths = computed(() => {
    const r = ganttDateRange.value
    if (!r) return []
    const total = r.end.getTime() - r.start.getTime()
    const ticks: { label: string; left: number }[] = []
    const spanDays = friseSpanDays.value

    if (spanDays <= 14) {
      // Vue semaine : un tick par jour
      let d = new Date(r.start)
      d.setHours(0, 0, 0, 0)
      while (d <= r.end) {
        ticks.push({
          label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          left: Math.max(0, (d.getTime() - r.start.getTime()) / total * 100),
        })
        d = new Date(d.getTime() + 86_400_000)
      }
    } else if (spanDays <= 45) {
      // Vue mois : un tick par semaine (lundi)
      let d = new Date(r.start)
      d.setDate(d.getDate() - d.getDay() + 1) // lundi
      while (d <= r.end) {
        ticks.push({
          label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          left: Math.max(0, (d.getTime() - r.start.getTime()) / total * 100),
        })
        d = new Date(d.getTime() + 7 * 86_400_000)
      }
    } else {
      // Vue trimestre/année : un tick par mois
      let d = new Date(r.start.getFullYear(), r.start.getMonth(), 1)
      while (d <= r.end) {
        ticks.push({
          label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          left: Math.max(0, (d.getTime() - r.start.getTime()) / total * 100),
        })
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      }
    }
    return ticks
  })

  const ganttTodayPct = computed(() => {
    const r = ganttDateRange.value
    if (!r) return -1
    return (Date.now() - r.start.getTime()) / (r.end.getTime() - r.start.getTime()) * 100
  })

  // ── Teacher frise ─────────────────────────────────────────────────────────
  const teacherFrise = computed((): FrisePromo[] => {
    const promoMap = new Map<string, { color: string; projects: Map<string, FriseMilestone[]> }>()
    for (const t of ganttFiltered.value) {
      const pName  = t.promo_name  || 'Sans promo'
      const pColor = t.promo_color || '#4a90d9'
      const pKey   = t.category?.trim() || 'Sans projet'
      if (!promoMap.has(pName)) promoMap.set(pName, { color: pColor, projects: new Map() })
      const promo = promoMap.get(pName)!
      if (!promo.projects.has(pKey)) promo.projects.set(pKey, [])
      promo.projects.get(pKey)!.push({
        id: t.id, title: t.title, type: t.type, deadline: t.deadline,
        published: Boolean(t.published),
        done: t.students_total > 0 && (t.depots_count ?? 0) >= t.students_total,
      })
    }
    return Array.from(promoMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, { color, projects }]) => ({
        name, color,
        projects: Array.from(projects.entries())
          .map(([key, milestones]) => ({
            key, label: parseCategoryIcon(key).label, icon: parseCategoryIcon(key).icon,
            milestones: milestones.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
          }))
          .sort((a, b) => {
            const am = a.milestones[0]?.deadline ?? ''; const bm = b.milestones[0]?.deadline ?? ''
            return am.localeCompare(bm)
          }),
      }))
  })

  const studentFrise = computed((): FrisePromo[] => {
    const projMap = new Map<string, FriseMilestone[]>()
    for (const t of travauxStore.devoirs) {
      const key = t.category?.trim() || 'Sans projet'
      if (!projMap.has(key)) projMap.set(key, [])
      projMap.get(key)!.push({
        id: t.id, title: t.title, type: t.type ?? 'autre', deadline: t.deadline,
        published: true, done: t.depot_id != null,
      })
    }
    return [{
      name: appStore.currentUser?.promo_name ?? 'Ma promo', color: '#9b87f5',
      projects: Array.from(projMap.entries())
        .map(([key, milestones]) => ({
          key, label: parseCategoryIcon(key).label, icon: parseCategoryIcon(key).icon,
          milestones: milestones.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
        }))
        .sort((a, b) => {
          const am = a.milestones[0]?.deadline ?? ''; const bm = b.milestones[0]?.deadline ?? ''
          return am.localeCompare(bm)
        }),
    }]
  })

  const frise = computed((): FrisePromo[] => appStore.isTeacher ? teacherFrise.value : studentFrise.value)

  // ── Position helpers ──────────────────────────────────────────────────────
  function milestoneLeft(deadline: string): string {
    const r = ganttDateRange.value
    if (!r) return '50%'
    const total = r.end.getTime() - r.start.getTime()
    const pos   = (new Date(deadline).getTime() - r.start.getTime()) / total * 100
    return `${Math.max(0, Math.min(100, pos))}%`
  }

  function projectLineStyle(milestones: FriseMilestone[]): Record<string, string> {
    if (milestones.length < 2) return { display: 'none' }
    const r = ganttDateRange.value
    if (!r) return {}
    const total = r.end.getTime() - r.start.getTime()
    const left  = (new Date(milestones[0].deadline).getTime() - r.start.getTime()) / total * 100
    const right = (new Date(milestones[milestones.length - 1].deadline).getTime() - r.start.getTime()) / total * 100
    return { left: `${Math.max(0, left)}%`, width: `${Math.max(0, right - left)}%` }
  }

  function onMilestoneClick(ms: FriseMilestone) {
    if (appStore.isTeacher) { appStore.currentTravailId = ms.id; modals.gestionDevoir = true }
    else router.push('/devoirs')
  }

  return {
    friseOffset, friseDragging, friseSpanDays, ganttDateRange,
    onFriseWheel, onFriseDragStart, onFriseDragMove, onFriseDragEnd,
    setFriseZoom,
    ganttMonths, ganttTodayPct,
    frise,
    milestoneLeft, projectLineStyle, onMilestoneClick,
  }
}
