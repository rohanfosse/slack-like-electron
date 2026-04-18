/**
 * useDmFiles : liste des fichiers partages dans la conversation DM active,
 * avec filtre all/images/docs. Recharge automatiquement quand le peer DM
 * actif change.
 */
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useApi } from '@/composables/useApi'

export interface DmFile {
  message_id: number
  student_id: number
  student_name: string
  file_name: string
  file_url: string
  is_image: boolean
  sent_at: string
}

export type DmFileFilter = 'all' | 'images' | 'docs'

export function useDmFiles() {
  const appStore = useAppStore()
  const { api } = useApi()

  const files = ref<DmFile[]>([])
  const loading = ref(false)
  const filter = ref<DmFileFilter>('all')

  const filtered = computed(() => {
    if (filter.value === 'all') return files.value
    if (filter.value === 'images') return files.value.filter((f) => f.is_image)
    return files.value.filter((f) => !f.is_image)
  })

  async function load() {
    if (!appStore.activeDmStudentId) return
    loading.value = true
    const res = await api<DmFile[]>(() => window.api.getDmFiles())
    const sid = appStore.activeDmStudentId
    files.value = (res ?? []).filter((f) => f.student_id === sid)
    loading.value = false
  }

  watch(() => appStore.activeDmStudentId, (id) => {
    files.value = []
    if (id) load()
  })

  return { files, loading, filter, filtered, load }
}
