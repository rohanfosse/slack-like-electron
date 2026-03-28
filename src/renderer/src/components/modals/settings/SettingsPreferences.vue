/** SettingsPreferences — section Préférences du modal Settings. */
<script setup lang="ts">
import { Settings, MousePointer, FileText, RotateCcw } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { useSettingsPreferences } from '@/composables/useSettingsPreferences'
import { useSettingsAccount } from '@/composables/useSettingsAccount'

const appStore = useAppStore()
const { docsDefault, enterToSend } = useSettingsPreferences()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()
const { resetting, resetDemoData } = useSettingsAccount(emit)
</script>

<template>
  <section class="stg-section">
    <div class="stg-section-header">
      <Settings :size="18" />
      <h3 class="stg-section-title">Préférences</h3>
    </div>

    <!-- Saisie -->
    <div class="stg-group">
      <div class="stg-group-header">
        <MousePointer :size="13" class="stg-group-icon" />
        <h4 class="stg-group-title">Saisie</h4>
      </div>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label">Entrée pour envoyer</span>
          <span class="stg-toggle-desc">Appuyer sur Entrée envoie le message. Désactivé : Ctrl+Entrée pour envoyer.</span>
        </div>
        <div class="stg-switch" :class="{ on: enterToSend }" role="switch" :aria-checked="enterToSend" tabindex="0" @click="enterToSend = !enterToSend" @keydown.enter.prevent="enterToSend = !enterToSend" @keydown.space.prevent="enterToSend = !enterToSend">
          <div class="stg-switch-thumb" />
        </div>
      </label>
    </div>

    <!-- Documents -->
    <div class="stg-group">
      <div class="stg-group-header">
        <FileText :size="13" class="stg-group-icon" />
        <h4 class="stg-group-title">Documents</h4>
      </div>
      <label class="stg-toggle-row">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label">Ouvrir dans l'explorateur par défaut</span>
          <span class="stg-toggle-desc">Double-clic sur un fichier l'ouvre directement avec l'application système.</span>
        </div>
        <div class="stg-switch" :class="{ on: docsDefault }" role="switch" :aria-checked="docsDefault" tabindex="0" @click="docsDefault = !docsDefault" @keydown.enter.prevent="docsDefault = !docsDefault" @keydown.space.prevent="docsDefault = !docsDefault">
          <div class="stg-switch-thumb" />
        </div>
      </label>
    </div>

    <!-- Demo (profs) -->
    <div v-if="appStore.isTeacher" class="stg-group">
      <div class="stg-group-header">
        <RotateCcw :size="13" class="stg-group-icon" />
        <h4 class="stg-group-title">Données de démonstration</h4>
      </div>
      <div class="stg-action-row stg-action-danger">
        <div class="stg-toggle-info">
          <span class="stg-toggle-label">Réinitialiser les données</span>
          <span class="stg-toggle-desc">Recharge les promotions d'exemple avec devoirs, dépôts et documents de test.</span>
        </div>
        <button class="stg-btn stg-btn-danger" :disabled="resetting" @click="resetDemoData">
          <RotateCcw :size="13" />
          {{ resetting ? 'En cours...' : 'Réinitialiser' }}
        </button>
      </div>
    </div>
  </section>
</template>
