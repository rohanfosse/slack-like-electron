/**
 * GameSidebar — panneau lateral partage par tous les mini-jeux arcade.
 *
 * Trois blocs :
 *   1. Stats perso (best all-time, best today, plays, rang du jour)
 *   2. Leaderboard top 10 avec onglets Jour / Semaine / Tout
 *   3. Historique compact des 5 dernieres parties
 *
 * Branche sur `useArcadeGame` via les refs passees en props. TypeRace a son
 * propre pipeline (wpm/accuracy) et garde un sidebar dedie.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { Trophy, Medal, Clock, Hash, TrendingUp } from 'lucide-vue-next'
import type { ArcadeLeaderboardRow, ArcadeMyStats, ArcadeScope } from '@/composables/useArcadeGame'

interface Props {
  leaderboard: ArcadeLeaderboardRow[]
  myStats: ArcadeMyStats | null
  scope: ArcadeScope
  currentUserName: string | null
  /** Couleur d accent du jeu (depuis le registre). */
  accent?: string
}
const props = withDefaults(defineProps<Props>(), { accent: 'var(--accent)' })

defineEmits<{ (e: 'change-scope', s: ArcadeScope): void }>()

const myRank = computed(() =>
  props.currentUserName
    ? props.leaderboard.find(e => e.name === props.currentUserName)?.rank ?? null
    : null,
)

const scopeLabel = computed(() => {
  if (props.scope === 'day')  return 'Aujourd hui'
  if (props.scope === 'week') return '7 derniers jours'
  return 'Tout temps'
})

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'a l instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m${r.toString().padStart(2, '0')}`
}
</script>

<template>
  <aside class="gs-root" :style="{ '--gs-accent': accent }">
    <!-- ═══ Stats perso ═══ -->
    <section class="gs-block gs-stats">
      <header class="gs-block-header">
        <TrendingUp :size="12" />
        <span>Mes stats</span>
      </header>
      <div class="gs-stats-grid">
        <div class="gs-stat">
          <span class="gs-stat-label">Best total</span>
          <span class="gs-stat-value">{{ myStats?.allTime.bestScore ?? 0 }}</span>
        </div>
        <div class="gs-stat">
          <span class="gs-stat-label">Best aujourd hui</span>
          <span class="gs-stat-value">{{ myStats?.today.bestScore ?? 0 }}</span>
        </div>
        <div class="gs-stat">
          <span class="gs-stat-label">Parties</span>
          <span class="gs-stat-value">{{ myStats?.allTime.plays ?? 0 }}</span>
        </div>
        <div class="gs-stat" :class="{ 'gs-stat--highlight': myRank && myRank <= 3 }">
          <span class="gs-stat-label">Rang jour</span>
          <span class="gs-stat-value">
            <template v-if="myRank">#{{ myRank }}</template>
            <template v-else>—</template>
          </span>
        </div>
      </div>
    </section>

    <!-- ═══ Leaderboard avec onglets ═══ -->
    <section class="gs-block gs-lb">
      <header class="gs-block-header gs-lb-header">
        <div class="gs-lb-title">
          <Trophy :size="12" />
          <span>Classement</span>
        </div>
        <div class="gs-tabs" role="tablist">
          <button
            v-for="s in (['day', 'week', 'all'] as const)"
            :key="s"
            role="tab"
            :aria-selected="scope === s"
            class="gs-tab"
            :class="{ 'gs-tab--active': scope === s }"
            @click="$emit('change-scope', s)"
          >
            {{ s === 'day' ? 'Jour' : s === 'week' ? 'Sem.' : 'Tout' }}
          </button>
        </div>
      </header>

      <ol v-if="leaderboard.length" class="gs-lb-list">
        <li
          v-for="e in leaderboard.slice(0, 10)"
          :key="`${e.userType}-${e.userId}`"
          class="gs-lb-row"
          :class="{
            'gs-lb-row--me':     e.name === currentUserName,
            'gs-lb-row--gold':   e.rank === 1,
            'gs-lb-row--silver': e.rank === 2,
            'gs-lb-row--bronze': e.rank === 3,
          }"
          :title="`${e.plays} partie${e.plays > 1 ? 's' : ''}`"
        >
          <span class="gs-lb-rank">
            <Medal v-if="e.rank <= 3" :size="12" />
            <template v-else>{{ e.rank }}</template>
          </span>
          <span class="gs-lb-name">{{ e.name }}</span>
          <span class="gs-lb-bar" aria-hidden="true">
            <span class="gs-lb-bar-fill" :style="{
              width: leaderboard[0]?.bestScore ? `${(e.bestScore / leaderboard[0].bestScore) * 100}%` : '0%',
            }" />
          </span>
          <span class="gs-lb-score">{{ e.bestScore }}</span>
        </li>
      </ol>
      <p v-else class="gs-empty">
        {{ scope === 'day' ? 'Sois le premier a jouer aujourd hui.' : 'Aucun score sur cette periode.' }}
      </p>
    </section>

    <!-- ═══ Historique recent ═══ -->
    <section v-if="myStats && myStats.history.length" class="gs-block gs-history">
      <header class="gs-block-header">
        <Clock :size="12" />
        <span>Mes dernieres parties</span>
      </header>
      <ul class="gs-history-list">
        <li v-for="h in myStats.history.slice(0, 5)" :key="h.id" class="gs-history-row">
          <span class="gs-history-score">{{ h.score }}</span>
          <span class="gs-history-meta">
            <Hash :size="10" aria-hidden="true" />
            {{ formatDuration(h.durationMs) }}
          </span>
          <span class="gs-history-ago">{{ formatAgo(h.createdAt) }}</span>
        </li>
      </ul>
    </section>

    <p class="gs-scope-hint" :aria-label="`Periode selectionnee : ${scopeLabel}`">
      {{ scopeLabel }}
    </p>
  </aside>
