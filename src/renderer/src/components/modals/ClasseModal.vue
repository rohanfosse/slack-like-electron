<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { Users, Search, TrendingUp, Clock, CheckCircle2, Award, X } from 'lucide-vue-next'
  import { useAppStore }    from '@/stores/app'
  import { useModalsStore } from '@/stores/modals'
  import { avatarColor }    from '@/utils/format'
  import { formatDate }     from '@/utils/date'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

  const appStore = useAppStore()
  const modals   = useModalsStore()

  interface StudentStat {
    id:               number
    name:             string
    avatar_initials:  string
    photo_data:       string | null
    submitted_count:  number
    total_count:      number
    graded_count:     number
    avg_grade:        number | null
    last_message_at:  string | null
  }

  const stats      = ref<StudentStat[]>([])
  const loading    = ref(false)
  const filterQ    = ref('')
  const sortKey    = ref<'name' | 'progress' | 'grade' | 'activity'>('name')
  const sortAsc    = ref(true)

  async function load() {
    const promoId = appStore.activePromoId
    if (!promoId) return
    loading.value = true
    try {
      const res = await window.api.getClasseStats(promoId)
      stats.value = res?.ok ? res.data : []
    } finally {
      loading.value = false
    }
  }

  watch(() => props.modelValue, (open) => { if (open) load() })

  const filtered = computed(() => {
    const q = filterQ.value.toLowerCase().trim()
    let list = q ? stats.value.filter((s) => s.name.toLowerCase().includes(q)) : stats.value.slice()

    list = list.sort((a, b) => {
      let diff = 0
      if (sortKey.value === 'name')     diff = a.name.localeCompare(b.name, 'fr')
      if (sortKey.value === 'progress') diff = progressPct(a) - progressPct(b)
      if (sortKey.value === 'grade')    diff = (a.avg_grade ?? -1) - (b.avg_grade ?? -1)
      if (sortKey.value === 'activity') {
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        diff = ta - tb
      }
      return sortAsc.value ? diff : -diff
    })
    return list
  })

  function progressPct(s: StudentStat): number {
    return s.total_count > 0 ? Math.round(s.submitted_count / s.total_count * 100) : 0
  }

  function progressClass(pct: number): string {
    if (pct === 100) return 'fill-done'
    if (pct >= 60)   return 'fill-ok'
    if (pct >= 30)   return 'fill-warn'
    return 'fill-danger'
  }

  function gradeColor(grade: number | null): string {
    if (grade === null) return 'var(--text-muted)'
    if (grade >= 14) return 'var(--color-success)'
    if (grade >= 10) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  function setSort(key: typeof sortKey.value) {
    if (sortKey.value === key) sortAsc.value = !sortAsc.value
    else { sortKey.value = key; sortAsc.value = key !== 'grade' && key !== 'activity' }
  }

  function sortIndicator(key: string): string {
    if (sortKey.value !== key) return ''
    return sortAsc.value ? ' ↑' : ' ↓'
  }

  // Agrégats
  const avgGrade = computed(() => {
    const graded = stats.value.filter((s) => s.avg_grade !== null)
    if (!graded.length) return null
    const sum = graded.reduce((a, s) => a + (s.avg_grade ?? 0), 0)
    return Math.round(sum / graded.length * 10) / 10
  })
  const avgProgress = computed(() => {
    if (!stats.value.length) return 0
    return Math.round(stats.value.reduce((a, s) => a + progressPct(s), 0) / stats.value.length)
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="emit('update:modelValue', false)">
        <div class="classe-modal">

          <!-- En-tête -->
          <div class="classe-header">
            <div class="classe-header-left">
              <Users :size="18" class="classe-header-icon" />
              <div>
                <h2 class="classe-title">Vue Classe</h2>
                <p class="classe-sub">{{ stats.length }} étudiant{{ stats.length > 1 ? 's' : '' }} · progression moyenne {{ avgProgress }}%</p>
              </div>
            </div>
            <div class="classe-header-right">
              <!-- Stat globale note -->
              <div v-if="avgGrade !== null" class="classe-global-stat">
                <Award :size="13" class="classe-global-icon" />
                <span>Moy. classe : <strong>{{ avgGrade }}/20</strong></span>
              </div>
              <button class="btn-icon classe-close" @click="emit('update:modelValue', false)">
                <X :size="16" />
              </button>
            </div>
          </div>

          <!-- Barre de filtre + tri -->
          <div class="classe-toolbar">
            <div class="classe-search-wrap">
              <Search :size="13" class="classe-search-icon" />
              <input
                v-model="filterQ"
                class="classe-search-input"
                type="text"
                placeholder="Filtrer par nom…"
              />
            </div>
            <div class="classe-sort-btns">
              <button
                class="sort-btn"
                :class="{ active: sortKey === 'name' }"
                @click="setSort('name')"
              >Nom{{ sortIndicator('name') }}</button>
              <button
                class="sort-btn"
                :class="{ active: sortKey === 'progress' }"
                @click="setSort('progress')"
              >Rendus{{ sortIndicator('progress') }}</button>
              <button
                class="sort-btn"
                :class="{ active: sortKey === 'grade' }"
                @click="setSort('grade')"
              >Note{{ sortIndicator('grade') }}</button>
              <button
                class="sort-btn"
                :class="{ active: sortKey === 'activity' }"
                @click="setSort('activity')"
              >Activité{{ sortIndicator('activity') }}</button>
            </div>
          </div>

          <!-- Tableau -->
          <div class="classe-body">
            <div v-if="loading" class="classe-loading">
              <div v-for="i in 6" :key="i" class="skel skel-line" :style="{ width: (55 + (i % 3) * 15) + '%', height: '44px', borderRadius: '8px' }" />
            </div>

            <div v-else-if="!filtered.length" class="classe-empty">
              Aucun étudiant trouvé.
            </div>

            <div v-else class="classe-list">
              <div
                v-for="s in filtered"
                :key="s.id"
                class="classe-row"
              >
                <!-- Avatar -->
                <div
                  class="classe-avatar"
                  :style="{ background: s.photo_data ? 'transparent' : avatarColor(s.name) }"
                >
                  <img v-if="s.photo_data" :src="s.photo_data" :alt="s.name" />
                  <span v-else>{{ s.avatar_initials }}</span>
                </div>

                <!-- Nom -->
                <div class="classe-name">{{ s.name }}</div>

                <!-- Progression rendus -->
                <div class="classe-progress-col">
                  <div class="classe-bar-wrap">
                    <div
                      class="classe-bar-fill"
                      :class="progressClass(progressPct(s))"
                      :style="{ width: progressPct(s) + '%' }"
                    />
                  </div>
                  <span class="classe-bar-label">
                    <CheckCircle2 :size="10" />
                    {{ s.submitted_count }}/{{ s.total_count }}
                  </span>
                </div>

                <!-- Note moyenne -->
                <div class="classe-grade" :style="{ color: gradeColor(s.avg_grade) }">
                  <TrendingUp :size="12" class="classe-grade-icon" />
                  <span>{{ s.avg_grade !== null ? s.avg_grade.toFixed(1) + '/20' : '—' }}</span>
                  <span v-if="s.graded_count" class="classe-graded-count">({{ s.graded_count }} noté{{ s.graded_count > 1 ? 's' : '' }})</span>
                </div>

                <!-- Dernière activité -->
                <div class="classe-activity">
                  <Clock :size="10" class="classe-activity-icon" />
                  <span>{{ s.last_message_at ? formatDate(s.last_message_at) : 'Inactif' }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .15s ease; }
.modal-fade-enter-from,  .modal-fade-leave-to      { opacity: 0; }

.classe-modal {
  width: 100%;
  max-width: 760px;
  max-height: 85vh;
  background: var(--bg-modal);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-lg);
  box-shadow: 0 32px 64px rgba(0,0,0,.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── En-tête ── */
.classe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.classe-header-left { display: flex; align-items: center; gap: 12px; }
.classe-header-icon { color: var(--accent); flex-shrink: 0; }
.classe-title { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.classe-sub   { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

.classe-header-right { display: flex; align-items: center; gap: 10px; }
.classe-global-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(255,255,255,.04);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
}
.classe-global-icon { color: var(--accent); }
.classe-close { color: var(--text-muted); }
.classe-close:hover { color: var(--text-primary); }

/* ── Toolbar ── */
.classe-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.classe-search-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 5px 10px;
}
.classe-search-icon { color: var(--text-muted); flex-shrink: 0; }
.classe-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font);
  font-size: 13px;
  color: var(--text-primary);
}
.classe-search-input::placeholder { color: var(--text-muted); }

.classe-sort-btns { display: flex; gap: 4px; flex-shrink: 0; }
.sort-btn {
  font-size: 11.5px;
  font-family: var(--font);
  font-weight: 500;
  padding: 4px 9px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background .1s, color .1s, border-color .1s;
  white-space: nowrap;
}
.sort-btn:hover { background: rgba(255,255,255,.06); color: var(--text-secondary); }
.sort-btn.active {
  background: rgba(74,144,217,.12);
  border-color: rgba(74,144,217,.35);
  color: var(--accent-light, #7db8f0);
}

/* ── Corps ── */
.classe-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.classe-loading { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; }
.classe-empty   { padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px; font-style: italic; }

/* ── Liste ── */
.classe-list { display: flex; flex-direction: column; gap: 3px; }

.classe-row {
  display: grid;
  grid-template-columns: 34px 1fr 180px 140px 110px;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background .1s;
}
.classe-row:hover { background: rgba(255,255,255,.04); }

/* Avatar */
.classe-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.classe-avatar img { width: 100%; height: 100%; object-fit: cover; }

/* Nom */
.classe-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Barre progression */
.classe-progress-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.classe-bar-wrap {
  height: 5px;
  background: rgba(255,255,255,.07);
  border-radius: 3px;
  overflow: hidden;
}
.classe-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .3s ease;
}
.fill-done   { background: var(--color-success); }
.fill-ok     { background: var(--accent); }
.fill-warn   { background: var(--color-warning); }
.fill-danger { background: var(--color-danger); }

.classe-bar-label {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  color: var(--text-muted);
}

/* Note */
.classe-grade {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
}
.classe-grade-icon { flex-shrink: 0; }
.classe-graded-count { font-size: 10px; font-weight: 400; color: var(--text-muted); }

/* Activité */
.classe-activity {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.classe-activity-icon { flex-shrink: 0; }
</style>
