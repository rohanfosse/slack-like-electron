<script setup lang="ts">
  /**
   * TimelineModal — Timeline des travaux d'un canal
   *
   * TODO: Implémenter :
   *   - Onglets de promotion
   *   - Filtres (type, statut)
   *   - Représentation chronologique des travaux
   *   - Clic sur un item → openTravail()
   *
   * Référence : renderer/js/views/timeline.js
   * Store : useTravauxStore() → ganttData
   */
  import Modal from '@/components/ui/Modal.vue'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()
</script>

<template>
  <Modal :model-value="modelValue" title="Timeline" max-width="880px" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:24px;min-height:300px;display:flex;align-items:center;justify-content:center">
      <div style="text-align:center">
        <p style="color:var(--text-muted);font-size:13px">
          Timeline à implémenter.
        </p>
        <p style="color:var(--text-muted);font-size:12px;margin-top:8px">
          Référence : <code>renderer/js/views/timeline.js</code>
        </p>
      </div>
    </div>
  </Modal>
</template>
