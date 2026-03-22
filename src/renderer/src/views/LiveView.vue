<!-- LiveView.vue — Wrapper : affiche la vue prof ou étudiant selon le rôle -->
<script setup lang="ts">
  import { useAppStore } from '@/stores/app'
  import TeacherLiveView from '@/components/live/TeacherLiveView.vue'
  import StudentLiveView from '@/components/live/StudentLiveView.vue'

  const appStore = useAppStore()
</script>

<template>
  <TeacherLiveView v-if="appStore.isStaff" />
  <StudentLiveView v-else />
</template>
