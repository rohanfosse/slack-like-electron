<script setup lang="ts">
  // Squelette de chargement reutilisable avec variantes
  defineProps<{
    variant?: 'list' | 'card' | 'message' | 'avatar' | 'line'
    rows?: number
    animated?: boolean
  }>()
</script>

<template>
  <!-- Single line skeleton -->
  <div v-if="variant === 'line'" class="sk sk-line skel-pulse" />

  <!-- Avatar skeleton -->
  <div v-else-if="variant === 'avatar'" class="sk sk-avatar skel-pulse" />

  <!-- Card skeleton (dashboard widget) -->
  <template v-else-if="variant === 'card'">
    <div v-for="i in (rows ?? 4)" :key="i" class="sk sk-card skel-pulse" />
  </template>

  <!-- Message skeleton (chat) -->
  <template v-else-if="variant === 'message'">
    <div v-for="i in (rows ?? 5)" :key="i" class="sk-msg-row">
      <div class="sk sk-avatar skel-pulse" />
      <div class="sk-msg-body">
        <div class="sk sk-line skel-pulse" :style="{ width: '30%' }" />
        <div class="sk sk-line skel-pulse" :style="{ width: (60 + (i % 3) * 15) + '%' }" />
      </div>
    </div>
  </template>

  <!-- List skeleton (default) -->
  <template v-else>
    <div v-for="i in (rows ?? 5)" :key="i" class="sk-list-row">
      <div class="sk sk-avatar sk-avatar-sm skel-pulse" />
      <div class="sk sk-line skel-pulse" :style="{ width: (45 + (i % 3) * 18) + '%' }" />
    </div>
  </template>
</template>

<style scoped>
.sk {
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
}

.sk-line {
  height: 12px;
  border-radius: 6px;
}

.sk-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sk-avatar-sm {
  width: 24px;
  height: 24px;
}

.sk-card {
  height: 80px;
  border-radius: var(--radius);
}

.sk-list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}

.sk-msg-row {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.sk-msg-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.skel-pulse {
  animation: skelPulse 1.5s ease-in-out infinite;
}

@keyframes skelPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .skel-pulse { animation: none; }
}
</style>
