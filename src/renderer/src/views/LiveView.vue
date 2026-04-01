<!-- LiveView.vue - Vue étudiant pour les sessions live (la vue prof est dans le dashboard) -->
<script setup lang="ts">
  import StudentLiveView from '@/components/live/StudentLiveView.vue'
  import ErrorBoundary   from '@/components/ui/ErrorBoundary.vue'
</script>

<template>
  <ErrorBoundary label="Live Quiz">
    <StudentLiveView />
  </ErrorBoundary>
</template>
