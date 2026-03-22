/**
 * StudentBento.vue — Accueil épuré du dashboard étudiant.
 * Focus sur : projet en cours, prochains CCTLs, prochain livrable,
 * raccourcis conversations, session live.
 */
<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Award, FileText, Mic, Clock, ChevronRight,
  ArrowRight, Hash, Radio, BookOpen, FolderOpen, Smile,
} from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live'
import { useAppStore } from '@/stores/app'
import { deadlineLabel, deadlineClass } from '@/utils/date'
import { typeLabel } from '@/utils/devoir'
import type { StudentProjectCard } from '@/composables/useDashboardStudent'
import MicroRing from '@/components/ui/MicroRing.vue'

const router = useRouter()
const liveStore = useLiveStore()
const appStore = useAppStore()

const props = defineProps<{
  studentStats: { pending: number; submitted: number; graded: number; modeGrade: string | null }
  urgentActions: { id: number; title: string; isOverdue: boolean; urgency: string; category?: string | null; deadline?: string; type?: string }[]
  recentGrades: { title: string; note: string; category?: string | null }[]
  recentFeedback?: { title: string; feedback: string; note: string | null; category: string | null }[]
  studentProjectCards: StudentProjectCard[]
  hasDevoirsLoaded: boolean
}>()

const emit = defineEmits<{
  navigateDevoirs: []
  openStudentTimeline: []
  goToProject: [key: string]
}>()

// ── Projet en cours (celui avec la deadline la plus proche) ──────────────
const activeProject = computed(() => {
  if (!props.studentProjectCards.length) return null
  const withDeadline = props.studentProjectCards
    .filter(p => p.nextDeadline && new Date(p.nextDeadline).getTime() > Date.now())
    .sort((a, b) => new Date(a.nextDeadline!).getTime() - new Date(b.nextDeadline!).getTime())
  return withDeadline[0] ?? props.studentProjectCards[0]
})

