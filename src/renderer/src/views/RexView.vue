/** Vue REX — wrapper qui affiche la vue etudiant. */
<script setup lang="ts">
import StudentRexView from '@/components/rex/StudentRexView.vue'
import ErrorBoundary  from '@/components/ui/ErrorBoundary.vue'
</script>
<template>
  <ErrorBoundary label="Pulse">
    <StudentRexView />
  </ErrorBoundary>
</template>
