/**
 * Vue projet sélectionné (enseignant) : résumé projet, devoirs groupés par type avec cartes initiales/rattrapages.
 */
<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpen, Clock, Plus, Eye, RotateCw, LayoutDashboard, ChevronDown, ChevronRight, Lock, FileText, Mic, Award, NotebookPen } from 'lucide-vue-next'
import { useAppStore }     from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import { useModalsStore }  from '@/stores/modals'
import { useConfirm }      from '@/composables/useConfirm'
import { deadlineClass, deadlineLabel } from '@/utils/date'
import { typeLabel, extractDuration } from '@/utils/devoir'
import type { GanttRow } from '@/types'
import type { UnifiedFlatRow } from '@/composables/useDevoirsTeacher'
import KanbanBoard from './KanbanBoard.vue'
import LumenProjectSection from '@/components/lumen/LumenProjectSection.vue'
import { useModules } from '@/composables/useModules'

const { isEnabled } = useModules()

interface DevoirPair {
  devoir: UnifiedFlatRow
  rattrapages: UnifiedFlatRow[]
}
interface DevoirGroup {
  type: string
  pairs: DevoirPair[]
  orphanRattrapages: UnifiedFlatRow[]
  total: number
}

const props = defineProps<{
  unifiedFlat: UnifiedFlatRow[]
  devoirsByType: DevoirGroup[]
  projectTypeCounts: (cat: string) => { type: string; count: number }[]
  projectStats: (cat: string) => { totalDepots: number; totalExpected: number; pct: number; noted: number; toGrade: number; drafts: number }
  projectNextDeadline: (cat: string) => string | null
  publishDevoir: (id: number, e: MouseEvent) => void
  publishAllDrafts: () => void
  addDevoirOfType: (type: string) => void
  openDevoir: (id: number) => void
  openCtxMenu: (e: MouseEvent, d: GanttRow | UnifiedFlatRow) => void
}>()

const appStore     = useAppStore()
const travauxStore = useTravauxStore()
const modals       = useModalsStore()
const { confirm }  = useConfirm()

/** Memoized project stats for the active project */
const currentProjectStats = computed(() => props.projectStats(appStore.activeProject!))

const publishingAll = ref(false)

/** Group devoirs with a valid group_id (for kanban) */
const groupDevoirs = computed(() =>
  props.unifiedFlat.filter(t => t.assigned_to === 'group' && t.group_id != null),
)

const kanbanExpanded = ref<Record<number, boolean>>({})

async function handlePublishAll() {
  const ok = await confirm(
    `Publier les ${currentProjectStats.value.drafts} brouillon${currentProjectStats.value.drafts > 1 ? 's' : ''} ?`,
    'warning',
    'Publier tout',
  )
  if (!ok) return
  publishingAll.value = true
  try { await props.publishAllDrafts() } finally { publishingAll.value = false }
}

