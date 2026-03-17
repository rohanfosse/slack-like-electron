<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  BookOpen, BarChart2, List, Grid, Plus, Upload, Link2, X,
  FileText, CheckCircle2, Clock, Lock, AlertTriangle, ChevronRight,
  Users, Award,
} from 'lucide-vue-next'
import { parseCategoryIcon } from '@/utils/categoryIcon'
import { useAppStore }     from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'
import { useModalsStore }  from '@/stores/modals'
import { deadlineClass, deadlineLabel, formatDate } from '@/utils/date'
import { avatarColor, initials } from '@/utils/format'
import type { Travail } from '@/types'

const appStore     = useAppStore()
const travauxStore = useTravauxStore()
const modals       = useModalsStore()

// ── Vue locale enseignant (remplace travauxStore.view côté UI) ────────────────
const teacherView = ref<'gantt' | 'liste' | 'rendus'>('gantt')

// ── Horloge temps réel pour verrouillage des deadlines ────────────────────────
/**
 * Pourquoi une horloge 30 s plutôt que requestAnimationFrame ?
 *   - rAF tourne à 60 fps = 60 appels/s × N cartes → inutile et coûteux
 *   - Les deadlines sont à la minute près; un intervalle de 30 s est
 *     suffisant tout en réagissant dans la demi-minute suivant l'expiration
 *   - Nettoyé dans onBeforeUnmount → zéro fuite mémoire
 */
const now = ref(Date.now())
let clockInterval: ReturnType<typeof setInterval> | null = null

/** Renvoie true si la deadline est passée (verrouille le bouton Déposer) */
function isExpired(deadline: string): boolean {
  return now.value >= new Date(deadline).getTime()
}

// ── Dépôt inline (étudiant) ───────────────────────────────────────────────────
const depositingTravailId = ref<number | null>(null)
const depositMode         = ref<'file' | 'link'>('file')
const depositLink         = ref('')
const depositFile         = ref<string | null>(null)
const depositFileName     = ref<string | null>(null)
const depositing          = ref(false)

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  clockInterval = setInterval(() => { now.value = Date.now() }, 30_000)
  await loadView()
})

onBeforeUnmount(() => {
  if (clockInterval !== null) clearInterval(clockInterval)
})

// ── Chargement des données ─────────────────────────────────────────────────────
async function loadView() {
  if (appStore.isStudent) {
    await travauxStore.fetchStudentDevoirs()
  } else {
    const promoId = appStore.activePromoId
    if (!promoId) return
    // Toujours charger le gantt pour avoir les titres disponibles dans rendus/liste
    await travauxStore.fetchGantt(promoId)
    if (teacherView.value === 'rendus') {
      await travauxStore.fetchRendus(promoId)
    }
    travauxStore.setView(teacherView.value === 'rendus' ? 'rendus' : 'gantt')
  }
}

function setTeacherView(v: 'gantt' | 'liste' | 'rendus') {
  teacherView.value = v
  loadView()
}

watch(() => appStore.activePromoId, loadView)

// Recharger les travaux étudiant quand le canal change depuis la sidebar
watch(() => appStore.activeChannelId, () => {
  if (appStore.isStudent) travauxStore.fetchStudentDevoirs()
})

// ── Groupes urgence étudiant ───────────────────────────────────────────────────
const studentGroups = computed(() => {
  const all = travauxStore.devoirs
  return {
    overdue:   all.filter(t => t.depot_id == null && isExpired(t.deadline)),
    urgent:    all.filter(t => {
      if (t.depot_id != null || isExpired(t.deadline)) return false
      return new Date(t.deadline).getTime() - now.value < 3 * 86_400_000
    }),
    pending:   all.filter(t => {
      if (t.depot_id != null || isExpired(t.deadline)) return false
      return new Date(t.deadline).getTime() - now.value >= 3 * 86_400_000
    }),
    submitted: all.filter(t => t.depot_id != null),
  }
})

const studentStats = computed(() => ({
  total:     filteredStudentGroups.value.overdue.length + filteredStudentGroups.value.urgent.length + filteredStudentGroups.value.pending.length + filteredStudentGroups.value.submitted.length,
  pending:   filteredStudentGroups.value.overdue.length + filteredStudentGroups.value.urgent.length + filteredStudentGroups.value.pending.length,
  urgent:    filteredStudentGroups.value.overdue.length + filteredStudentGroups.value.urgent.length,
  submitted: filteredStudentGroups.value.submitted.length,
}))

// ── Dépôt étudiant ─────────────────────────────────────────────────────────────
function startDeposit(t: Travail) {
  depositingTravailId.value = t.id
  depositMode.value         = 'file'
  depositLink.value         = ''
  depositFile.value         = null
  depositFileName.value     = null
}

function cancelDeposit() {
  depositingTravailId.value = null
}

async function pickFile() {
  const res = await window.api.openFileDialog()
  if (res?.ok && res.data) {
    depositFile.value     = res.data
    depositFileName.value = res.data.split(/[\\/]/).pop() ?? res.data
  }
}

function clearDepositFile() {
  depositFile.value     = null
  depositFileName.value = null
}