</template>

<style scoped>
.gs-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  min-height: 0;
  overflow: auto;
  --gs-accent: var(--accent);
}

/* ── Block commun ── */
.gs-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gs-block-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--text-secondary);
}

/* ── Stats perso ── */
.gs-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.gs-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  min-width: 0;
}
.gs-stat-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: .3px;
  color: var(--text-muted);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gs-stat-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.gs-stat--highlight {
  background: color-mix(in srgb, var(--gs-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--gs-accent) 35%, transparent);
}
.gs-stat--highlight .gs-stat-value { color: var(--gs-accent); }

/* ── Leaderboard ── */
.gs-lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.gs-lb-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.gs-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-elevated);
  border-radius: 7px;
  border: 1px solid var(--border);
}
.gs-tab {
  padding: 3px 9px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font);
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 5px;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.gs-tab:hover { color: var(--text-primary); }
.gs-tab--active {
  background: var(--gs-accent);
  color: #fff;
}
.gs-tab:focus-visible { outline: var(--focus-ring); outline-offset: 1px; }

.gs-lb-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.gs-lb-row {
  display: grid;
  grid-template-columns: 22px 1fr 48px auto;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  transition: background .12s;
}
.gs-lb-row:hover { background: var(--bg-hover); color: var(--text-primary); }
.gs-lb-row--me {
  background: color-mix(in srgb, var(--gs-accent) 15%, transparent);
  color: var(--gs-accent);
  font-weight: 700;
}
.gs-lb-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
.gs-lb-row--gold   .gs-lb-rank { color: #eab308; }
.gs-lb-row--silver .gs-lb-rank { color: #94a3b8; }
.gs-lb-row--bronze .gs-lb-rank { color: #c2884d; }
.gs-lb-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gs-lb-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.gs-lb-bar-fill {
  display: block;
  height: 100%;
  background: var(--gs-accent);
  border-radius: 2px;
  transition: width .3s ease;
}
.gs-lb-row--gold   .gs-lb-bar-fill { background: #eab308; }
.gs-lb-row--silver .gs-lb-bar-fill { background: #94a3b8; }
.gs-lb-row--bronze .gs-lb-bar-fill { background: #c2884d; }
.gs-lb-score {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--text-primary);
  text-align: right;
  min-width: 34px;
}

.gs-empty {
  margin: 0;
  padding: 14px 8px;
  color: var(--text-muted);
  font-size: 11px;
  font-style: italic;
  text-align: center;
}

/* ── Historique ── */
.gs-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gs-history-row {
  display: grid;
  grid-template-columns: 48px auto 1fr;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  color: var(--text-secondary);
}
.gs-history-row:hover { background: var(--bg-hover); }
.gs-history-score {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.gs-history-meta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-muted);
  font-size: 10.5px;
}
.gs-history-ago {
  text-align: right;
  font-size: 10.5px;
  color: var(--text-muted);
}

/* ── Hint scope ── */
.gs-scope-hint {
  margin: 0;
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  font-style: italic;
  letter-spacing: .2px;
}
</style>
