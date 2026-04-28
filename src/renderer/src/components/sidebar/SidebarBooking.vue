<script setup lang="ts">
/**
 * SidebarBooking - sidebar dediee a la route `/booking`.
 *
 * Affiche en compact ce qui prenait toute la page avant la promotion en
 * route top-level (cf. v2.253) : compteurs, statut Microsoft, et les 3-5
 * prochains RDV. Les actions principales (Nouveau type / Nouvelle
 * campagne) restent dans le header de TabBooking — ici on offre juste
 * raccourcis et vue d'ensemble.
 *
 * Pas de store dedie : useBooking() est instancie ici en plus de l'instance
 * cote TabBooking. Coute reseau marginal (2 fetches en parallele au mount,
 * jamais en cours de session) et evite un refacto Pinia juste pour ca.
 */
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar, CalendarPlus, CalendarRange, Clock, Users, AlertCircle,
  Settings, Plus, Video,
} from 'lucide-vue-next'
import { useBooking } from '@/composables/useBooking'
import { useCampaigns } from '@/composables/useCampaigns'
import { useMicrosoftConnection } from '@/composables/useMicrosoftConnection'
import { useModalsStore } from '@/stores/modals'

const router = useRouter()
const modals = useModalsStore()
const booking = useBooking()
const { campaigns, fetchAll: fetchCampaigns } = useCampaigns()
const { connected: msConnected, refresh: refreshMs } = useMicrosoftConnection()

// Le bouton "Nouveau type" du header de TabBooking ecoute cet event.
// (Cf. TabBooking.vue : `window.addEventListener('cursus:booking-create-type')`.)
function emitCreateType() {
  window.dispatchEvent(new CustomEvent('cursus:booking-create-type'))
}

function openSettings() { modals.settings = true }

// ── Stats compactes ───────────────────────────────────────────────────────

const activeTypes = computed(() => booking.eventTypes.value.filter(et => et.is_active).length)
const activeCampaigns = computed(() => campaigns.value.filter(c => c.status === 'active').length)
const draftCampaigns = computed(() => campaigns.value.filter(c => c.status === 'draft').length)
const pendingCount = computed(() => booking.bookings.value.filter(b => b.status === 'pending').length)

const bookingsThisWeek = computed(() => {
  const now = new Date()
  const day = now.getDay()
  const offset = day === 0 ? 6 : day - 1
  const start = new Date(now); start.setDate(now.getDate() - offset); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(start.getDate() + 7)
  let count = 0
  for (const bk of booking.bookings.value) {
    const d = new Date(`${bk.date}T${bk.start_time}`)
    if (d >= start && d < end && bk.status !== 'cancelled') count++
  }
  return count
})

// ── Prochains RDV ─────────────────────────────────────────────────────────

interface UpcomingItem {
  id: number
  date: string
  startTime: string
  title: string
  with: string
  visioUrl?: string
  relative: string
}

const upcomingBookings = computed<UpcomingItem[]>(() => {
  const now = Date.now()
  const items: UpcomingItem[] = []
  for (const bk of booking.sortedBookings.value) {
    if (bk.status === 'cancelled') continue
    const t = new Date(`${bk.date}T${bk.start_time}`).getTime()
    if (t < now) continue
    items.push({
      id: bk.id,
      date: bk.date,
      startTime: bk.start_time,
      title: bk.event_type_title || 'Rendez-vous',
      with: bk.tutor_name || bk.student_name || '',
      visioUrl: bk.visio_url,
      relative: relativeWhen(t),
    })
    if (items.length >= 5) break
  }
  return items
})

