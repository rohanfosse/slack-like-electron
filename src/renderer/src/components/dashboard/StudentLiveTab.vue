/**
 * StudentLiveTab — Onglet Live du dashboard etudiant.
 * Affiche la session active (si existante) + historique des dernieres sessions.
 */
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Zap, ArrowRight, Clock, Users, BarChart2, Trophy, CheckCircle2 } from 'lucide-vue-next'
import { useLiveStore } from '@/stores/live'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import { activityTypeLabel, getActivityCategory, ACTIVITY_CATEGORIES } from '@/utils/liveActivity'
import type { LiveSessionWithStats } from '@/types'

const router = useRouter()
const appStore = useAppStore()
const liveStore = useLiveStore()

const loading = ref(true)
const recentSessions = ref<LiveSessionWithStats[]>([])

const promoId = computed(() => appStore.activePromoId ?? appStore.currentUser?.promo_id ?? 0)
const activeSession = computed(() => liveStore.currentSession)
const hasActiveSession = computed(() => !!activeSession.value && activeSession.value.status !== 'ended')

onMounted(async () => {
  loading.value = true
  try {
    // Check for active session
    if (promoId.value) {
      await liveStore.fetchActiveForPromo(promoId.value)
      // Fetch recent history
      await liveStore.fetchHistory(promoId.value)
      recentSessions.value = liveStore.historySessions.slice(0, 5)
    }
  } finally {
    loading.value = false
  }
})

function joinSession() {
  router.push('/live')
}

function formatDate(dt: string | null) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="slt-wrap">
    <!-- Loading -->
    <div v-if="loading" class="slt-loading">
      <div class="skel skel-line" style="height:80px;border-radius:12px" />
      <div class="skel skel-line" style="height:40px;border-radius:8px;margin-top:12px" />
      <div class="skel skel-line" style="height:40px;border-radius:8px;margin-top:8px" />
    </div>

    <template v-else>
      <!-- Session active : call to action -->
      <div v-if="hasActiveSession" class="slt-active">
        <div class="slt-active-badge">
          <span class="slt-live-dot" /> En direct
        </div>
        <h3 class="slt-active-title">{{ activeSession?.title }}</h3>
        <p class="slt-active-desc">Une session Live est en cours. Rejoignez-la pour participer !</p>
        <button class="slt-join-btn" @click="joinSession">
          <Zap :size="16" /> Rejoindre la session
          <ArrowRight :size="14" />
        </button>
      </div>

      <!-- Pas de session active -->
      <div v-else class="slt-no-session">
        <Zap :size="32" class="slt-no-icon" />
        <h3 class="slt-no-title">Pas de session en cours</h3>
        <p class="slt-no-desc">Votre enseignant vous invitera quand une session Live commencera. Vous recevrez une notification.</p>
        <button class="slt-code-btn" @click="joinSession">
          <span>Rejoindre avec un code</span>
          <ArrowRight :size="12" />
        </button>
      </div>

      <!-- Historique recent -->
      <div v-if="recentSessions.length > 0" class="slt-history">
        <h4 class="slt-history-title">
          <Clock :size="13" /> Sessions recentes
        </h4>
        <div class="slt-history-list">
          <div v-for="s in recentSessions" :key="s.id" class="slt-history-card">
            <div class="slt-history-info">
              <span class="slt-history-name">{{ s.title }}</span>
              <span class="slt-history-date">{{ formatDate(s.ended_at) }}</span>
            </div>
            <div class="slt-history-stats">
              <span class="slt-history-stat">
                <BarChart2 :size="11" /> {{ s.activity_count }}
              </span>
              <span class="slt-history-stat">
                <Users :size="11" /> {{ s.participant_count }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pas d'historique -->
      <div v-else-if="!hasActiveSession" class="slt-empty-history">
        <CheckCircle2 :size="16" class="slt-empty-icon" />
        <span>Aucune session passee pour le moment</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.slt-wrap { display: flex; flex-direction: column; gap: 16px; max-width: 600px; margin: 0 auto; }
.slt-loading { display: flex; flex-direction: column; gap: 8px; }

/* Active session */
.slt-active {
  background: linear-gradient(135deg, rgba(245,158,11,.08), rgba(59,130,246,.08));
  border: 1px solid rgba(245,158,11,.25);
  border-radius: 14px; padding: 24px; text-align: center;
}
.slt-active-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: #22c55e; background: rgba(34,197,94,.12);
  padding: 4px 12px; border-radius: 20px; margin-bottom: 12px;
}
.slt-live-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .4 } }
.slt-active-title { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px; }
.slt-active-desc { font-size: 13px; color: var(--text-muted); margin: 0 0 16px; }
.slt-join-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; font-size: 15px; font-weight: 700;
  border: none; border-radius: 10px; background: var(--accent); color: #fff;
  cursor: pointer; font-family: var(--font); transition: all .15s;
}
.slt-join-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }

/* No session */
.slt-no-session {
  text-align: center; padding: 32px 20px;
  border: 1px solid var(--border); border-radius: 14px;
  background: var(--bg-sidebar);
}
.slt-no-icon { color: var(--text-muted); opacity: .3; margin-bottom: 12px; }
.slt-no-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
.slt-no-desc { font-size: 13px; color: var(--text-muted); margin: 0 0 14px; max-width: 400px; margin-inline: auto; line-height: 1.5; }
.slt-code-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 13px; font-weight: 600;
  border: 1px solid var(--border); border-radius: 8px;
  background: transparent; color: var(--accent);
  cursor: pointer; font-family: var(--font); transition: all .15s;
}
.slt-code-btn:hover { background: rgba(74,144,217,.06); border-color: var(--accent); }

/* History */
.slt-history {
  border: 1px solid var(--border); border-radius: 12px;
  background: var(--bg-sidebar); overflow: hidden;
}
.slt-history-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  padding: 12px 16px; margin: 0;
  border-bottom: 1px solid var(--border);
}
.slt-history-list { display: flex; flex-direction: column; }
.slt-history-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--border);
  transition: background .15s;
}
.slt-history-card:last-child { border-bottom: none; }
.slt-history-card:hover { background: var(--bg-hover); }
.slt-history-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.slt-history-name {
  font-size: 13px; font-weight: 600; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.slt-history-date { font-size: 11px; color: var(--text-muted); }
.slt-history-stats { display: flex; gap: 8px; flex-shrink: 0; }
.slt-history-stat {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; color: var(--text-muted);
}

/* Empty history */
.slt-empty-history {
  display: flex; align-items: center; gap: 8px; justify-content: center;
  padding: 16px; font-size: 12px; color: var(--text-muted);
}
.slt-empty-icon { opacity: .4; }
</style>
