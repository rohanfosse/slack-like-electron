/** SettingsIntegrations — services externes connectables (Microsoft 365, ...). */
<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { Plug, Check, X, Globe, ExternalLink, Info } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useMicrosoftConnection } from '@/composables/useMicrosoftConnection'

const appStore = useAppStore()
const { connected, expiresAt, loading, connect, disconnect, refresh } = useMicrosoftConnection()

onMounted(() => {
  if (appStore.isTeacher) refresh()
})

const expiresText = computed(() => {
  if (!expiresAt.value) return null
  const d = new Date(expiresAt.value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
})
</script>

<template>
  <section class="stg-section">
    <div class="stg-section-header">
      <Plug :size="18" />
      <h3 class="stg-section-title">Integrations</h3>
    </div>

    <p v-if="!appStore.isTeacher" class="stg-info-muted">
      Les integrations externes sont reservees aux enseignants.
    </p>

    <template v-else>
      <!-- Microsoft 365 -->
      <div class="stg-integration-card">
        <div class="stg-integration-head">
          <div class="stg-integration-logo ms-logo">
            <svg viewBox="0 0 23 23" width="22" height="22">
              <rect x="1"  y="1"  width="10" height="10" fill="#f25022" />
              <rect x="12" y="1"  width="10" height="10" fill="#7fba00" />
              <rect x="1"  y="12" width="10" height="10" fill="#00a4ef" />
              <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
            </svg>
          </div>
          <div class="stg-integration-meta">
            <h4 class="stg-integration-title">Microsoft 365 / Outlook</h4>
            <p class="stg-integration-desc">
              Synchroniser ton calendrier Outlook avec l'agenda Cursus. Permet
              egalement la creation de reunions Teams depuis les rappels et
              les creneaux de reservation.
            </p>
          </div>
          <span class="stg-integration-status" :class="connected ? 'ok' : 'ko'">
            <Check v-if="connected" :size="12" />
            <X v-else :size="12" />
            {{ connected ? 'Connecte' : 'Non connecte' }}
          </span>
        </div>

        <div v-if="connected && expiresText" class="stg-integration-info">
          <Info :size="12" />
          <span>Token valide jusqu'au {{ expiresText }} (refresh automatique)</span>
        </div>

        <div class="stg-integration-actions">
          <button
            v-if="!connected"
            class="btn-primary"
            :disabled="loading"
            @click="connect"
          >
            <Globe :size="14" />
            {{ loading ? 'Ouverture...' : 'Connecter Microsoft' }}
          </button>
          <button
            v-else
            class="btn-danger"
            :disabled="loading"
            @click="disconnect"
          >
            <X :size="14" />
            Deconnecter
          </button>
        </div>

        <details class="stg-integration-help">
          <summary>
            <ExternalLink :size="12" />
            Comment ca marche ?
          </summary>
          <ol class="stg-integration-steps">
            <li>Clique sur "Connecter Microsoft" — ton navigateur s'ouvre.</li>
            <li>Connecte-toi avec ton compte Microsoft (pro ou perso).</li>
            <li>Accepte les permissions demandees (Calendrier, Teams).</li>
            <li>Revenir dans Cursus — l'integration s'active automatiquement.</li>
          </ol>
          <p class="stg-integration-note">
            Les donnees restent entre toi et Microsoft. Cursus stocke
            uniquement les tokens chiffres localement pour pouvoir relire ton
            calendrier. Tu peux te deconnecter a tout moment, ca revoque
            immediatement l'acces.
          </p>
        </details>
      </div>
    </template>
  </section>
</template>

<style scoped>
.stg-integration-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-top: 12px;
  background: var(--bg-hover);
}

.stg-integration-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.stg-integration-logo {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: var(--radius-sm);
  padding: 4px;
}

.stg-integration-meta { flex: 1; min-width: 0; }

.stg-integration-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.stg-integration-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.stg-integration-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;
}
.stg-integration-status.ok {
  background: rgba(34, 197, 94, .15);
  color: rgb(34, 197, 94);
}
.stg-integration-status.ko {
  background: rgba(148, 163, 184, .15);
  color: var(--text-muted);
}

.stg-integration-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(59, 130, 246, .08);
  border-radius: var(--radius-sm);
}

.stg-integration-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.stg-integration-help {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
}
.stg-integration-help summary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: var(--text-secondary);
  font-weight: 500;
}
.stg-integration-help summary:hover { color: var(--text-primary); }

.stg-integration-steps {
  margin: 8px 0 0;
  padding-left: 22px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.stg-integration-note {
  margin: 10px 0 0;
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.5;
}

.stg-info-muted {
  margin: 16px 0 0;
  padding: 12px;
  color: var(--text-muted);
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  text-align: center;
}
</style>
