/** SettingsNotifications — section Notifications du modal Settings. */
<script setup lang="ts">
import { BellRing, AtSign, MessageSquare, BookOpen, Megaphone, MoonStar, Clock, Zap, HeartPulse, Volume2 } from 'lucide-vue-next'
import { useSettingsPreferences } from '@/composables/useSettingsPreferences'

const {
  notifDesktop, notifSound,
  notifMentions, notifDms, notifDevoirs, notifAnnonces,
  dndEnabled, dndStart, dndEnd, isDndActive,
} = useSettingsPreferences()

function previewSound() {
  try {
    const audio = new Audio(new URL('@/assets/sounds/notif.wav', import.meta.url).href)
    audio.volume = 0.3
    audio.play().catch(() => {})
  } catch {}
}
</script>

<template>
  <section class="stg-section">
    <div class="stg-section-header">
      <BellRing :size="18" />
      <h3 class="stg-section-title">Notifications</h3>
      <span v-if="isDndActive" class="stg-dnd-badge">Ne pas deranger</span>
    </div>

    <!-- Notifications generales -->
    <div class="stg-group">
      <div class="stg-group-header">
        <BellRing :size="13" class="stg-group-icon" />
        <h4 class="stg-group-title">General</h4>
      </div>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label">Notifications bureau</span>
          <span class="stg-toggle-desc">Afficher les notifications systeme pour les nouveaux messages.</span>
        </div>
        <div class="stg-switch" :class="{ on: notifDesktop }" role="switch" :aria-checked="notifDesktop" tabindex="0" @click="notifDesktop = !notifDesktop" @keydown.enter.prevent="notifDesktop = !notifDesktop" @keydown.space.prevent="notifDesktop = !notifDesktop">
          <div class="stg-switch-thumb" />
        </div>
      </label>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label">Son de notification</span>
          <span class="stg-toggle-desc">Jouer un son lors de la reception d'un message.</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button v-if="notifSound" class="stg-sound-preview" title="Tester le son" @click.stop="previewSound">
            <Volume2 :size="13" />
          </button>
          <div class="stg-switch" :class="{ on: notifSound }" role="switch" :aria-checked="notifSound" tabindex="0" @click="notifSound = !notifSound" @keydown.enter.prevent="notifSound = !notifSound" @keydown.space.prevent="notifSound = !notifSound">
            <div class="stg-switch-thumb" />
          </div>
        </div>
      </label>
    </div>

    <!-- Notifications par type -->
    <div class="stg-group">
      <div class="stg-group-header">
        <AtSign :size="13" class="stg-group-icon" />
        <h4 class="stg-group-title">Par type</h4>
      </div>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label"><AtSign :size="12" style="display:inline;vertical-align:-2px;margin-right:4px" /> Mentions</span>
          <span class="stg-toggle-desc">Quand quelqu'un vous mentionne avec @.</span>
        </div>
        <div class="stg-switch" :class="{ on: notifMentions }" role="switch" :aria-checked="notifMentions" tabindex="0" @click="notifMentions = !notifMentions" @keydown.enter.prevent="notifMentions = !notifMentions" @keydown.space.prevent="notifMentions = !notifMentions">
          <div class="stg-switch-thumb" />
        </div>
      </label>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label"><MessageSquare :size="12" style="display:inline;vertical-align:-2px;margin-right:4px" /> Messages directs</span>
          <span class="stg-toggle-desc">Quand vous recevez un message prive.</span>
        </div>
        <div class="stg-switch" :class="{ on: notifDms }" role="switch" :aria-checked="notifDms" tabindex="0" @click="notifDms = !notifDms" @keydown.enter.prevent="notifDms = !notifDms" @keydown.space.prevent="notifDms = !notifDms">
          <div class="stg-switch-thumb" />
        </div>
      </label>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label"><BookOpen :size="12" style="display:inline;vertical-align:-2px;margin-right:4px" /> Devoirs et notes</span>
          <span class="stg-toggle-desc">Nouvelles notes, deadlines proches, rendus a corriger.</span>
        </div>
        <div class="stg-switch" :class="{ on: notifDevoirs }" role="switch" :aria-checked="notifDevoirs" tabindex="0" @click="notifDevoirs = !notifDevoirs" @keydown.enter.prevent="notifDevoirs = !notifDevoirs" @keydown.space.prevent="notifDevoirs = !notifDevoirs">
          <div class="stg-switch-thumb" />
        </div>
      </label>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label"><Megaphone :size="12" style="display:inline;vertical-align:-2px;margin-right:4px" /> Annonces</span>
          <span class="stg-toggle-desc">Messages dans les canaux d'annonces.</span>
        </div>
        <div class="stg-switch" :class="{ on: notifAnnonces }" role="switch" :aria-checked="notifAnnonces" tabindex="0" @click="notifAnnonces = !notifAnnonces" @keydown.enter.prevent="notifAnnonces = !notifAnnonces" @keydown.space.prevent="notifAnnonces = !notifAnnonces">
          <div class="stg-switch-thumb" />
        </div>
      </label>
      <div class="stg-info-row">
        <Zap :size="12" style="color:#eab308;flex-shrink:0" />
        <span class="stg-toggle-desc">Les invitations Spark et Pulse sont toujours notifiees pour ne pas manquer une session live.</span>
      </div>
    </div>

    <!-- Mode Ne Pas Deranger -->
    <div class="stg-group">
      <div class="stg-group-header">
        <MoonStar :size="13" class="stg-group-icon" />
        <h4 class="stg-group-title">Ne pas deranger</h4>
      </div>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label">Activer le mode silence</span>
          <span class="stg-toggle-desc">Aucune notification sonore ni visuelle pendant les heures definies.</span>
        </div>
        <div class="stg-switch" :class="{ on: dndEnabled }" role="switch" :aria-checked="dndEnabled" tabindex="0" @click="dndEnabled = !dndEnabled" @keydown.enter.prevent="dndEnabled = !dndEnabled" @keydown.space.prevent="dndEnabled = !dndEnabled">
          <div class="stg-switch-thumb" />
        </div>
      </label>
      <div v-if="dndEnabled" class="stg-dnd-schedule">
        <div class="stg-dnd-time">
          <Clock :size="13" class="stg-group-icon" />
          <label class="stg-dnd-label">
            De
            <input v-model="dndStart" type="time" class="stg-dnd-input" />
          </label>
          <label class="stg-dnd-label">
            a
            <input v-model="dndEnd" type="time" class="stg-dnd-input" />
          </label>
        </div>
        <p v-if="isDndActive" class="stg-dnd-active">Mode silence actif en ce moment</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stg-dnd-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-warning, #f59e0b);
  background: rgba(245, 158, 11, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  margin-left: auto;
}
.stg-dnd-schedule {
  padding: 10px 14px;
  background: var(--bg-elevated, rgba(255,255,255,0.03));
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-top: 6px;
}
.stg-dnd-time {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stg-dnd-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}
.stg-dnd-input {
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-input, rgba(255,255,255,0.05));
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font);
  outline: none;
  width: 100px;
}
.stg-dnd-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(74,144,217,0.1);
}
.stg-dnd-active {
  margin-top: 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-warning, #f59e0b);
}
.stg-sound-preview {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); cursor: pointer; transition: all .15s;
}
.stg-sound-preview:hover { background: var(--bg-hover); color: var(--text-primary); }
.stg-info-row {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 12px; margin-top: 4px;
  background: rgba(234,179,8,.04);
  border: 1px solid rgba(234,179,8,.1);
  border-radius: 8px;
}
</style>