// ── Prochains CCTLs / Études de cas (même jour groupés) ─────────────────
const nextExams = computed(() => {
  const now = Date.now()
  return props.urgentActions
    .filter(a => (a.type === 'cctl' || a.type === 'etude_de_cas') && a.deadline && new Date(a.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 4)
})

// ── Prochain livrable ───────────────────────────────────────────────────
const nextLivrable = computed(() => {
  const now = Date.now()
  return props.urgentActions
    .filter(a => (a.type === 'livrable' || a.type === 'memoire') && a.deadline && new Date(a.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 2)
})

// ── Prochaine soutenance ────────────────────────────────────────────────
const nextSoutenance = computed(() => {
  const now = Date.now()
  return props.urgentActions
    .filter(a => a.type === 'soutenance' && a.deadline && new Date(a.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 2)
})

// ── Live session ────────────────────────────────────────────────────────
const hasLive = computed(() => !!liveStore.currentSession && liveStore.currentSession.status === 'active')
onMounted(() => {
  const pid = appStore.activePromoId
  if (pid) liveStore.fetchActiveForPromo(pid)
})

// ── Raccourcis canaux récents ───────────────────────────────────────────
const recentChannels = ref<{ id: number; name: string }[]>([])
onMounted(() => {
  try {
    const raw = localStorage.getItem('cc_recent_channels')
    if (raw) recentChannels.value = (JSON.parse(raw) as { id: number; name: string }[]).slice(0, 4)
  } catch { /* ignore */ }
})

function goToChannel(ch: { id: number; name: string }) {
  appStore.activeChannelId = ch.id
  appStore.activeChannelName = ch.name
  router.push('/messages')
}
</script>

<template>
  <div class="sb-accueil">

    <!-- ── Live session banner ────────────────────────────────────────── -->
    <div v-if="hasLive" class="sa-live" @click="router.push('/live')">
      <Radio :size="16" class="sa-live-icon" />
      <span class="sa-live-dot" />
      <span class="sa-live-text">Session live en cours : <strong>{{ liveStore.currentSession?.title }}</strong></span>
      <button class="sa-live-btn">Rejoindre <ArrowRight :size="12" /></button>
    </div>

    <!-- ── Projet en cours ───────────────────────────────────────────── -->
    <div v-if="activeProject" class="sa-card sa-project" @click="emit('goToProject', activeProject.key)">
      <div class="sa-card-header">
        <FolderOpen :size="14" class="sa-card-icon" />
        <span class="sa-section-label">Projet en cours</span>
        <ChevronRight :size="13" class="sa-chevron" />
      </div>
      <h3 class="sa-project-name">{{ activeProject.label }}</h3>
      <div class="sa-project-meta">
        <MicroRing :value="activeProject.submitted" :total="activeProject.total" :size="22" />
        <span class="sa-mono">{{ activeProject.submitted }}/{{ activeProject.total }} rendus</span>
        <span v-if="activeProject.overdue" class="sa-badge sa-badge--danger">{{ activeProject.overdue }} en retard</span>
      </div>
      <div v-if="activeProject.nextDeadline" class="sa-project-deadline">
        <Clock :size="12" />
        <span>Prochaine échéance : <strong class="sa-mono">{{ deadlineLabel(activeProject.nextDeadline) }}</strong></span>
      </div>
    </div>

    <!-- ── Prochains CCTLs / Études de cas ───────────────────────────── -->
    <div v-if="nextExams.length" class="sa-card sa-next sa-next--exam">
      <div class="sa-card-header">
        <Award :size="14" class="sa-card-icon sa-icon--exam" />
        <span class="sa-section-label">{{ nextExams.length > 1 ? 'Prochaines épreuves' : 'Prochaine épreuve' }}</span>
      </div>
      <div class="sa-next-list">
        <div v-for="e in nextExams" :key="e.id" class="sa-next-item" @click="emit('goToProject', e.category ?? '')">
          <span class="sa-next-type devoir-type-badge" :class="`type-${e.type}`">{{ typeLabel(e.type ?? 'cctl') }}</span>
          <span class="sa-next-title">{{ e.title }}</span>
          <span class="deadline-badge" :class="deadlineClass(e.deadline!)">{{ deadlineLabel(e.deadline!) }}</span>
        </div>
      </div>
    </div>

    <!-- ── Prochain livrable ─────────────────────────────────────────── -->
    <div v-if="nextLivrable.length" class="sa-card sa-next sa-next--livrable">
      <div class="sa-card-header">
        <FileText :size="14" class="sa-card-icon sa-icon--livrable" />
        <span class="sa-section-label">{{ nextLivrable.length > 1 ? 'Prochains livrables' : 'Prochain livrable' }}</span>
      </div>
      <div class="sa-next-list">
        <div v-for="l in nextLivrable" :key="l.id" class="sa-next-item" @click="emit('goToProject', l.category ?? '')">
          <span class="sa-next-title">{{ l.title }}</span>
          <span class="deadline-badge" :class="deadlineClass(l.deadline!)">{{ deadlineLabel(l.deadline!) }}</span>
        </div>
      </div>
    </div>

    <!-- ── Prochaine soutenance ──────────────────────────────────────── -->
    <div v-if="nextSoutenance.length" class="sa-card sa-next sa-next--soutenance">
      <div class="sa-card-header">
        <Mic :size="14" class="sa-card-icon sa-icon--soutenance" />
        <span class="sa-section-label">{{ nextSoutenance.length > 1 ? 'Prochaines soutenances' : 'Prochaine soutenance' }}</span>
      </div>
      <div class="sa-next-list">
        <div v-for="s in nextSoutenance" :key="s.id" class="sa-next-item" @click="emit('goToProject', s.category ?? '')">
          <span class="sa-next-title">{{ s.title }}</span>
          <span class="deadline-badge" :class="deadlineClass(s.deadline!)">{{ deadlineLabel(s.deadline!) }}</span>
        </div>
      </div>
    </div>

    <!-- ── État "tout est à jour" ────────────────────────────────────── -->
    <div v-if="!nextExams.length && !nextLivrable.length && !nextSoutenance.length && hasDevoirsLoaded" class="sa-card sa-ok">
      <Smile :size="20" class="sa-ok-icon" />
      <span class="sa-ok-text">Aucune échéance à venir — tout est à jour</span>
    </div>

    <!-- ── Raccourcis conversations ──────────────────────────────────── -->
    <div v-if="recentChannels.length" class="sa-shortcuts">
      <div class="sa-card-header">
        <Hash :size="14" class="sa-card-icon" />
        <span class="sa-section-label">Conversations récentes</span>
      </div>
      <div class="sa-shortcuts-grid">
        <button
          v-for="ch in recentChannels" :key="ch.id"
          class="sa-shortcut"
          @click="goToChannel(ch)"
        >
          <Hash :size="12" class="sa-shortcut-hash" />
          <span>{{ ch.name }}</span>
        </button>
      </div>
    </div>

    <!-- ── Raccourcis rapides ─────────────────────────────────────────── -->
    <div class="sa-actions">
      <button class="sa-action" @click="emit('navigateDevoirs')">
        <BookOpen :size="16" />
        <span>Tous mes devoirs</span>
        <ChevronRight :size="13" class="sa-chevron" />
      </button>
      <button class="sa-action" @click="emit('openStudentTimeline')">
        <Clock :size="16" />
        <span>Ma timeline</span>
        <ChevronRight :size="13" class="sa-chevron" />
      </button>
    </div>

  </div>
</template>

<style scoped>
.sb-accueil {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Cards base ─────────────────────────────────────────────────────────── */
.sa-card {
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sa-card:hover { background: rgba(255,255,255,.045); }

.sa-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.sa-card-icon { color: var(--text-muted); flex-shrink: 0; }
.sa-section-label {
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  flex: 1;
}
.sa-chevron { color: var(--text-muted); opacity: .3; transition: opacity .15s; }
.sa-card:hover .sa-chevron { opacity: .7; }

.sa-mono {
  font-family: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;
  font-size: 12px;
}

/* ── Live banner ────────────────────────────────────────────────────────── */
.sa-live {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(231,76,60,.08);
  border: 1px solid rgba(231,76,60,.25);
  cursor: pointer;
  transition: background .15s;
}
.sa-live:hover { background: rgba(231,76,60,.12); }
.sa-live-icon { color: var(--color-danger); }
.sa-live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--color-danger);
  animation: sa-pulse 1.5s ease-in-out infinite;
}
@keyframes sa-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
.sa-live-text { flex: 1; font-size: 13px; color: var(--text-primary); }
.sa-live-btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 700; padding: 5px 12px;
  border: none; border-radius: 6px;
  background: var(--color-danger); color: #fff;
  cursor: pointer; font-family: var(--font);
}

/* ── Projet en cours ────────────────────────────────────────────────────── */
.sa-project { cursor: pointer; }
.sa-project-name {
  font-size: 16px; font-weight: 800; color: var(--text-primary);
  margin-bottom: 8px; line-height: 1.2;
}
.sa-project-meta {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);
}
.sa-project-deadline {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--text-muted);
}

