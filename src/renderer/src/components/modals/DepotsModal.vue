<script setup lang="ts">
  /**
   * DepotsModal — Dépôts d'un travail (liste des rendus + notation)
   *
   * TODO: Implémenter :
   *   - Liste des dépôts avec filtrage par étudiant
   *   - Visualisation du fichier déposé (readFileBase64)
   *   - Formulaire de notation (/20 ou lettre A/B/C/D)
   *   - Formulaire de commentaire (feedback)
   *   - Bouton "Marquer tout comme D"
   *
   * Référence : renderer/js/views/depots.js
   * Store : useTravauxStore() → depots, setNote(), setFeedback()
   */
  import { watch } from 'vue'
  import { useTravauxStore } from '@/stores/travaux'
  import { useAppStore }     from '@/stores/app'
  import Modal from '@/components/ui/Modal.vue'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const travauxStore = useTravauxStore()
  const appStore     = useAppStore()

  watch(() => props.modelValue, async (open) => {
    if (open && appStore.currentTravailId) {
      await travauxStore.fetchDepots(appStore.currentTravailId)
    }
  })
</script>

<template>
  <Modal :model-value="modelValue" title="Dépôts" max-width="800px" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:24px;min-height:200px">
      <!-- TODO: Migrer depuis renderer/js/views/depots.js -->
      <p style="color:var(--text-muted);font-size:13px;text-align:center">
        Ce composant est à implémenter.<br />
        Référence : <code>renderer/js/views/depots.js</code>
      </p>
      <p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:8px">
        Dépôts chargés : {{ travauxStore.depots.length }}
      </p>
      <ul style="margin-top:16px;list-style:none;display:flex;flex-direction:column;gap:8px">
        <li
          v-for="d in travauxStore.depots"
          :key="d.id"
          style="padding:10px;background:var(--bg-tertiary);border-radius:6px;display:flex;justify-content:space-between"
        >
          <span>{{ d.student_name }}</span>
          <span style="font-size:12px;color:var(--text-muted)">
            Note : {{ d.note ?? 'non notée' }}
          </span>
        </li>
      </ul>
    </div>
  </Modal>
</template>