async function submitDeposit(travail: Travail) {
  // ── Debounce / double-clic ───────────────────────────────────────────────
  // depositing.value agit comme mutex : posé synchroniquement avant tout
  // await, donc aucun second clic ne peut passer avant la fin du premier.
  if (depositing.value) return
  if (!appStore.currentUser) return
  if (depositMode.value === 'file' && !depositFile.value) return
  if (depositMode.value === 'link' && !depositLink.value.trim()) return
  // Vérification deadline côté client (la DB valide aussi côté serveur)
  if (isExpired(travail.deadline)) return

  depositing.value = true
  try {
    const ok = await travauxStore.addDepot({
      travail_id: travail.id,
      student_id: appStore.currentUser.id,
      type:       depositMode.value,
      content:    depositMode.value === 'file' ? depositFile.value! : depositLink.value.trim(),
      file_name:  depositMode.value === 'file' ? depositFileName.value : null,
    })
    if (ok) {
      cancelDeposit()
      await travauxStore.fetchStudentDevoirs()
    }
  } finally {
    depositing.value = false
  }
}

// ── Vue prof : ouvrir un travail ───────────────────────────────────────────────
async function openTravail(travailId: number) {
  appStore.currentTravailId = travailId
  await travauxStore.openTravail(travailId)
  modals.gestionDevoir = true
}

// ── Gantt : calcul des positions ───────────────────────────────────────────────
type GanttItem = Travail & { left: number; width: number; dlClass: string }

const ganttItems = computed((): { items: GanttItem[]; todayPct: number } => {
  const raw = travauxStore.ganttData as Travail[]
  if (!raw.length) return { items: [], todayPct: 0 }

  const dates = raw.flatMap(t => [
    t.start_date ? new Date(t.start_date).getTime() : new Date(t.deadline).getTime() - 7 * 86400000,
    new Date(t.deadline).getTime(),
  ])
  const minT = Math.min(...dates)
  const maxT = Math.max(...dates)
  const span = maxT - minT || 1

  const todayPct = Math.max(0, Math.min(100, ((now.value - minT) / span) * 100))

  const items = raw.map(t => {
    const startMs = t.start_date
      ? new Date(t.start_date).getTime()
      : new Date(t.deadline).getTime() - 7 * 86400000
    const endMs   = new Date(t.deadline).getTime()
    const left    = ((startMs - minT) / span) * 100
    const width   = Math.max(((endMs - startMs) / span) * 100, 2)
    return { ...t, left, width, dlClass: deadlineClass(t.deadline) }
  })

  return { items, todayPct }
})

// ── Rendus : grouper par travail avec titres ───────────────────────────────────
const rendusByTravail = computed(() => {
  const ganttMap = new Map((travauxStore.ganttData as Travail[]).map(t => [t.id, t]))
  const map = new Map<number, { travail: Partial<Travail>; rendus: typeof travauxStore.allRendus }>()
  for (const r of travauxStore.allRendus) {
    if (!map.has(r.travail_id)) {
      const gt = ganttMap.get(r.travail_id)
      map.set(r.travail_id, { travail: gt ?? { id: r.travail_id }, rendus: [] })
    }
    map.get(r.travail_id)!.rendus.push(r)
  }
  return [...map.values()]
})

// ── Filtre projet ──────────────────────────────────────────────────────────────
function matchProject<T extends { category?: string | null }>(items: T[]): T[] {
  const proj = appStore.activeProject
  if (!proj) return items
  return items.filter(t => t.category === proj)
}

const filteredGanttItems = computed(() => {
  const { items, todayPct } = ganttItems.value
  return { items: matchProject(items), todayPct }
})

const filteredListItems = computed(() =>
  matchProject(travauxStore.ganttData as Travail[]),
)

const filteredStudentGroups = computed(() => {
  const all = matchProject(travauxStore.devoirs)
  return {
    overdue:   all.filter(t => t.depot_id == null && isExpired(t.deadline)),
    urgent:    all.filter(t => {
      if (t.depot_id != null || isExpired(t.deadline)) return false
      return new Date(t.deadline).getTime() - now.value < 3 * 86_400_000
    }),
    pending:   all.filter(t => {
      if (t.depot_id != null || isExpired(t.deadline)) return false
      return new Date(t.deadline).getTime() - now.value >= 3 * 86_400_000
    }),
    submitted: all.filter(t => t.depot_id != null),
  }
})

const filteredRendusByTravail = computed(() => {
  const proj = appStore.activeProject
  if (!proj) return rendusByTravail.value
  return rendusByTravail.value.filter(g => (g.travail as Travail).category === proj)
})
</script>