function relativeWhen(t: number): string {
  const diffMin = Math.round((t - Date.now()) / 60000)
  if (diffMin < 60) return `dans ${Math.max(diffMin, 1)} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `dans ${diffH} h`
  const tD = new Date(t)
  const today = new Date()
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)
  if (tD.toDateString() === tomorrow.toDateString()) {
    return `demain ${tD.toTimeString().slice(0, 5)}`
  }
  return tD.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    + ' ' + tD.toTimeString().slice(0, 5)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

onMounted(() => {
  booking.fetchAll()
  booking.initSocketListeners()
  fetchCampaigns()
  refreshMs()
})

onUnmounted(() => {
  booking.disposeSocketListeners()
})

// Navigation interne (scroll to section dans TabBooking).
// Les sections n'ont pas encore d'id stables : on emet un event que la page
// ecoute eventuellement. Pour V1 on se contente d'aller a la route.
function goToBooking() {
  if (router.currentRoute.value.name !== 'booking') {
    router.push({ name: 'booking' })
  }
}
</script>

<template>
  <div class="sb-booking">
    <!-- Header -->
    <div class="sb-bk-header">
      <div class="sb-bk-header-icon">
        <Calendar :size="14" />
      </div>
      <div class="sb-bk-header-text">
        <span class="sb-bk-title">Rendez-vous</span>
        <span class="sb-bk-subtitle">Types, dispos, campagnes</span>
      </div>
    </div>

    <!-- Statut Microsoft -->
    <button
      type="button"
      class="sb-bk-ms-row"
      :class="msConnected ? 'sb-bk-ms-row--ok' : 'sb-bk-ms-row--ko'"
      :title="msConnected ? 'Microsoft connecte — gerer dans Parametres' : 'Microsoft non connecte — cliquer pour configurer'"
      @click="openSettings"
    >
      <span class="sb-bk-ms-dot" aria-hidden="true" />
      <span class="sb-bk-ms-label">{{ msConnected ? 'Microsoft connecte' : 'Microsoft non connecte' }}</span>
      <Settings :size="11" class="sb-bk-ms-gear" aria-hidden="true" />
    </button>

    <!-- Stats compactes -->
    <div class="sb-bk-stats" role="group" aria-label="Vue d'ensemble">
      <button type="button" class="sb-bk-stat" @click="goToBooking">
        <CalendarPlus :size="12" class="sb-bk-stat-icon" aria-hidden="true" />
        <span class="sb-bk-stat-label">Types actifs</span>
        <span class="sb-bk-stat-value">{{ activeTypes }}</span>
      </button>
      <button type="button" class="sb-bk-stat" @click="goToBooking">
        <Users :size="12" class="sb-bk-stat-icon" aria-hidden="true" />
        <span class="sb-bk-stat-label">RDV cette semaine</span>
        <span class="sb-bk-stat-value">{{ bookingsThisWeek }}</span>
      </button>
      <button
        type="button"
        class="sb-bk-stat"
        :class="{ 'sb-bk-stat--alert': pendingCount > 0 }"
        @click="goToBooking"
      >
        <AlertCircle :size="12" class="sb-bk-stat-icon" aria-hidden="true" />
        <span class="sb-bk-stat-label">En attente</span>
        <span class="sb-bk-stat-value">{{ pendingCount }}</span>
      </button>
      <button type="button" class="sb-bk-stat" @click="goToBooking">
        <CalendarRange :size="12" class="sb-bk-stat-icon" aria-hidden="true" />
        <span class="sb-bk-stat-label">Campagnes</span>
        <span class="sb-bk-stat-value">
          {{ activeCampaigns }}<span v-if="draftCampaigns" class="sb-bk-stat-suffix">+{{ draftCampaigns }}</span>
        </span>
      </button>
    </div>

    <!-- Prochains RDV -->
    <div class="sb-bk-section-header">
      <Clock :size="11" />
      <span>Prochains RDV</span>
    </div>
    <div v-if="!upcomingBookings.length" class="sb-bk-empty">
      Aucun RDV programme.
    </div>
    <ul v-else class="sb-bk-upcoming">
      <li v-for="bk in upcomingBookings" :key="bk.id" class="sb-bk-upcoming-item">
        <span class="sb-bk-upcoming-when">{{ bk.relative }}</span>
        <span class="sb-bk-upcoming-title">{{ bk.title }}</span>
        <span v-if="bk.with" class="sb-bk-upcoming-with">avec {{ bk.with }}</span>
        <a
          v-if="bk.visioUrl"
          class="sb-bk-upcoming-visio"
          :href="bk.visioUrl"
          target="_blank"
          rel="noopener"
          :title="`Rejoindre la visio — ${bk.title}`"
          @click.stop
        >
          <Video :size="11" />
        </a>
      </li>
    </ul>

    <!-- Actions rapides -->
    <div class="sb-bk-section-header">
      <Plus :size="11" />
      <span>Actions rapides</span>
    </div>
    <div class="sb-bk-actions">
      <button type="button" class="sb-bk-action" @click="emitCreateType">
        <Plus :size="12" />
        <span>Nouveau type de RDV</span>
        <kbd class="sb-bk-kbd" aria-hidden="true">Ctrl N</kbd>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sb-booking {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 16px;
  font-family: var(--font);
  color: var(--text-primary);
}

/* ── Header ── */
.sb-bk-header {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 4px 10px;
}
.sb-bk-header-icon {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  flex-shrink: 0;
}
.sb-bk-header-text { display: flex; flex-direction: column; min-width: 0; }
.sb-bk-title {
  font-size: 13px; font-weight: 700; color: var(--text-primary); line-height: 1.2;
}
.sb-bk-subtitle {
  font-size: 10px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .04em; font-weight: 600;
}

/* ── Microsoft pill ── */
.sb-bk-ms-row {
  display: flex; align-items: center; gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 11px; font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out);
}
.sb-bk-ms-row:hover { background: var(--bg-hover); border-color: var(--border-input); }
.sb-bk-ms-row:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.sb-bk-ms-row--ok {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 35%, transparent);
  background: color-mix(in srgb, var(--color-success) 8%, var(--bg-elevated));
}
.sb-bk-ms-row--ko { color: var(--text-muted); }
.sb-bk-ms-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}
.sb-bk-ms-row--ok .sb-bk-ms-dot { background: var(--color-success); }
.sb-bk-ms-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-bk-ms-gear { color: var(--text-muted); flex-shrink: 0; }

/* ── Stats grid (2x2) ── */
.sb-bk-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 4px;
}
.sb-bk-stat {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 9px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out);
}
.sb-bk-stat:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  background: var(--bg-hover);
}
.sb-bk-stat:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.sb-bk-stat--alert {
  border-color: color-mix(in srgb, var(--color-warning) 35%, transparent);
  background: color-mix(in srgb, var(--color-warning) 8%, var(--bg-elevated));
}
.sb-bk-stat--alert .sb-bk-stat-icon { color: var(--color-warning); }
.sb-bk-stat-icon {
  position: absolute;
  top: 6px;
  right: 7px;
  color: var(--text-muted);
}
.sb-bk-stat-label {
  font-size: 10px; font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .04em;
  line-height: 1.2;
}
.sb-bk-stat-value {
  font-size: 18px; font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.sb-bk-stat-suffix {
  font-size: 11px; font-weight: 600;
  color: var(--text-muted);
  margin-left: 2px;
}

/* ── Section headers ── */
.sb-bk-section-header {
  display: flex; align-items: center; gap: 6px;
  margin: 12px 4px 4px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-muted);
}

/* ── Prochains RDV ── */
.sb-bk-empty {
  padding: 8px 10px;
  font-size: 11px; color: var(--text-muted);
  font-style: italic;
}
.sb-bk-upcoming {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sb-bk-upcoming-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    'when title visio'
    'when with  visio';
  align-items: center;
  gap: 1px 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: background var(--motion-fast) var(--ease-out);
}
.sb-bk-upcoming-item:hover { background: var(--bg-hover); }
.sb-bk-upcoming-when {
  grid-area: when;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}
.sb-bk-upcoming-title {
  grid-area: title;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-bk-upcoming-with {
  grid-area: with;
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-bk-upcoming-visio {
  grid-area: visio;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border-radius: var(--radius-xs);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  text-decoration: none;
  flex-shrink: 0;
  transition: background var(--motion-fast) var(--ease-out);
}
.sb-bk-upcoming-visio:hover {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}
.sb-bk-upcoming-visio:focus-visible { outline: none; box-shadow: var(--focus-ring); }

/* ── Actions rapides ── */
.sb-bk-actions {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.sb-bk-action {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all var(--motion-fast) var(--ease-out);
}
.sb-bk-action:hover {
  border-style: solid;
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  color: var(--accent);
}
.sb-bk-action:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.sb-bk-kbd {
  margin-left: auto;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 9.5px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-muted);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .sb-bk-stat,
  .sb-bk-ms-row,
  .sb-bk-action,
  .sb-bk-upcoming-item,
  .sb-bk-upcoming-visio { transition: none; }
}
</style>
