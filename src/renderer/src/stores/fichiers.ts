/** Store Fichiers — fichiers partages par les etudiants (prof only). */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'

export interface DmFile {
  message_id: number
  student_id: number
  student_name: string
  file_name: string
  file_url: string
  is_image: boolean
  file_size: number | null
  sent_at: string
}

export const useFichiersStore = defineStore('fichiers', () => {
  const { api } = useApi()

  const files = ref<DmFile[]>([])
  const loading = ref(false)
  const selectedStudentId = ref<number | null>(null)
  const filterType = ref<'all' | 'images' | 'docs'>('all')

  async function fetchFiles(): Promise<void> {
    loading.value = true
    try {
      const data = await api<DmFile[]>(() => window.api.getDmFiles())
      files.value = Array.isArray(data) ? data : []
    } finally {
      loading.value = false
    }
  }

  function selectStudent(id: number | null) {
    selectedStudentId.value = id
  }

  function setFilterType(type: 'all' | 'images' | 'docs') {
    filterType.value = type
  }

  return {
    files, loading, selectedStudentId, filterType,
    fetchFiles, selectStudent, setFilterType,
  }
})