<template>
  <div class="travaux-area">

    <!-- ── En-tête ─────────────────────────────────────────────────────────── -->
    <header class="travaux-header">
      <div class="travaux-header-title">
        <BookOpen :size="18" />
        <span>Travaux</span>
        <span v-if="appStore.activeProject" class="header-channel-ctx">
          <component
            v-if="parseCategoryIcon(appStore.activeProject).icon"
            :is="parseCategoryIcon(appStore.activeProject).icon!"
            :size="13"
            style="flex-shrink:0"
          />
          {{ parseCategoryIcon(appStore.activeProject).label }}
        </span>
      </div>

      <div class="travaux-header-actions">
        <!-- Toggle vue (prof) -->
        <template v-if="appStore.isTeacher">
          <div class="view-toggle">
            <button
              class="view-toggle-btn"
              :class="{ active: teacherView === 'gantt' }"
              @click="setTeacherView('gantt')"
            >
              <BarChart2 :size="13" /> Gantt
            </button>
            <button
              class="view-toggle-btn"
              :class="{ active: teacherView === 'liste' }"
              @click="setTeacherView('liste')"
            >
              <Grid :size="13" /> Liste
            </button>
            <button
              class="view-toggle-btn"
              :class="{ active: teacherView === 'rendus' }"
              @click="setTeacherView('rendus')"
            >
              <List :size="13" /> Rendus
            </button>
          </div>

          <button class="btn-primary btn-nouveau" @click="modals.newDevoir = true">
            <Plus :size="14" /> Nouveau
          </button>
        </template>
      </div>
    </header>

    <!-- ── Barre de stats étudiant ──────────────────────────────────────────── -->
    <div
      v-if="appStore.isStudent && travauxStore.devoirs.length > 0"
      class="student-stats-bar"
    >
      <div class="stat-chip stat-chip-neutral">
        <span class="stat-dot dot-neutral" />
        <strong>{{ studentStats.total }}</strong>&nbsp;total
      </div>
      <div class="stat-chip stat-chip-blue">
        <span class="stat-dot dot-blue" />
        <strong>{{ studentStats.pending }}</strong>&nbsp;à rendre
      </div>
      <div class="stat-chip stat-chip-red">
        <span class="stat-dot dot-red" />
        <strong>{{ studentStats.urgent }}</strong>&nbsp;urgent
      </div>
      <div class="stat-chip stat-chip-green">
        <span class="stat-dot dot-green" />
        <strong>{{ studentStats.submitted }}</strong>&nbsp;rendu{{ studentStats.submitted > 1 ? 's' : '' }}
      </div>
    </div>

    <!-- ── Contenu principal ────────────────────────────────────────────────── -->
    <div class="travaux-content">

      <!-- ════════════════════════ Vue ÉTUDIANT ════════════════════════ -->
      <template v-if="appStore.isStudent">

        <!-- Squelettes -->
        <div v-if="travauxStore.loading" class="travaux-list">
          <div v-for="i in 4" :key="i" class="skel-card">
            <div class="skel skel-line skel-w30" style="height:12px" />
            <div class="skel skel-line skel-w70" style="height:16px;margin-top:10px" />
            <div class="skel skel-line skel-w90" style="height:12px;margin-top:8px" />
            <div class="skel skel-line skel-w50" style="height:12px;margin-top:6px" />
          </div>
        </div>

        <!-- État vide -->
        <div v-else-if="travauxStore.devoirs.length === 0" class="empty-state-custom">
          <CheckCircle2 :size="48" class="empty-icon" />
          <h3>Aucun travail assigné</h3>
          <p>Vos travaux apparaîtront ici dès qu'un enseignant en créera.</p>
        </div>

        <!-- Groupes de travaux -->
        <div v-else class="travaux-grouped">

          <!-- ▸ EN RETARD -->
          <template v-if="filteredStudentGroups.overdue.length">
            <div class="group-header group-header--danger">
              <Lock :size="12" /> En retard
              <span class="group-count">{{ filteredStudentGroups.overdue.length }}</span>
            </div>
            <div class="travaux-list">
              <div v-for="t in filteredStudentGroups.overdue" :key="t.id" class="travail-card travail-card--overdue">
                <!-- Carte meta -->
                <div class="travail-card-header">
                  <div class="travail-card-meta">
                    <span class="travail-type-badge" :class="`type-${t.type}`">{{ t.type }}</span>
                    <span v-if="t.category" class="tag-badge">
                      <component v-if="parseCategoryIcon(t.category).icon" :is="parseCategoryIcon(t.category).icon!" :size="10" style="flex-shrink:0" />
                      {{ parseCategoryIcon(t.category).label }}
                    </span>
                    <span v-if="t.channel_name" class="travail-channel"># {{ t.channel_name }}</span>
                  </div>
                  <span class="deadline-badge" :class="deadlineClass(t.deadline)">
                    <Clock :size="10" />{{ deadlineLabel(t.deadline) }}
                  </span>
                </div>
                <h3 class="travail-card-title">{{ t.title }}</h3>
                <p v-if="t.description" class="travail-card-desc">{{ t.description }}</p>
                <!-- Formulaire de dépôt inline -->
                <template v-if="depositingTravailId === t.id">
                  <div class="deposit-form">
                    <div class="deposit-type-toggle">
                      <button class="deposit-toggle-btn" :class="{ active: depositMode === 'file' }" @click="depositMode = 'file'">
                        <FileText :size="12" /> Fichier
                      </button>
                      <button class="deposit-toggle-btn" :class="{ active: depositMode === 'link' }" @click="depositMode = 'link'">
                        <Link2 :size="12" /> Lien URL
                      </button>
                    </div>
                    <div v-if="depositMode === 'file'">
                      <div v-if="depositFile" class="deposit-file-selected">
                        <CheckCircle2 :size="15" class="deposit-file-selected-icon" />
                        <span class="deposit-file-selected-name">{{ depositFileName }}</span>
                        <button class="deposit-file-selected-clear" type="button" @click.stop="clearDepositFile">
                          <X :size="12" />
                        </button>
                      </div>
                      <div v-else class="deposit-file-zone" @click="pickFile">
                        <Upload :size="20" class="deposit-file-zone-icon" />
                        <span class="deposit-file-zone-label">Cliquer pour choisir un fichier</span>
                        <span class="deposit-file-zone-hint">PDF, images, archives…</span>
                      </div>
                    </div>
                    <input v-else v-model="depositLink" class="form-input" placeholder="https://…" type="url" />
                    <div class="deposit-actions">
                      <button class="btn-ghost btn-deposit-cancel" @click="cancelDeposit"><X :size="12" /> Annuler</button>
                      <button
                        class="btn-primary btn-deposit-submit"
                        :disabled="depositing || isExpired(t.deadline) || (depositMode === 'file' ? !depositFile : !depositLink.trim())"
                        @click="submitDeposit(t)"
                      >
                        <Upload :size="12" />
                        {{ depositing ? 'Dépôt…' : isExpired(t.deadline) ? 'Délai expiré' : 'Déposer' }}
                      </button>
                    </div>
                  </div>
                </template>
                <!-- Pied de carte -->
                <div v-else class="travail-card-footer">
                  <span class="travail-deadline-date">Échéance : {{ formatDate(t.deadline) }}</span>
                  <button class="btn-deposit-expired" disabled>
                    <Lock :size="12" /> Délai expiré
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- ▸ URGENT -->
          <template v-if="filteredStudentGroups.urgent.length">
            <div class="group-header group-header--warning">
              <AlertTriangle :size="12" /> Urgent
              <span class="group-count">{{ filteredStudentGroups.urgent.length }}</span>
            </div>
            <div class="travaux-list">
              <div v-for="t in filteredStudentGroups.urgent" :key="t.id" class="travail-card travail-card--urgent">
                <div class="travail-card-header">
                  <div class="travail-card-meta">
                    <span class="travail-type-badge" :class="`type-${t.type}`">{{ t.type }}</span>
                    <span v-if="t.category" class="tag-badge">
                      <component v-if="parseCategoryIcon(t.category).icon" :is="parseCategoryIcon(t.category).icon!" :size="10" style="flex-shrink:0" />
                      {{ parseCategoryIcon(t.category).label }}
                    </span>
                    <span v-if="t.channel_name" class="travail-channel"># {{ t.channel_name }}</span>
                  </div>
                  <span class="deadline-badge" :class="deadlineClass(t.deadline)">
                    <Clock :size="10" />{{ deadlineLabel(t.deadline) }}
                  </span>
                </div>
                <h3 class="travail-card-title">{{ t.title }}</h3>
                <p v-if="t.description" class="travail-card-desc">{{ t.description }}</p>
                <template v-if="depositingTravailId === t.id">
                  <div class="deposit-form">
                    <div class="deposit-type-toggle">
                      <button class="deposit-toggle-btn" :class="{ active: depositMode === 'file' }" @click="depositMode = 'file'">
                        <FileText :size="12" /> Fichier
                      </button>
                      <button class="deposit-toggle-btn" :class="{ active: depositMode === 'link' }" @click="depositMode = 'link'">
                        <Link2 :size="12" /> Lien URL
                      </button>
                    </div>
                    <div v-if="depositMode === 'file'">
                      <div v-if="depositFile" class="deposit-file-selected">
                        <CheckCircle2 :size="15" class="deposit-file-selected-icon" />
                        <span class="deposit-file-selected-name">{{ depositFileName }}</span>
                        <button class="deposit-file-selected-clear" type="button" @click.stop="clearDepositFile">
                          <X :size="12" />
                        </button>
                      </div>
                      <div v-else class="deposit-file-zone" @click="pickFile">
                        <Upload :size="20" class="deposit-file-zone-icon" />
                        <span class="deposit-file-zone-label">Cliquer pour choisir un fichier</span>
                        <span class="deposit-file-zone-hint">PDF, images, archives…</span>
                      </div>
                    </div>
                    <input v-else v-model="depositLink" class="form-input" placeholder="https://…" type="url" />
                    <div class="deposit-actions">
                      <button class="btn-ghost btn-deposit-cancel" @click="cancelDeposit"><X :size="12" /> Annuler</button>
                      <button
                        class="btn-primary btn-deposit-submit"
                        :disabled="depositing || isExpired(t.deadline) || (depositMode === 'file' ? !depositFile : !depositLink.trim())"
                        @click="submitDeposit(t)"
                      >
                        <Upload :size="12" />
                        {{ depositing ? 'Dépôt…' : isExpired(t.deadline) ? 'Délai expiré' : 'Déposer' }}
                      </button>
                    </div>
                  </div>
                </template>
                <div v-else class="travail-card-footer">
                  <span class="travail-deadline-date">Échéance : {{ formatDate(t.deadline) }}</span>
                  <button class="btn-primary btn-deposit" @click="startDeposit(t)">
                    <Upload :size="12" /> Déposer
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- ▸ À RENDRE -->
          <template v-if="filteredStudentGroups.pending.length">
            <div class="group-header group-header--accent">
              <Clock :size="12" /> À rendre
              <span class="group-count">{{ filteredStudentGroups.pending.length }}</span>
            </div>
            <div class="travaux-list">
              <div v-for="t in filteredStudentGroups.pending" :key="t.id" class="travail-card travail-card--pending">
                <div class="travail-card-header">
                  <div class="travail-card-meta">
                    <span class="travail-type-badge" :class="`type-${t.type}`">{{ t.type }}</span>
                    <span v-if="t.category" class="tag-badge">
                      <component v-if="parseCategoryIcon(t.category).icon" :is="parseCategoryIcon(t.category).icon!" :size="10" style="flex-shrink:0" />
                      {{ parseCategoryIcon(t.category).label }}
                    </span>
                    <span v-if="t.channel_name" class="travail-channel"># {{ t.channel_name }}</span>
                  </div>
                  <span class="deadline-badge" :class="deadlineClass(t.deadline)">
                    <Clock :size="10" />{{ deadlineLabel(t.deadline) }}
                  </span>
                </div>
                <h3 class="travail-card-title">{{ t.title }}</h3>
                <p v-if="t.description" class="travail-card-desc">{{ t.description }}</p>
                <template v-if="depositingTravailId === t.id">
                  <div class="deposit-form">
                    <div class="deposit-type-toggle">
                      <button class="deposit-toggle-btn" :class="{ active: depositMode === 'file' }" @click="depositMode = 'file'">
                        <FileText :size="12" /> Fichier
                      </button>
                      <button class="deposit-toggle-btn" :class="{ active: depositMode === 'link' }" @click="depositMode = 'link'">
                        <Link2 :size="12" /> Lien URL
                      </button>
                    </div>
                    <div v-if="depositMode === 'file'">
                      <div v-if="depositFile" class="deposit-file-selected">
                        <CheckCircle2 :size="15" class="deposit-file-selected-icon" />
                        <span class="deposit-file-selected-name">{{ depositFileName }}</span>
                        <button class="deposit-file-selected-clear" type="button" @click.stop="clearDepositFile">
                          <X :size="12" />
                        </button>
                      </div>
                      <div v-else class="deposit-file-zone" @click="pickFile">
                        <Upload :size="20" class="deposit-file-zone-icon" />
                        <span class="deposit-file-zone-label">Cliquer pour choisir un fichier</span>
                        <span class="deposit-file-zone-hint">PDF, images, archives…</span>
                      </div>
                    </div>
                    <input v-else v-model="depositLink" class="form-input" placeholder="https://…" type="url" />
                    <div class="deposit-actions">
                      <button class="btn-ghost btn-deposit-cancel" @click="cancelDeposit"><X :size="12" /> Annuler</button>
                      <button
                        class="btn-primary btn-deposit-submit"
                        :disabled="depositing || isExpired(t.deadline) || (depositMode === 'file' ? !depositFile : !depositLink.trim())"
                        @click="submitDeposit(t)"
                      >
                        <Upload :size="12" />
                        {{ depositing ? 'Dépôt…' : isExpired(t.deadline) ? 'Délai expiré' : 'Déposer' }}
                      </button>
                    </div>
                  </div>
                </template>
                <div v-else class="travail-card-footer">
                  <span class="travail-deadline-date">Échéance : {{ formatDate(t.deadline) }}</span>
                  <button class="btn-primary btn-deposit" @click="startDeposit(t)">
                    <Upload :size="12" /> Déposer
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- ▸ RENDUS -->
          <template v-if="filteredStudentGroups.submitted.length">
            <div class="group-header group-header--success">
              <CheckCircle2 :size="12" /> Rendus
              <span class="group-count">{{ filteredStudentGroups.submitted.length }}</span>
            </div>
            <div class="travaux-list">
              <div v-for="t in filteredStudentGroups.submitted" :key="t.id" class="travail-card travail-card--submitted">
                <div class="travail-card-header">
                  <div class="travail-card-meta">
                    <span class="travail-type-badge" :class="`type-${t.type}`">{{ t.type }}</span>
                    <span v-if="t.category" class="tag-badge">
                      <component v-if="parseCategoryIcon(t.category).icon" :is="parseCategoryIcon(t.category).icon!" :size="10" style="flex-shrink:0" />
                      {{ parseCategoryIcon(t.category).label }}
                    </span>
                    <span v-if="t.channel_name" class="travail-channel"># {{ t.channel_name }}</span>
                  </div>
                  <span class="deadline-badge" :class="deadlineClass(t.deadline)">
                    <Clock :size="10" />{{ deadlineLabel(t.deadline) }}
                  </span>
                </div>
                <h3 class="travail-card-title">{{ t.title }}</h3>
                <p v-if="t.description" class="travail-card-desc">{{ t.description }}</p>
                <div class="travail-submitted-info">
                  <CheckCircle2 :size="14" />
                  <span>Rendu déposé</span>
                </div>
              </div>
            </div>
          </template>

        </div><!-- /travaux-grouped -->
      </template>

      <!-- ════════════════════════ Vue GANTT (prof) ════════════════════════ -->
      <template v-else-if="teacherView === 'gantt'">

        <div v-if="travauxStore.loading" class="gantt-skel">
          <div v-for="i in 5" :key="i" class="gantt-skel-row">
            <div class="skel skel-line skel-w30" style="height:13px;flex-shrink:0;width:200px" />
            <div class="skel skel-line" style="height:24px;flex:1" />
          </div>
        </div>

        <div v-else-if="filteredGanttItems.items.length === 0" class="empty-state-custom">
          <BarChart2 :size="48" class="empty-icon" />
          <h3>Aucun travail créé</h3>
          <p>Créez un premier travail pour visualiser le Gantt.</p>
        </div>

        <div v-else class="gantt-wrapper">
          <!-- Légende -->
          <div class="gantt-legend">
            <span class="legend-pill type-devoir">Devoir</span>
            <span class="legend-pill type-projet">Projet</span>
            <span class="legend-pill type-jalon">Jalon</span>
            <span class="legend-pill type-tp">TP</span>
            <span class="legend-separator" />
            <span class="legend-today">
              <span class="legend-today-line" /> Aujourd'hui
            </span>
          </div>

          <!-- Grille Gantt -->
          <div class="gantt-chart">
            <div
              v-for="item in filteredGanttItems.items"
              :key="item.id"
              class="gantt-row"
              @click="openTravail(item.id)"
            >
              <div class="gantt-row-label">
                <span class="gantt-label-type travail-type-badge" :class="`type-${item.type}`">{{ item.type }}</span>
                <span class="gantt-label-name">{{ item.title }}</span>
                <span class="deadline-badge" :class="item.dlClass">{{ formatDate(item.deadline) }}</span>
              </div>
              <div class="gantt-track">
                <div class="gantt-today-marker" :style="{ left: filteredGanttItems.todayPct + '%' }" />
                <div
                  class="gantt-bar"
                  :class="`type-${item.type}`"
                  :style="{ left: item.left + '%', width: item.width + '%' }"
                  :title="item.title"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ════════════════════════ Vue LISTE (prof) ════════════════════════ -->
      <template v-else-if="teacherView === 'liste'">

        <div v-if="travauxStore.loading" class="liste-grid">
          <div v-for="i in 6" :key="i" class="skel-card">
            <div class="skel skel-line skel-w30" style="height:11px" />
            <div class="skel skel-line skel-w70" style="height:16px;margin-top:8px" />
            <div class="skel skel-line skel-w50" style="height:11px;margin-top:6px" />
            <div class="skel skel-line skel-w30" style="height:20px;margin-top:10px" />
          </div>
        </div>

        <div v-else-if="filteredListItems.length === 0" class="empty-state-custom">
          <Grid :size="48" class="empty-icon" />
          <h3>Aucun travail créé</h3>
          <p>Créez un premier travail pour le voir ici.</p>
        </div>

        <div v-else class="liste-grid">
          <div
            v-for="t in filteredListItems"
            :key="t.id"
            class="liste-card"
            @click="openTravail(t.id)"
          >
            <div class="liste-card-top">
              <span class="travail-type-badge" :class="`type-${t.type}`">{{ t.type }}</span>
              <ChevronRight :size="14" class="liste-card-chevron" />
            </div>
            <h3 class="liste-card-title">{{ t.title }}</h3>
            <div class="liste-card-meta">
              <span v-if="t.channel_name" class="liste-card-channel"># {{ t.channel_name }}</span>
              <span v-if="t.category" class="tag-badge">
                <component v-if="parseCategoryIcon(t.category).icon" :is="parseCategoryIcon(t.category).icon!" :size="10" style="flex-shrink:0" />
                {{ parseCategoryIcon(t.category).label }}
              </span>
            </div>
            <div class="liste-card-footer">
              <span class="deadline-badge" :class="deadlineClass(t.deadline)">
                <Clock :size="10" />{{ deadlineLabel(t.deadline) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- ════════════════════════ Vue RENDUS (prof) ════════════════════════ -->
      <template v-else>

        <div v-if="travauxStore.loading" class="travaux-list">
          <div v-for="i in 3" :key="i" class="skel-card">
            <div class="skel skel-line skel-w50" style="height:16px" />
            <div class="skel skel-line skel-w30" style="height:12px;margin-top:8px" />
          </div>
        </div>

        <div v-else-if="filteredRendusByTravail.length === 0" class="empty-state-custom">
          <Users :size="48" class="empty-icon" />
          <h3>Aucun rendu pour cette promotion</h3>
          <p>Les rendus des étudiants apparaîtront ici.</p>
        </div>

        <div v-else class="travaux-list">
          <div
            v-for="group in filteredRendusByTravail"
            :key="group.travail.id"
            class="rendus-group"
          >
            <div class="rendus-group-header">
              <div class="rendus-group-header-left">
                <span
                  v-if="(group.travail as Travail).type"
                  class="travail-type-badge"
                  :class="`type-${(group.travail as Travail).type}`"
                >
                  {{ (group.travail as Travail).type }}
                </span>
                <span class="rendus-group-title">
                  {{ (group.travail as Travail).title ?? `Travail #${group.travail.id}` }}
                </span>
                <span class="rendus-count-badge">
                  {{ group.rendus.length }} rendu{{ group.rendus.length > 1 ? 's' : '' }}
                </span>
              </div>
              <button class="btn-ghost btn-ouvrir" @click="openTravail(group.travail.id!)">
                Ouvrir <ChevronRight :size="13" />
              </button>
            </div>

            <div class="rendus-list">
              <div v-for="r in group.rendus" :key="r.id" class="rendu-row">
                <div class="rendu-avatar" :style="{ background: avatarColor(r.student_name) }">
                  {{ initials(r.student_name) }}
                </div>
                <div class="rendu-info">
                  <span class="rendu-student">{{ r.student_name }}</span>
                  <span class="rendu-file">
                    <Link2 v-if="r.type === 'link'" :size="10" />
                    <FileText v-else :size="10" />
                    {{ r.type === 'file' ? (r.file_name ?? r.content) : r.content }}
                  </span>
                </div>
                <div class="rendu-right">
                  <span v-if="r.note" class="note-badge">
                    <Award :size="11" /> {{ r.note }}
                  </span>
                  <span v-else class="rendu-no-note">Non noté</span>
                  <p v-if="r.feedback" class="rendu-feedback">{{ r.feedback }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div><!-- /travaux-content -->
  </div><!-- /travaux-area -->
</template>

<style scoped>
/* ── Layout principal ─────────────────────────────────────────────────────── */
.travaux-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  background: var(--bg-main);
}

/* ── En-tête ─────────────────────────────────────────────────────────────── */
.travaux-header {
  height: var(--header-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.travaux-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-channel-ctx {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
}

.travaux-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-nouveau {
  font-size: 13px;
  padding: 6px 12px;
}

/* ── Toggle vue enseignant ───────────────────────────────────────────────── */
.view-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
  font-family: var(--font);
}
.view-toggle-btn.active             { background: var(--accent); color: #fff; }
.view-toggle-btn:hover:not(.active) { color: var(--text-primary); }

/* ── Barre de stats étudiant ─────────────────────────────────────────────── */
.student-stats-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
}
.stat-chip strong { font-weight: 700; }

.stat-chip-neutral { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }
.stat-chip-blue    { background: rgba(74, 144, 217, 0.12);  border-color: rgba(74, 144, 217, 0.2);   color: var(--accent-light); }
.stat-chip-red     { background: rgba(231, 76, 60, 0.12);   border-color: rgba(231, 76, 60, 0.2);    color: #ff7b6b; }
.stat-chip-green   { background: rgba(39, 174, 96, 0.12);   border-color: rgba(39, 174, 96, 0.2);    color: #5dd08a; }

.stat-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-neutral { background: var(--text-muted); }
.dot-blue    { background: var(--accent); }
.dot-red     { background: var(--color-danger); }
.dot-green   { background: var(--color-success); }

/* ── Contenu scrollable ──────────────────────────────────────────────────── */
.travaux-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* ── Liste commune ─────────────────────────────────────────────────────────── */
.travaux-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 780px;
  margin: 0 auto;
}

/* ── Groupes urgence étudiant ────────────────────────────────────────────── */
.travaux-grouped {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 780px;
  margin: 0 auto;
}

.group-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 4px;
}

.group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
}

.group-header--danger  { color: var(--color-danger); }
.group-header--warning { color: var(--color-warning); }
.group-header--accent  { color: var(--accent-light); }
.group-header--success { color: var(--color-success); }

/* ── Carte étudiant ──────────────────────────────────────────────────────── */
.travail-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: 10px;
  padding: 16px;
  transition: border-color var(--t-base);
}
.travail-card:hover { border-color: rgba(74, 144, 217, 0.3); }

.travail-card--overdue   { border-left-color: var(--color-danger);  }
.travail-card--overdue:hover   { border-left-color: var(--color-danger);  }
.travail-card--urgent    { border-left-color: var(--color-warning); }
.travail-card--urgent:hover    { border-left-color: var(--color-warning); }
.travail-card--pending   { border-left-color: var(--accent);        }
.travail-card--pending:hover   { border-left-color: var(--accent);        }
.travail-card--submitted { border-left-color: var(--color-success); }
.travail-card--submitted:hover { border-left-color: var(--color-success); border-color: rgba(39, 174, 96, 0.3); }

/* En-tête de carte */
.travail-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.travail-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.travail-channel {
  font-size: 11px;
  color: var(--text-muted);
}

/* Titre + description */
.travail-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.travail-card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Statut rendu */
.travail-submitted-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-success);
  margin-top: 8px;
}