.sa-badge {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 4px;
}
.sa-badge--danger { background: rgba(231,76,60,.12); color: var(--color-danger); }

/* ── Prochains événements ───────────────────────────────────────────────── */
.sa-next--exam      { border-left: 3px solid var(--color-cctl, #9b87f5); }
.sa-next--livrable  { border-left: 3px solid var(--accent); }
.sa-next--soutenance { border-left: 3px solid var(--color-warning); }

.sa-icon--exam      { color: var(--color-cctl, #9b87f5); }
.sa-icon--livrable  { color: var(--accent); }
.sa-icon--soutenance { color: var(--color-warning); }

.sa-next-list { display: flex; flex-direction: column; gap: 6px; }
.sa-next-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  background: rgba(255,255,255,.02);
  cursor: pointer;
  transition: background .15s;
}
.sa-next-item:hover { background: rgba(255,255,255,.06); }
.sa-next-title {
  flex: 1; font-size: 13px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Tout est à jour ────────────────────────────────────────────────────── */
.sa-ok {
  display: flex; align-items: center; gap: 10px;
  background: rgba(46,204,113,.06);
  border-color: rgba(46,204,113,.2);
}
.sa-ok-icon { color: var(--color-success); }
.sa-ok-text { font-size: 13px; color: var(--color-success); font-weight: 600; }

/* ── Raccourcis conversations ───────────────────────────────────────────── */
.sa-shortcuts { margin-top: 2px; }
.sa-shortcuts-grid {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.sa-shortcut {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: 8px;
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12.5px; font-weight: 500;
  cursor: pointer; font-family: var(--font);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sa-shortcut:hover {
  background: rgba(74,144,217,.08);
  border-color: rgba(74,144,217,.25);
  color: var(--accent);
}
.sa-shortcut-hash { color: var(--text-muted); }

/* ── Raccourcis rapides ─────────────────────────────────────────────────── */
.sa-actions {
  display: flex; gap: 10px;
}
.sa-action {
  flex: 1;
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-radius: 10px;
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--font);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sa-action:hover {
  background: rgba(255,255,255,.05);
  color: var(--text-primary);
}
.sa-action .sa-chevron { margin-left: auto; }

@media (max-width: 600px) {
  .sa-actions { flex-direction: column; }
  .sa-shortcuts-grid { flex-direction: column; }
}
</style>
