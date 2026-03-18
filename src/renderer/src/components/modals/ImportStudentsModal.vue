<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { Upload } from 'lucide-vue-next'
  import { useToast }      from '@/composables/useToast'
  import { useAppStore }   from '@/stores/app'
  import Modal from '@/components/ui/Modal.vue'
  import type { Promotion } from '@/types'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const appStore      = useAppStore()
  const { showToast } = useToast()

  const promotions   = ref<Promotion[]>([])
  const selectedPromo = ref<number | null>(null)
  const loading      = ref(false)
  const result       = ref<{ imported: number; errors: string[] } | null>(null)

  watch(() => props.modelValue, async (open) => {
    if (!open) { result.value = null; return }
    const res = await window.api.getPromotions()
    promotions.value  = res?.ok ? res.data : []
    // Pré-sélectionner la promo active
    selectedPromo.value = appStore.activePromoId ?? promotions.value[0]?.id ?? null
    result.value = null
  })

  async function doImport() {
    if (!selectedPromo.value) return
    loading.value = true
    result.value  = null
    try {
      const res = await window.api.importStudents(selectedPromo.value)
      if (!res?.ok) { showToast(res?.error ?? 'Erreur import', 'error'); return }
      result.value = res.data ?? { imported: 0, errors: [] }
      if (result.value.imported > 0) {
        showToast(`${result.value.imported} étudiant(s) importé(s)`, 'success')
      }
    } finally {
      loading.value = false
    }
  }

  function close() { emit('update:modelValue', false) }
</script>

<template>
  <Modal
    :model-value="modelValue"
    title="Importer des étudiants (CSV)"
    max-width="480px"
    @update:model-value="close"
  >
    <div class="import-body">
      <!-- Format attendu -->
      <div class="import-format-box">
        <p class="import-format-title">Format CSV attendu</p>
        <pre class="import-format-pre">name;email;password
Jean Dupont;jean@example.com;monmotdepasse
Marie Martin;marie@example.com;</pre>
        <p class="import-format-hint">
          Séparateur <code>;</code> ou <code>,</code>. Colonne <code>password</code> optionnelle (défaut : <code>cesi1234</code>).
          Les doublons d'email sont ignorés.
        </p>
      </div>

      <!-- Sélection promo -->
      <div class="import-field">
        <label class="import-label">Promotion cible</label>
        <select v-model.number="selectedPromo" class="form-input">
          <option v-for="p in promotions" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <!-- Résultat -->
      <div v-if="result" class="import-result">
        <div class="import-result-row">
          <span class="import-ok">✅ {{ result.imported }} importé{{ result.imported > 1 ? 's' : '' }}</span>
          <span v-if="result.errors.length" class="import-warn">⚠️ {{ result.errors.length }} ignoré{{ result.errors.length > 1 ? 's' : '' }}</span>
        </div>
        <ul v-if="result.errors.length" class="import-errors">
          <li v-for="e in result.errors" :key="e">{{ e }}</li>
        </ul>
      </div>
    </div>

    <div class="import-footer">
      <button class="btn-ghost" @click="close">Fermer</button>
      <button
        class="btn-primary import-btn"
        :disabled="!selectedPromo || loading"
        @click="doImport"
      >
        <Upload :size="14" />
        {{ loading ? 'Import en cours…' : 'Choisir un fichier et importer' }}
      </button>
    </div>
  </Modal>
</template>

<style scoped>
.import-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-format-box {
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
}

.import-format-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.import-format-pre {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(0,0,0,.2);
  border-radius: 4px;
  padding: 8px 10px;
  margin: 0 0 8px;
  overflow-x: auto;
  white-space: pre;
}

.import-format-hint {
  font-size: 11.5px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.import-format-hint code {
  background: rgba(255,255,255,.07);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
}

.import-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.import-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--text-muted);
}

.import-result {
  background: rgba(39,174,96,.06);
  border: 1px solid rgba(39,174,96,.2);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.import-result-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.import-ok   { font-size: 13px; font-weight: 600; color: var(--color-success); }
.import-warn { font-size: 13px; font-weight: 600; color: var(--color-warning); }

.import-errors {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.import-errors li {
  font-size: 11.5px;
  color: var(--text-muted);
}

.import-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
