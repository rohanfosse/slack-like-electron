/**
 * BookingCancelView.vue — Public cancellation confirmation page.
 * Calls the cancel API and shows result. No auth required.
 */
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Check, X, Calendar } from 'lucide-vue-next'

const route = useRoute()
const cancelToken = route.params.token as string

const SERVER_URL = (import.meta.env?.VITE_SERVER_URL as string | undefined) || 'http://localhost:3001'

const loading = ref(true)
const success = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch(`${SERVER_URL}/api/bookings/public/cancel/${cancelToken}`)
    // The server returns HTML for the cancel page, but we handle it as a JSON API check
    // If the server redirected or returned HTML, we still consider it a success
    if (res.ok) {
      success.value = true
    } else {
      try {
        const data = await res.json()
        error.value = data.error || 'Reservation introuvable ou deja annulee.'
      } catch {
        error.value = 'Reservation introuvable ou deja annulee.'
      }
    }
  } catch {
    error.value = 'Erreur de connexion au serveur.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="cancel-shell">
    <div class="cancel-card">
      <div v-if="loading" class="cancel-loading">Annulation en cours...</div>

      <template v-else-if="success">
        <div class="cancel-icon cancel-icon--success">
          <Check :size="32" />
        </div>
        <h1>RDV annule</h1>
        <p>Votre rendez-vous a ete annule avec succes.</p>
        <p class="cancel-sub">Un email de confirmation a ete envoye.</p>
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
  text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 400px; width: 100%;
}
.cancel-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #fff; }
.cancel-icon--success { background: #22c55e; }
.cancel-icon--error { background: #ef4444; }
h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #111827; }
p { color: #64748b; line-height: 1.6; margin: 0 0 4px; }
.cancel-sub { font-size: 12px; color: #94a3b8; }
.cancel-loading { padding: 20px; color: #64748b; font-size: 14px; }
</style>
