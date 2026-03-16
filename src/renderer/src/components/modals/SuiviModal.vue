<script setup lang="ts">
  /**
   * SuiviModal — Suivi détaillé d'un travail
   *
   * TODO: Implémenter :
   *   - Barre de progression (rendus / total)
   *   - Liste par étudiant avec statut (rendu / en attente / noté)
   *   - Bouton export CSV (api.exportCsv)
   *   - Bouton "Relancer les non-rendus" (markNonSubmittedAsD)
   *   - Panneau profil étudiant au clic
   *
   * Référence : renderer/js/views/suivi.js
   * Store : useTravauxStore() → depots, markNonSubmittedAsD()
   */
  import { watch, computed } from 'vue'
  import { useTravauxStore } from '@/stores/travaux'
  import { useAppStore }     from '@/stores/app'
  import Modal from '@/components/ui/Modal.vue'

  const api   = window.api
  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const travauxStore = useTravauxStore()
  const appStore     = useAppStore()

  const pct = computed(() => {
    const suivi = travauxStore.depots
    return suivi.length ? Math.round(suivi.filter((d) => d.submitted_at).length / suivi.length * 100) : 0
  })

  watch(() => props.modelValue, async (open) => {
    if (open && appStore.currentTravailId) {
      await travauxStore.fetchDepots(appStore.currentTravailId)
    }
  })
</script>

<template>
  <Modal :model-value="modelValue" title="Suivi du travail" max-width="760px" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:24px;min-height:200px">
      <!-- Barre de progression -->
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span>Rendus</span>
          <span>{{ pct }}%</span>
        </div>
        <div style="height:8px;background:var(--bg-tertiary);border-radius:4px">
          <div
            id="suivi-progress-fill"
            style="height:100%;border-radius:4px;background:var(--accent);transition:width .3s"
            :style="{ width: `${pct}%` }"
          />
        </div>
      </div>

      <!-- TODO: Migrer depuis renderer/js/views/suivi.js -->
      <p style="color:var(--text-muted);font-size:13px;text-align:center">
        Liste des rendus à implémenter.<br />
        Référence : <code>renderer/js/views/suivi.js</code>
      </p>
      <p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:8px">
        {{ travauxStore.depots.length }} entrées chargées.
      </p>
    </div>

    <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
      <button
        class="btn-ghost"
        style="font-size:12px"
        @click="appStore.currentTravailId && api.exportCsv(appStore.currentTravailId)"
      >
        Exporter CSV
      </button>
      <button
        class="btn-danger"
        style="font-size:12px"
        @click="appStore.currentTravailId && travauxStore.markNonSubmittedAsD(appStore.currentTravailId)"
      >
        Non rendus → D
      </button>
    </div>
  </Modal>
</template>
