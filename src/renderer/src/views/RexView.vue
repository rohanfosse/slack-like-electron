<!-- RexView.vue - Affiche la vue Pulse enseignant ou etudiant selon le role -->
<script setup lang="ts">
  import { useAppStore } from '@/stores/app'
  import TeacherRexView from '@/components/rex/TeacherRexView.vue'
  import StudentRexView from '@/components/rex/StudentRexView.vue'
  import ErrorBoundary  from '@/components/ui/ErrorBoundary.vue'

  const appStore = useAppStore()
</script>

<template>
  <ErrorBoundary label="Pulse">
    <TeacherRexView v-if="appStore.isTeacher || appStore.isAdmin" />
    <StudentRexView v-else />
  </ErrorBoundary>
</template>
