/**
 * WidgetNotationPending.vue — Devoirs avec le plus de rendus en attente
 * de note. Aide le prof a prioriser sa charge de correction.
 */
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Edit3, ChevronRight, AlertCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useTravauxStore } from '@/stores/travaux'
import { useAppStore } from '@/stores/app'
import { useModalsStore } from '@/stores/modals'

const router = useRouter()
const travauxStore = useTravauxStore()
const appStore = useAppStore()
const modals = useModalsStore()

onMounted(async () => {
  const promoId = appStore.activePromoId ?? appStore.currentUser?.promo_id
  if (!promoId) return
  if (travauxStore.allRendus.length === 0) {
    await travauxStore.fetchRendus(promoId)
  }
})

interface Pending {
  travailId: number
  title: string
  waitingCount: number
  totalCount: number
}

// Groupe les rendus par devoir : soumis mais note null
const topPending = computed<Pending[]>(() => {
  const byTravail = new Map<number, { title: string; waiting: number; total: number }>()
  for (const d of travauxStore.allRendus) {
    const key = d.travail_id
    if (key == null) continue
    const entry = byTravail.get(key) ?? { title: d.travail_title ?? 'Devoir', waiting: 0, total: 0 }
    entry.total++
    if (d.submitted_at && d.note == null) entry.waiting++
    byTravail.set(key, entry)
  }
  return Array.from(byTravail.entries())
    .map(([travailId, v]) => ({ travailId, title: v.title, waitingCount: v.waiting, totalCount: v.total }))
    .filter(p => p.waitingCount > 0)
    .sort((a, b) => b.waitingCount - a.waitingCount)
    .slice(0, 3)
})

const totalWaiting = computed(() => topPending.value.reduce((acc, p) => acc + p.waitingCount, 0))

async function openDevoir(travailId: number) {
  await travauxStore.openTravail(travailId)
  modals.depots = true
}

function goToDevoirs() { router.push('/assignments') }
</script>

<template>
  <div
    v-if="topPending.length > 0"
    class="dashboard-card sa-card wnp-card"
    role="button"
    tabindex="0"
    aria-label="Voir les rendus en attente de note"
    @click="goToDevoirs"
    @keydown.enter="goToDevoirs"
    @keydown.space.prevent="goToDevoirs"
  >
    <div class="sa-card-header">
      <Edit3 :size="14" class="sa-card-icon" />
      <span class="sa-section-label">A noter</span>
      <span class="wnp-total">{{ totalWaiting }}</span>
      <ChevronRight :size="13" class="sa-chevron" />
    </div>

    <ul class="wnp-list">
      <li
        v-for="p in topPending"
        :key="p.travailId"
        class="wnp-item"
        tabindex="0"
        role="button"
        @click.stop="openDevoir(p.travailId)"
        @keydown.enter.stop="openDevoir(p.travailId)"
      >
        <span class="wnp-title">{{ p.title }}</span>
        <span class="wnp-ratio">
          <strong>{{ p.waitingCount }}</strong> / {{ p.totalCount }}
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.wnp-card { cursor: pointer; }

.wnp-total {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: var(--radius-xl);
  background: var(--color-danger, #d9534f);
  color: white;
  margin-left: auto;
  margin-right: 4px;
  font-variant-numeric: tabular-nums;
}

.wnp-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wnp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 9px;
  background: var(--bg-input);
  border-radius: 3px;
  border-left: 2px solid var(--color-danger, #d9534f);
  cursor: pointer;
  transition: all var(--motion-fast) var(--ease-out);
}
.wnp-item:hover { background: var(--bg-hover); }
.wnp-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.wnp-title {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.wnp-ratio {
  font-size: 11px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.wnp-ratio strong {
  color: var(--color-danger, #d9534f);
  font-weight: 800;
}
</style>
