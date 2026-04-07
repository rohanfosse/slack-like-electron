/** Store Lumen — cours markdown publies par les enseignants. */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import type { LumenCourse } from '@/types'

export const useLumenStore = defineStore('lumen', () => {
  const { api } = useApi()

  // ── Etat ──────────────────────────────────────────────────────────────────
  const courses       = ref<LumenCourse[]>([])
  const currentCourse = ref<LumenCourse | null>(null)
  const loading       = ref(false)

  // ── Computed ─────────────────────────────────────────────────────────────
  const publishedCourses = computed(() => courses.value.filter(c => c.status === 'published'))
  const draftCourses     = computed(() => courses.value.filter(c => c.status === 'draft'))

  // ── Actions ──────────────────────────────────────────────────────────────

  async function fetchCoursesForPromo(promoId: number): Promise<void> {
    loading.value = true
    try {
      const data = await api<LumenCourse[]>(
        () => window.api.getLumenCoursesForPromo(promoId),
        { silent: true },
      )
      courses.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function fetchCourse(id: number): Promise<LumenCourse | null> {
    loading.value = true
    try {
      const data = await api<LumenCourse>(() => window.api.getLumenCourse(id))
      if (data) currentCourse.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  async function createCourse(payload: { promoId: number; title: string; summary?: string; content?: string }): Promise<LumenCourse | null> {
    loading.value = true
    try {
      const data = await api<LumenCourse>(() => window.api.createLumenCourse(payload))
      if (data) {
        courses.value = [data, ...courses.value]
        currentCourse.value = data
      }
      return data
    } finally {
      loading.value = false
    }
  }

  async function updateCourse(id: number, payload: { title?: string; summary?: string; content?: string }): Promise<LumenCourse | null> {
    const data = await api<LumenCourse>(() => window.api.updateLumenCourse(id, payload))
    if (data) {
      const idx = courses.value.findIndex(c => c.id === id)
      if (idx !== -1) courses.value = [...courses.value.slice(0, idx), data, ...courses.value.slice(idx + 1)]
      if (currentCourse.value?.id === id) currentCourse.value = data
    }
    return data
  }

  async function publishCourse(id: number): Promise<boolean> {
    const data = await api<LumenCourse>(() => window.api.publishLumenCourse(id))
    if (data) {
      const idx = courses.value.findIndex(c => c.id === id)
      if (idx !== -1) courses.value = [...courses.value.slice(0, idx), data, ...courses.value.slice(idx + 1)]
      if (currentCourse.value?.id === id) currentCourse.value = data
      return true
    }
    return false
  }

  async function unpublishCourse(id: number): Promise<boolean> {
    const data = await api<LumenCourse>(() => window.api.unpublishLumenCourse(id))
    if (data) {
      const idx = courses.value.findIndex(c => c.id === id)
      if (idx !== -1) courses.value = [...courses.value.slice(0, idx), data, ...courses.value.slice(idx + 1)]
      if (currentCourse.value?.id === id) currentCourse.value = data
      return true
    }
    return false
  }

  async function deleteCourse(id: number): Promise<boolean> {
    const data = await api<{ id: number; deleted: boolean }>(() => window.api.deleteLumenCourse(id))
    if (data?.deleted) {
      courses.value = courses.value.filter(c => c.id !== id)
      if (currentCourse.value?.id === id) currentCourse.value = null
      return true
    }
    return false
  }

  function clearCurrentCourse() {
    currentCourse.value = null
  }

  return {
    courses, currentCourse, loading,
    publishedCourses, draftCourses,
    fetchCoursesForPromo, fetchCourse,
    createCourse, updateCourse,
    publishCourse, unpublishCourse, deleteCourse,
    clearCurrentCourse,
  }
})
