<script setup lang="ts">
/**
 * MessageReportDialog : modale de signalement d'un message. Propose 4
 * raisons preremplies + champ libre. Le bouton envoyer est desactive
 * tant que reportReason est vide.
 */
import { AlertTriangle } from 'lucide-vue-next'

interface Props {
  open: boolean
  messagePreview: string
  reason: string
}
defineProps<Props>()
defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'update:reason', v: string): void
  (e: 'submit'): void
}>()

const QUICK_REASONS = ['Harcelement', 'Spam', 'Contenu inapproprie', 'Hors-sujet']
</script>

<template>
  <Transition name="lightbox-fade">
    <div v-if="open" class="lightbox-overlay report-overlay" @click.self="$emit('update:open', false)">
      <div class="report-dialog">
        <h3 class="report-title"><AlertTriangle :size="16" /> Signaler ce message</h3>
        <p class="report-preview">"{{ messagePreview }}"</p>
        <p class="report-hint">Indiquez la raison du signalement :</p>
        <div class="report-quick-reasons">
          <button
            v-for="r in QUICK_REASONS" :key="r"
            class="report-reason-btn"
            :class="{ active: reason === r }"
            @click="$emit('update:reason', r)"
          >{{ r }}</button>
        </div>
        <textarea
          :value="reason"
          class="report-textarea"
          rows="2"
          placeholder="Ou decrivez la raison..."
          @input="$emit('update:reason', ($event.target as HTMLTextAreaElement).value)"
        />
        <div class="report-actions">
          <button class="btn-ghost" @click="$emit('update:open', false)">Annuler</button>
          <button class="btn-primary" :disabled="!reason.trim()" @click="$emit('submit')">Envoyer</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