/* Pied de carte */
.travail-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.travail-deadline-date {
  font-size: 12px;
  color: var(--text-muted);
}

.btn-deposit-expired {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: var(--radius-sm);
  background: rgba(231, 76, 60, 0.08);
  color: var(--color-danger);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font);
  cursor: not-allowed;
  opacity: 0.75;
}

.btn-deposit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 12px;
}

/* ── Formulaire de dépôt inline ──────────────────────────────────────────── */
.deposit-form {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-input);
  border-radius: 8px;
  padding: 14px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.deposit-type-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  align-self: flex-start;
}

.deposit-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
  font-family: var(--font);
}
.deposit-toggle-btn.active             { background: var(--accent); color: #fff; }
.deposit-toggle-btn:hover:not(.active) { color: var(--text-primary); }

.deposit-file-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 14px;
  border: 1.5px dashed var(--border-input);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: border-color var(--t-fast), background var(--t-fast);
}
.deposit-file-zone:hover {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.deposit-file-zone-icon       { color: var(--text-muted); margin-bottom: 2px; }
.deposit-file-zone:hover .deposit-file-zone-icon { color: var(--accent); }
.deposit-file-zone-label      { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.deposit-file-zone-hint       { font-size: 11px; color: var(--text-muted); opacity: .7; }

.deposit-file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1.5px solid #27AE60;
  border-radius: 8px;
  background: rgba(39, 174, 96, 0.08);
}

.deposit-file-selected-icon { color: #27AE60; flex-shrink: 0; }

.deposit-file-selected-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deposit-file-selected-clear {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color var(--t-fast), background var(--t-fast);
}
.deposit-file-selected-clear:hover { color: #ff6b6b; background: rgba(231, 76, 60, 0.12); }

.deposit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-deposit-submit { font-size: 12px; padding: 6px 14px; }
.btn-deposit-cancel { font-size: 12px; padding: 6px 12px; }

/* ── Squelettes ──────────────────────────────────────────────────────────── */
.skel-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── État vide ────────────────────────────────────────────────────────────── */
.empty-state-custom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  color: var(--text-muted);
  opacity: 0.35;
  margin-bottom: 16px;
}

.empty-state-custom h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.empty-state-custom p {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.5;
}

/* ── Badges de type ──────────────────────────────────────────────────────── */
.travail-type-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 4px;
}

.type-devoir { background: rgba(74, 144, 217, 0.2);  color: var(--accent); }
.type-projet { background: rgba(123, 104, 238, 0.2); color: #9b87f5; }
.type-jalon  { background: rgba(243, 156, 18, 0.2);  color: var(--color-warning); }
.type-tp     { background: rgba(39, 174, 96, 0.2);   color: var(--color-success); }

/* ── Gantt ───────────────────────────────────────────────────────────────── */
.gantt-wrapper { max-width: 1000px; margin: 0 auto; }

.gantt-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
}
.legend-pill::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.legend-pill.type-devoir { color: var(--accent); }
.legend-pill.type-projet { color: #9b87f5; }
.legend-pill.type-jalon  { color: var(--color-warning); }
.legend-pill.type-tp     { color: var(--color-success); }
.legend-pill.type-devoir::before { background: var(--accent); }
.legend-pill.type-projet::before { background: #9b87f5; }
.legend-pill.type-jalon::before  { background: var(--color-warning); }
.legend-pill.type-tp::before     { background: var(--color-success); }

.legend-separator { width: 1px; height: 16px; background: var(--border); }

.legend-today {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.legend-today-line {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 1px;
}

.gantt-chart { display: flex; flex-direction: column; gap: 6px; }

.gantt-row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background var(--t-fast);
}
.gantt-row:hover { background: rgba(255, 255, 255, 0.04); }

.gantt-row-label {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.gantt-label-type { flex-shrink: 0; }

.gantt-label-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  color: var(--text-primary);
}

.gantt-track {
  flex: 1;
  height: 30px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}

.gantt-today-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  z-index: 2;
  transform: translateX(-50%);
}

.gantt-bar {
  position: absolute;
  top: 4px;
  height: 22px;
  border-radius: 5px;
  opacity: 0.85;
  transition: opacity var(--t-fast);
  z-index: 1;
}
.gantt-bar:hover            { opacity: 1; }
.gantt-bar.type-devoir      { background: var(--accent); }
.gantt-bar.type-projet      { background: #9b87f5; }
.gantt-bar.type-jalon       { background: var(--color-warning); }
.gantt-bar.type-tp          { background: var(--color-success); }

.gantt-skel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 1000px;
  margin: 0 auto;
}

.gantt-skel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
}

/* ── Vue Liste enseignant ────────────────────────────────────────────────── */
.liste-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  max-width: 1000px;
  margin: 0 auto;
}

