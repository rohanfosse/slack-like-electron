/**
 * BookingCancelView.vue — Page publique d'annulation de RDV.
 * Charge l'info en GET puis declenche l'annulation en POST uniquement sur clic
 * explicite du tuteur (anti-CSRF : les link-preview bots ne declenchent rien).
 */
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Check, X, AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const cancelToken = route.params.token as string

const SERVER_URL = (import.meta.env?.VITE_SERVER_URL as string | undefined) || 'http://localhost:3001'

type Phase = 'loading' | 'confirm' | 'cancelling' | 'done' | 'already' | 'error'
const phase = ref<Phase>('loading')
const info = ref<{ eventTitle: string; startDatetime: string; tutorName: string } | null>(null)
const error = ref('')
const rebookUrl = ref('')

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

onMounted(async () => {
  try {
    const res = await fetch(`${SERVER_URL}/api/bookings/public/cancel/${cancelToken}/info`)
    const data = await res.json()
    if (!res.ok || !data.ok) {
      error.value = data?.error || 'Reservation introuvable.'
      phase.value = 'error'
      return
    }
    if (data.data.alreadyCancelled) {
      phase.value = 'already'
    } else {
      info.value = data.data
      phase.value = 'confirm'
    }
  } catch {
    error.value = 'Erreur de connexion au serveur.'
    phase.value = 'error'
  }
})

async function confirmCancel() {
  phase.value = 'cancelling'
  try {
    const res = await fetch(`${SERVER_URL}/api/bookings/public/cancel/${cancelToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      error.value = data?.error || 'Erreur lors de l\'annulation.'
      phase.value = 'error'
      return
    }
    rebookUrl.value = data.data?.rebookUrl || ''
    phase.value = 'done'
  } catch {
    error.value = 'Erreur de connexion au serveur.'
    phase.value = 'error'
  }
}
</script>

<template>
  <div class="cancel-shell">
    <div class="cancel-card">
      <div v-if="phase === 'loading'" class="cancel-loading">Chargement...</div>

      <template v-else-if="phase === 'confirm' && info">
        <div class="cancel-icon cancel-icon--warn">
          <AlertTriangle :size="32" />
        </div>
        <h1>Annuler ce rendez-vous ?</h1>
        <p>
          <strong>{{ info.eventTitle }}</strong><br>
          {{ formatDate(info.startDatetime) }}<br>
          <span class="cancel-sub">avec {{ info.tutorName }}</span>
        </p>
        <div class="actions">
          <button class="btn btn--danger" @click="confirmCancel">Confirmer l'annulation</button>
        </div>
      </template>

      <div v-else-if="phase === 'cancelling'" class="cancel-loading">Annulation en cours...</div>

      <template v-else-if="phase === 'done'">
        <div class="cancel-icon cancel-icon--success">
          <Check :size="32" />
        </div>
        <h1>RDV annule</h1>
        <p>Un email de confirmation a ete envoye.</p>
        <a v-if="rebookUrl" :href="rebookUrl" class="btn btn--primary">Reserver un autre creneau</a>
      </template>

      <template v-else-if="phase === 'already'">
        <div class="cancel-icon cancel-icon--warn">
          <AlertTriangle :size="32" />
        </div>
        <h1>Deja annule</h1>
        <p>Ce rendez-vous a deja ete annule.</p>
      </template>

      <template v-else>
        <div class="cancel-icon cancel-icon--error">
          <X :size="32" />
        </div>
        <h1>Erreur</h1>
        <p>{{ error }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cancel-shell {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #f8fafc; padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.cancel-card {
  background: #fff; border-radius: 16px; padding: 40px;
  text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 420px; width: 100%;
}
.cancel-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #fff; }
.cancel-icon--success { background: #22c55e; }
.cancel-icon--error   { background: #ef4444; }
.cancel-icon--warn    { background: #f59e0b; }
h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #111827; }
p { color: #475569; line-height: 1.6; margin: 0 0 8px; }
.cancel-sub { font-size: 13px; color: #94a3b8; }
.cancel-loading { padding: 20px; color: #64748b; font-size: 14px; }
.actions { margin-top: 20px; display: flex; justify-content: center; gap: 8px; }
.btn { display: inline-block; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; border: none; cursor: pointer; }
.btn--danger { background: #ef4444; color: #fff; }
.btn--danger:hover { background: #dc2626; }
.btn--primary { background: #3b82f6; color: #fff; margin-top: 12px; }
.btn--primary:hover { background: #2563eb; }
</style>
