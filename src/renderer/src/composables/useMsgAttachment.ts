/**
 * Pièce jointe de message : sélection de fichier, upload, insertion de lien markdown.
 * Used by MessageInput.vue
 */
import { ref, watch, nextTick, type Ref } from 'vue'
import { useToast } from '@/composables/useToast'

// ── Singleton : injection externe de markdown (ex. DnD depuis MessagesView) ──
const _pendingMd = ref<string | null>(null)
export function injectMd(md: string) { _pendingMd.value = md }

/**
 * File attachment: pick, upload, insert markdown link.
 */
export function useMsgAttachment(
  content: Ref<string>,
  inputEl: Ref<HTMLTextAreaElement | null>,
  autoResize: () => void,
) {
  const { showToast } = useToast()
  const attaching = ref(false)
  const uploadProgress = ref<number | null>(null)

  // Écoute les injections externes (DnD en DM depuis MessagesView)
  watch(_pendingMd, (md) => {
    if (!md) return
    content.value += content.value ? `\n${md}` : md
    _pendingMd.value = null
    nextTick(() => { autoResize(); inputEl.value?.focus() })
  })

  async function attachFile() {
    if (attaching.value) return
    attaching.value = true
    uploadProgress.value = 0
    try {
      const res = await window.api.openFileDialog()
      if (!res?.ok || !res.data) return
      const filePaths = res.data as string[]
      const firstPath = filePaths[0]
      if (!firstPath) return
      uploadProgress.value = 30
      const uploadRes = await window.api.uploadFile(firstPath)
      uploadProgress.value = 80
      if (!uploadRes?.ok || !uploadRes.data) {
        showToast('Erreur lors du chargement du fichier.', 'error')
        return
      }
      const url = uploadRes.data.url
      const fileSize = uploadRes.data.file_size || 0
      const sizedUrl = fileSize ? `${url}#size=${fileSize}` : url
      const fileName = firstPath.split(/[\\/]/).pop() || 'fichier'
      const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName)
      const md = isImage ? `![${fileName}](${sizedUrl})` : `[📎 ${fileName}](${sizedUrl})`
      content.value += content.value ? `\n${md}` : md
      nextTick(() => { autoResize(); inputEl.value?.focus() })
    } finally {
      uploadProgress.value = 100
      setTimeout(() => { uploadProgress.value = null }, 300)
      attaching.value = false
    }
  }

  return {
    attaching,
    attachFile,
    uploadProgress,
  }
}