@media (max-width: 900px) { .liste-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .liste-grid { grid-template-columns: 1fr; } }

.liste-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color var(--t-base), background var(--t-base);
}
.liste-card:hover {
  border-color: rgba(74, 144, 217, 0.35);
  background: rgba(74, 144, 217, 0.04);
}

.liste-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.liste-card-chevron {
  color: var(--text-muted);
  transition: color var(--t-fast), transform var(--t-fast);
}
.liste-card:hover .liste-card-chevron { color: var(--accent); transform: translateX(2px); }

.liste-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
}

.liste-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.liste-card-channel { font-size: 11px; color: var(--text-muted); }

.liste-card-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

/* ── Rendus groupés ──────────────────────────────────────────────────────── */
.rendus-group {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  max-width: 780px;
  margin: 0 auto;
  width: 100%;
}

.rendus-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border);
}

.rendus-group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.rendus-group-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rendus-count-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(74, 144, 217, 0.2);
  color: var(--accent);
}

.btn-ouvrir {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 5px 10px;
  margin-left: 12px;
}

.rendus-list {
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rendu-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  transition: background var(--t-fast);
}
.rendu-row:hover { background: rgba(255, 255, 255, 0.06); }

.rendu-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}

.rendu-info { flex: 1; min-width: 0; }

.rendu-student {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.rendu-file {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.rendu-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.note-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  background: rgba(74, 144, 217, 0.15);
  color: var(--accent-light);
}

.rendu-no-note {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.rendu-feedback {
  font-size: 11px;
  color: var(--text-secondary);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}
</style>
