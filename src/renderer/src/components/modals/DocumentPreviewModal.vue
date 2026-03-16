<script setup lang="ts">
  /**
   * DocumentPreviewModal — Prévisualisation d'un document
   *
   * TODO: Implémenter :
   *   - Chargement base64 via readFileBase64
   *   - Rendu inline selon le type (image / PDF via <object> / texte / vidéo)
   *   - Bouton télécharger (downloadFile)
   *   - Bouton ouvrir avec l'app système (openPath)
   *
   * Référence : renderer/js/views/documents-view.js → openDocPreview()
   * Store : useDocumentsStore() → previewDoc
   */
  import { watch, ref } from 'vue'
  import { Download, ExternalLink } from 'lucide-vue-next'
  import { useDocumentsStore } from '@/stores/documents'
  import Modal from '@/components/ui/Modal.vue'

  const api   = window.api
  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const docStore   = useDocumentsStore()
  const previewSrc = ref<string | null>(null)
  const loading    = ref(false)

  watch(() => props.modelValue, async (open) => {
    if (open && docStore.previewDoc?.type === 'file') {
      loading.value = true
      try {
        const res = await api.readFileBase64(docStore.previewDoc.content)
        if (res?.ok) {
          previewSrc.value = `data:${res.data.mime};base64,${res.data.b64}`
        }
      } finally {
        loading.value = false
      }
    } else if (!open) {
      previewSrc.value = null
    }
  })
</script>

<template>
  <Modal
    :model-value="modelValue"
    :title="docStore.previewDoc?.name ?? 'Aperçu'"
    max-width="900px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div id="doc-preview-body" style="padding:16px;min-height:400px;display:flex;align-items:center;justify-content:center">
      <div v-if="loading" style="color:var(--text-muted)">Chargement du fichier…</div>

      <!-- Image -->
      <img
        v-else-if="previewSrc && previewSrc.startsWith('data:image')"
        :src="previewSrc"
        style="max-width:100%;max-height:600px;object-fit:contain;border-radius:var(--radius)"
      />

      <!-- TODO: Rendu PDF (object tag ou iframe) -->
      <!-- TODO: Rendu texte (<pre>) -->
      <!-- TODO: Rendu vidéo (<video>) -->
      <!-- Référence : renderer/js/views/documents-view.js → openDocPreview() -->
      <div v-else-if="previewSrc" style="text-align:center;color:var(--text-muted);font-size:13px">
        <p>Prévisualisation non disponible pour ce type de fichier.</p>
        <p style="font-size:12px;margin-top:8px">À implémenter — voir <code>renderer/js/views/documents-view.js</code></p>
      </div>

      <!-- Lien externe -->
      <div v-else-if="docStore.previewDoc?.type === 'link'" style="text-align:center">
        <ExternalLink :size="32" style="color:var(--accent);margin-bottom:12px" />
        <p>{{ docStore.previewDoc.content }}</p>
        <button
          class="btn-primary"
          style="margin-top:12px"
          @click="docStore.previewDoc && api.openExternal(docStore.previewDoc.content)"
        >
          Ouvrir le lien
        </button>
      </div>
    </div>

    <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
      <button
        v-if="docStore.previewDoc?.type === 'file'"
        class="btn-ghost"
        style="display:flex;align-items:center;gap:6px"
        @click="docStore.previewDoc && api.downloadFile(docStore.previewDoc.content)"
      >
        <Download :size="14" /> Télécharger
      </button>
    </div>
  </Modal>
</template>
