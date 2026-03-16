<script setup lang="ts">
  /**
   * EcheancierModal — Échéancier du professeur (vue d'ensemble)
   *
   * TODO: Implémenter :
   *   - Appel getTeacherSchedule() au montage
   *   - Regroupement par semaine / mois
   *   - Mise en couleur selon urgence (deadlineClass)
   *
   * Référence : renderer/js/views/echeancier.js
   */
  import { ref, watch } from 'vue'
  import Modal from '@/components/ui/Modal.vue'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const data    = ref<object | null>(null)
  const loading = ref(false)

  watch(() => props.modelValue, async (open) => {
    if (open) {
      loading.value = true
      try {
        const res = await window.api.getTeacherSchedule()
        data.value = res?.ok ? res.data : null
      } finally {
        loading.value = false
      }
    }
  })
</script>

<template>
  <Modal :model-value="modelValue" title="Échéancier" max-width="760px" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:24px;min-height:300px;display:flex;align-items:center;justify-content:center">
      <div v-if="loading" style="color:var(--text-muted);font-size:13px">Chargement…</div>
      <div v-else style="text-align:center">
        <!-- TODO: Migrer depuis renderer/js/views/echeancier.js -->
        <p style="color:var(--text-muted);font-size:13px">
          Échéancier à implémenter.
        </p>
        <p style="color:var(--text-muted);font-size:12px;margin-top:8px">
          Référence : <code>renderer/js/views/echeancier.js</code>
          <br/>Données chargées : {{ data ? '✓' : '—' }}
        </p>
      </div>
    </div>
  </Modal>
</template>