// Label de deadline contextuel :
// - devoir non publie : "Prevu le 12 avr" (gris, brouillon)
// - devoir publie : deadlineLabel standard (qui utilise "Le 12 avr" pour les
//   dates passees depuis v2.211 — plus de "Retard de Xj" anxiogene).
function displayDeadlineLabel(t: UnifiedFlatRow): string {
  if (!t.is_published) {
    const d = new Date(t.deadline)
    return `Prévu le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  }
  return deadlineLabel(t.deadline)
}

function displayDeadlineClass(t: UnifiedFlatRow): string {
  if (!t.is_published) return 'deadline-draft'
  return deadlineClass(t.deadline)
}

// Micro-stats d'une carte publiee : "3/27 rendus", "2 a noter"
// Retourne null pour les events (pas de rendu attendu) ou les drafts.
interface CardStats {
  submission: string | null
  progress: number | null
  toGrade: number
}
function cardStats(t: UnifiedFlatRow): CardStats {
  if (!t.is_published || !t.hasSubmission || t.students_total === 0) {
    return { submission: null, progress: null, toGrade: 0 }
  }
  const dc = t.depots_count ?? 0
  const st = t.students_total ?? 0
  const progress = st > 0 ? Math.round((dc / st) * 100) : 0
  const toGrade = Math.max(0, dc - (t.noted_count ?? 0))
  return {
    submission: `${dc}/${st} rendus`,
    progress,
    toGrade,
  }
}

/**
 * Icone lucide par type de devoir. Utilisee dans les section-heads pour scanner
 * rapidement (cctl = Award, livrable = FileText, soutenance = Mic, ...). La
 * couleur est donnee par la classe CSS `.dc-section--<type>`.
 */
function iconForType(type: string) {
  switch (type) {
    case 'soutenance':    return Mic
    case 'livrable':      return FileText
    case 'etude_de_cas':  return NotebookPen
    case 'memoire':       return BookOpen
    case 'autre':         return FileText
    default:              return Award // cctl et fallback
  }
}
</script>

<template>
  <div v-if="travauxStore.loading" class="ut-loading">
    <div v-for="i in 5" :key="i" class="skel skel-line" style="height:36px;margin-bottom:4px;border-radius:6px" />
  </div>

  <div v-else-if="!unifiedFlat.length" class="dc-empty">
    <BookOpen :size="32" class="dc-empty-icon" />
    <h3 class="dc-empty-title">Aucun devoir dans ce projet</h3>
    <p class="dc-empty-hint">Utilisez le bouton « Nouveau devoir » dans l'en-tête pour commencer.</p>
    <button class="dc-empty-btn" @click="modals.newDevoir = true">
      <Plus :size="13" /> Créer un devoir
    </button>
  </div>

  <template v-else>
    <!-- Bloc résumé projet : titre dominant + pills + stats + CTA publier -->
    <section class="proj-summary">
      <div class="proj-summary-head">
        <h2 class="proj-summary-name" :title="appStore.activeProject ?? ''">{{ appStore.activeProject }}</h2>
        <button v-if="currentProjectStats.drafts > 0" class="proj-summary-publish-btn" :disabled="publishingAll" @click="handlePublishAll">
          <RotateCw v-if="publishingAll" :size="13" class="spin-icon" />
          <Eye v-else :size="13" />
          Publier {{ currentProjectStats.drafts }} brouillon<template v-if="currentProjectStats.drafts > 1">s</template>
        </button>
      </div>

      <div v-if="projectTypeCounts(appStore.activeProject!).length" class="proj-summary-pills">
        <span v-for="tl in projectTypeCounts(appStore.activeProject!)" :key="tl.type" class="proj-type-pill" :class="`type-${tl.type}`">
          {{ tl.count }} {{ typeLabel(tl.type) }}
        </span>
      </div>

      <div class="proj-summary-stats">
        <div v-if="currentProjectStats.totalExpected > 0" class="proj-summary-progress">
          <div class="proj-summary-progress-bar">
            <div class="proj-summary-progress-fill" :style="{ width: currentProjectStats.pct + '%' }" />
          </div>
          <span class="proj-summary-pct">{{ currentProjectStats.pct }}%</span>
          <span class="proj-summary-pct-label">soumis</span>
        </div>
        <span v-if="currentProjectStats.noted > 0" class="proj-summary-stat"><Award :size="11" /> {{ currentProjectStats.noted }} notés</span>
        <span v-if="currentProjectStats.toGrade > 0" class="proj-summary-stat proj-stat-warn">{{ currentProjectStats.toGrade }} à noter</span>
        <span v-if="currentProjectStats.drafts > 0" class="proj-summary-stat proj-stat-draft">{{ currentProjectStats.drafts }} brouillon<template v-if="currentProjectStats.drafts > 1">s</template></span>
        <span v-if="projectNextDeadline(appStore.activeProject!)" class="proj-summary-stat proj-stat-next">
          <Clock :size="11" /> {{ deadlineLabel(projectNextDeadline(appStore.activeProject!)!) }}
        </span>
        <LumenProjectSection
          v-if="appStore.activePromoId"
          :promo-id="appStore.activePromoId"
          :project-name="appStore.activeProject ?? ''"
          :is-teacher="true"
        />
      </div>
    </section>

    <!-- Devoirs par type -->
    <div class="dc-sections">
      <template v-for="group in devoirsByType" :key="group.type">
        <section class="dc-section" :class="`dc-section--${group.type}`">
          <header class="dc-section-head">
            <span class="dc-section-icon" :class="`dc-section-icon--${group.type}`">
              <component :is="iconForType(group.type)" :size="14" />
            </span>
            <h3 class="dc-section-title">{{ typeLabel(group.type) }}</h3>
            <span class="dc-section-count">{{ group.total }}</span>
          </header>

          <!-- Cartes : chaque initiale montre son rattrapage attache en dessous -->
          <div class="dc-cards">
            <div
              v-for="pair in group.pairs"
              :key="pair.devoir.id"
              class="dc-pair"
            >
              <div
                class="dc-card"
                :class="{ 'dc-card--draft': !pair.devoir.is_published, [`dc-card--${group.type}`]: true }"
                @click="openDevoir(pair.devoir.id)"
                @contextmenu="openCtxMenu($event, pair.devoir)"
              >
                <div class="dc-card-top">
                  <span class="dc-card-title">{{ pair.devoir.title }}</span>
                  <button v-if="!pair.devoir.is_published" class="dc-publish-btn" title="Publier" @click="publishDevoir(pair.devoir.id, $event)">
                    <Eye :size="12" />
                  </button>
                </div>
                <div class="dc-card-meta">
                  <span class="dc-card-date deadline-badge" :class="displayDeadlineClass(pair.devoir)">{{ displayDeadlineLabel(pair.devoir) }}</span>
                  <span v-if="extractDuration(pair.devoir.description)" class="dc-card-duration">{{ extractDuration(pair.devoir.description) }}</span>
                  <span v-if="pair.devoir.room" class="dc-card-duration">{{ pair.devoir.room }}</span>
                </div>
                <template v-if="cardStats(pair.devoir).submission">
                  <div class="dc-card-submission">
                    <div class="dc-card-progress">
                      <div class="dc-card-progress-fill" :style="{ width: cardStats(pair.devoir).progress + '%' }" />
                    </div>
                    <span class="dc-card-submission-label">{{ cardStats(pair.devoir).submission }}</span>
                  </div>
                  <div v-if="cardStats(pair.devoir).toGrade > 0" class="dc-card-tograde">
                    {{ cardStats(pair.devoir).toGrade }} à noter
                  </div>
                </template>
                <span v-if="!pair.devoir.is_published" class="dc-card-draft-tag">Brouillon</span>
              </div>

              <!-- Rattrapages attaches, sous l'initiale, visuellement lies par une bordure gauche -->
              <div v-if="pair.rattrapages.length" class="dc-ratt-wrap">
                <div
                  v-for="r in pair.rattrapages"
                  :key="r.id"
                  class="dc-ratt"
                  :class="{ 'dc-ratt--draft': !r.is_published }"
                  :title="`Rattrapage de « ${pair.devoir.title} »`"
                  @click="openDevoir(r.id)"
                  @contextmenu="openCtxMenu($event, r)"
                >
                  <RotateCw :size="10" class="dc-ratt-icon" />
                  <span class="dc-ratt-label-text">Rattrapage</span>
                  <span class="dc-ratt-date deadline-badge" :class="displayDeadlineClass(r)">{{ displayDeadlineLabel(r) }}</span>
                  <button v-if="!r.is_published" class="dc-publish-btn dc-publish-btn--sm" title="Publier" @click.stop="publishDevoir(r.id, $event)">
                    <Eye :size="10" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Rattrapages orphelins (sans initiale correspondante — cas rare) -->
          <div v-if="group.orphanRattrapages.length" class="dc-ratt-orphans">
            <div class="dc-ratt-orphans-label"><RotateCw :size="10" /> Rattrapages sans devoir initial</div>
            <div
              v-for="r in group.orphanRattrapages"
              :key="r.id"
              class="dc-ratt"
              :class="{ 'dc-ratt--draft': !r.is_published }"
              @click="openDevoir(r.id)"
              @contextmenu="openCtxMenu($event, r)"
            >
              <RotateCw :size="10" class="dc-ratt-icon" />
              <span class="dc-ratt-label-text">{{ r.title }}</span>
              <span class="dc-ratt-date deadline-badge" :class="displayDeadlineClass(r)">{{ displayDeadlineLabel(r) }}</span>
            </div>
          </div>

          <!-- CTA minimal (le bouton principal "Nouveau" est dans le header) -->
          <button class="dc-add-link" @click="addDevoirOfType(group.type)">
            <Plus :size="12" /> Ajouter {{ typeLabel(group.type).toLowerCase().startsWith('é') ? 'une' : 'un' }} {{ typeLabel(group.type) }}
          </button>
        </section>
      </template>

      <!-- Bouton ajouter si aucun type encore -->
      <button v-if="!devoirsByType.length" class="dc-add-btn dc-add-btn--first" @click="modals.newDevoir = true">
        <Plus :size="14" /> Créer un devoir
      </button>
    </div>

    <!-- ═══ Kanbans de groupe ═══ -->
    <div v-if="isEnabled('kanban') && groupDevoirs.length" class="kb-section">
      <div class="kb-section-header">
        <LayoutDashboard :size="15" />
        <span class="kb-section-title">Kanbans de groupe</span>
        <span class="kb-section-readonly" title="Les étudiants gèrent ces statuts : vous voyez leur progression.">
          <Lock :size="10" /> Lecture seule
        </span>
        <span class="kb-section-sub">· {{ groupDevoirs.length }} travail{{ groupDevoirs.length > 1 ? 'x' : '' }}</span>
      </div>
      <div v-for="t in groupDevoirs" :key="t.id" class="kb-item">
        <button class="kb-item-header" @click="kanbanExpanded[t.id] = !kanbanExpanded[t.id]">
          <component :is="kanbanExpanded[t.id] ? ChevronDown : ChevronRight" :size="14" />
          <span class="kb-item-title">{{ t.title }}</span>
          <span v-if="t.group_name" class="kb-item-group">{{ t.group_name }}</span>
        </button>
        <div v-if="kanbanExpanded[t.id]" class="kb-item-board">
          <KanbanBoard :travail-id="t.id" :group-id="t.group_id!" :read-only="true" />
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════
   RESUME PROJET : titre dominant + CTA "publier" mis en avant
   ══════════════════════════════════════════════════════════════════════════ */
.proj-summary {
  padding: 16px 20px;
  margin-bottom: 16px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.proj-summary-head {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.proj-summary-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -.01em;
}

/* CTA "publier les N brouillons" : emphase visuelle pour ne pas etre noye */
.proj-summary-publish-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  background: var(--color-success);
  color: #fff;
  border: 1px solid var(--color-success);
  font-family: var(--font);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
  transition: background var(--t-fast), border-color var(--t-fast), transform var(--t-fast), box-shadow var(--t-fast);
  flex-shrink: 0;
}
.proj-summary-publish-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-success) 88%, black);
  border-color: color-mix(in srgb, var(--color-success) 88%, black);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, .18);
}
.proj-summary-publish-btn:active:not(:disabled) { transform: translateY(0); }
.proj-summary-publish-btn:disabled { opacity: .6; cursor: wait; }

/* Pills des types de devoirs : style chip unifie (radius 14, border semi-trans) */
.proj-summary-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.proj-type-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: var(--radius-lg);
  letter-spacing: .2px;
  border: 1px solid transparent;
}

/* Stats ligne : separateurs subtils + pct dans pill accent */
.proj-summary-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-secondary);
}
.proj-summary-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}
.proj-summary-progress-bar {
  width: 100px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-active);
  overflow: hidden;
}
.proj-summary-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--color-success), color-mix(in srgb, var(--color-success) 75%, var(--accent)));
  box-shadow: 0 0 4px rgba(var(--color-success-rgb), .35);
  transition: width var(--motion-base) var(--ease-out);
}
.proj-summary-pct {
  font-weight: 700;
  color: var(--color-success);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}
.proj-summary-pct-label {
  color: var(--text-muted);
  font-size: 11px;
}

.proj-summary-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: var(--radius-lg);
  background: var(--bg-main);
  border: 1px solid var(--border);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-secondary);
}
.proj-stat-warn {
  color: var(--color-warning);
  background: rgba(var(--color-warning-rgb), .1);
  border-color: rgba(var(--color-warning-rgb), .25);
  font-weight: 600;
}
.proj-stat-draft {
  color: var(--text-muted);
  border-style: dashed;
}
.proj-stat-next { color: var(--text-secondary); }

/* ══════════════════════════════════════════════════════════════════════════
   SECTIONS DEVOIRS par type : surfaces cohérentes avec la home (bg-elevated
   + elevation + radius), section-head avec icône distinctive.
   ══════════════════════════════════════════════════════════════════════════ */
.dc-sections {
  padding: 0 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dc-section {
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--elevation-1);
  animation: dc-section-in .3s var(--ease-out) both;
}
@keyframes dc-section-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.dc-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.dc-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  color: var(--text-muted);
  flex-shrink: 0;
}
.dc-section-icon--cctl         { background: rgba(var(--color-cctl-rgb, 155, 135, 245), .12); color: var(--color-cctl, #a569bd); }
.dc-section-icon--livrable     { background: rgba(var(--accent-rgb), .12); color: var(--accent); }
.dc-section-icon--soutenance   { background: rgba(var(--color-warning-rgb), .12); color: var(--color-warning); }
.dc-section-icon--etude_de_cas { background: rgba(var(--color-success-rgb), .12); color: var(--color-success); }
.dc-section-icon--memoire      { background: rgba(var(--color-danger-rgb), .12); color: var(--color-danger); }
.dc-section-icon--autre        { background: var(--bg-hover); color: var(--text-muted); }

.dc-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-transform: capitalize;
  letter-spacing: -.005em;
}
.dc-section-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-main);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}

/* ── Cartes devoirs ────────────────────────────────────────────────────── */
.dc-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

/* Paire devoir initial + ses rattrapages attaches */
.dc-pair {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dc-ratt-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 0 0 14px;
  padding-left: 12px;
  border-left: 2px dashed var(--border-input);
}
.dc-ratt {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast), padding var(--t-fast);
}
.dc-ratt:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
  padding-left: 14px;
}
.dc-ratt--draft { font-style: italic; opacity: .8; }
.dc-ratt-icon { color: var(--color-warning); flex-shrink: 0; opacity: .85; }
.dc-ratt-label-text {
  flex: 1;
  font-weight: 500;
  font-size: 11px;
}
.dc-ratt-date { font-size: 9.5px !important; padding: 1px 6px !important; }

/* Rattrapages orphelins (pas d'initiale matchante) */
.dc-ratt-orphans {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dc-ratt-orphans-label {
  display: flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .4px;
  padding-bottom: 2px;
}

/* ── Carte devoir (dc-card) : surface unifiee + hover subtle ───────────── */
.dc-card {
  position: relative;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-main);
  box-shadow: var(--elevation-0);
  transition:
    background var(--t-fast),
    border-color var(--t-fast),
    box-shadow var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
}
.dc-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-input);
  box-shadow: var(--elevation-1);
  transform: translateY(-1px);
}
.dc-card:active { transform: translateY(0); }

/* Brouillon : fond hachure + dashed border, plus scanable */
.dc-card--draft {
  border-style: dashed;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(127, 127, 127, .04) 0 6px,
      transparent 6px 12px
    ),
    var(--bg-main);
}
.dc-card--draft .dc-card-title { color: var(--text-secondary); }
.dc-card--draft:hover {
  background:
    repeating-linear-gradient(
      135deg,
      rgba(127, 127, 127, .06) 0 6px,
      transparent 6px 12px
    ),
    var(--bg-hover);
}

/* Barre laterale colorée par type — scan rapide */
.dc-card--cctl         { border-left: 3px solid var(--color-cctl, #a569bd); }
.dc-card--soutenance   { border-left: 3px solid var(--color-warning); }
.dc-card--etude_de_cas { border-left: 3px solid var(--color-success); }
.dc-card--livrable     { border-left: 3px solid var(--accent); }
.dc-card--memoire      { border-left: 3px solid var(--color-danger); }
.dc-card--autre        { border-left: 3px solid var(--color-autre, #95a5a6); }

.dc-card-top { display: flex; align-items: flex-start; gap: 6px; }
.dc-card-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  line-height: 1.35;
}
.dc-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.dc-card-date { font-size: 10px; }
.dc-card-duration {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-hover);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.dc-card-submission {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.dc-card-submission-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.dc-card-progress {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--bg-active);
  overflow: hidden;
}
.dc-card-progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--color-success), color-mix(in srgb, var(--color-success) 70%, var(--accent)));
  transition: width var(--motion-base) var(--ease-out);
}

/* Badge "N à noter" : pill visible (vs text brut) */
.dc-card-tograde {
  display: inline-flex;
  align-items: center;
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-warning);
  background: rgba(var(--color-warning-rgb), .12);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  letter-spacing: .2px;
}

/* Deadline-draft : contraste leger pour rester lisible sur fond hachure */
.deadline-draft {
  background: rgba(128, 132, 136, .14);
  color: var(--text-secondary);
  border: 1px dashed var(--border-input);
}

.dc-card-draft-tag {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px dashed var(--border-input);
}

/* Bouton inline "publier" icon-only */
.dc-publish-btn {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 3px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
}
.dc-publish-btn:hover {
  color: var(--color-success);
  background: rgba(var(--color-success-rgb), .12);
  border-color: rgba(var(--color-success-rgb), .3);
}
.dc-publish-btn--sm {
  padding: 2px !important;
  background: transparent;
  border-color: transparent;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

/* CTA "Ajouter X" : visibilite accrue vs ancien text-muted */
.dc-add-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 6px 10px;
  font-family: var(--font);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
}
.dc-add-link:hover {
  color: var(--accent);
  background: rgba(var(--accent-rgb), .08);
  border-color: rgba(var(--accent-rgb), .3);
}

/* Empty-state wrapper pour premiere creation (aucun devoir du tout) */
.dc-add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: 1px dashed var(--border-input);
  border-radius: var(--radius-sm);
  padding: 6px 12px;
  cursor: pointer;
  font-family: var(--font);
  transition: background var(--t-fast), border-color var(--t-fast);
  margin-top: 6px;
}
.dc-add-btn:hover { background: rgba(var(--accent-rgb), .08); border-color: var(--accent); }
.dc-add-btn--first { padding: 14px; justify-content: center; font-size: 13px; }

@media (max-width: 600px) {
  .dc-cards { grid-template-columns: 1fr; }
  .proj-summary-head { flex-wrap: wrap; }
  .proj-summary-publish-btn { width: 100%; justify-content: center; }
}

/* ══════════════════════════════════════════════════════════════════════════
   BADGES DE TYPE (chip system aligne sur la home : radius 14, border semi-trans)
   ══════════════════════════════════════════════════════════════════════════ */
.devoir-type-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 3px 9px;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
}
.type-livrable     { background: rgba(var(--accent-rgb), .15);         color: var(--accent);         border-color: rgba(var(--accent-rgb), .3); }
.type-soutenance   { background: rgba(var(--color-warning-rgb), .15);  color: var(--color-warning);  border-color: rgba(var(--color-warning-rgb), .3); }
.type-cctl         { background: rgba(123, 104, 238, .15);             color: var(--color-cctl);     border-color: rgba(123, 104, 238, .3); }
.type-etude_de_cas { background: rgba(var(--color-success-rgb), .15);  color: var(--color-success);  border-color: rgba(var(--color-success-rgb), .3); }
.type-memoire      { background: rgba(var(--color-danger-rgb), .15);   color: var(--color-danger);   border-color: rgba(var(--color-danger-rgb), .3); }
.type-autre        { background: rgba(127, 140, 141, .15);             color: var(--color-autre);    border-color: rgba(127, 140, 141, .3); }

/* ══════════════════════════════════════════════════════════════════════════
   EMPTY STATE (aucun devoir)
   ══════════════════════════════════════════════════════════════════════════ */
.ut-loading { padding: 20px; }

.dc-empty {
  margin: 24px 20px;
  padding: 40px 20px;
  text-align: center;
  border: 1px dashed var(--border-input);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.dc-empty-icon { color: var(--text-muted); opacity: .4; margin-bottom: 8px; }
.dc-empty-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; }
.dc-empty-hint { font-size: 12.5px; color: var(--text-muted); margin: 0; max-width: 360px; line-height: 1.5; }
.dc-empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 12px;
  font-family: var(--font);
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  border: 1px solid var(--accent);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
  transition: background var(--t-fast), transform var(--t-fast);
}
.dc-empty-btn:hover { background: color-mix(in srgb, var(--accent) 88%, black); transform: translateY(-1px); }

/* ══════════════════════════════════════════════════════════════════════════
   KANBAN SECTION : palette via variables (color-info), surfaces unifiees
   ══════════════════════════════════════════════════════════════════════════ */
.kb-section {
  padding: 16px 20px 24px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kb-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-info);
  flex-wrap: wrap;
}
.kb-section-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.kb-section-readonly {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .3px;
  padding: 2px 8px;
  border-radius: var(--radius-lg);
  background: rgba(var(--color-info-rgb), .12);
  color: var(--color-info);
  border: 1px solid rgba(var(--color-info-rgb), .3);
  text-transform: uppercase;
  cursor: help;
}
.kb-section-sub { font-size: 11px; color: var(--text-muted); }
.kb-item {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: var(--elevation-1);
}
.kb-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-elevated);
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: var(--font);
  color: var(--text-secondary);
  transition: background var(--t-fast);
}
.kb-item-header:hover { background: var(--bg-hover); }
.kb-item-title { flex: 1; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.kb-item-group {
  font-size: 11px;
  color: var(--color-info);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: rgba(var(--color-info-rgb), .12);
}
.kb-item-board { padding: 14px; background: var(--bg-main); }
</style>
