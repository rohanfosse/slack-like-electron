<!-- LiveView.vue - Affiche la vue Spark enseignant ou etudiant selon le role -->
<script setup lang="ts">
  import { useAppStore } from '@/stores/app'
  import TeacherLiveView from '@/components/live/TeacherLiveView.vue'
  import StudentLiveView from '@/components/live/StudentLiveView.vue'
  import ErrorBoundary   from '@/components/ui/ErrorBoundary.vue'

  const appStore = useAppStore()
</script>

<template>
  <ErrorBoundary label="Spark">
    <TeacherLiveView v-if="appStore.isTeacher || appStore.isAdmin" />
    <StudentLiveView v-else />
  </ErrorBoundary>
</template>
