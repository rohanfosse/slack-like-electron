<script setup lang="ts">
  /**
   * GestionDevoirModal — Vue détaillée d'un devoir pour le prof
   *
   * TODO: Implémenter :
   *   - Badges (catégorie, type, deadline avec couleur)
   *   - Barre de progression rendus / total
   *   - Pilules de groupes (si assignTo === 'group')
   *   - Sections "Rendus" et "En attente" avec liste d'étudiants
   *   - Bouton noter depuis ce panneau
   *
   * Référence : renderer/js/views/gestion-devoir.js
   * Store : useTravauxStore() → currentTravail, depots
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
      await travauxStore.openTravail(appStore.currentTravailId)
    }
  })
</script>

<template>
  <Modal :model-value="modelValue" :title="travauxStore.currentTravail?.title ?? 'Gestion du devoir'" max-width="760px" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:24px;min-height:200px">
      <!-- TODO: Migrer depuis renderer/js/views/gestion-devoir.js -->
      <p style="color:var(--text-muted);font-size:13px;text-align:center">
        Ce composant est à implémenter.<br />
        Référence : <code>renderer/js/views/gestion-devoir.js</code>
      </p>
      <div v-if="travauxStore.currentTravail" style="margin-top:16px;font-size:13px">
        <p><strong>Titre :</strong> {{ travauxStore.currentTravail.title }}</p>
        <p><strong>Type :</strong> {{ travauxStore.currentTravail.type }}</p>
        <p><strong>Deadline :</strong> {{ travauxStore.currentTravail.deadline }}</p>
        <p><strong>Rendus :</strong> {{ travauxStore.depots.length }}</p>
      </div>
    </div>
  </Modal>
</template>
