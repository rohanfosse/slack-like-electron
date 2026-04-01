<script setup lang="ts">
  // Etat vide reutilisable : icone + titre + sous-titre + action optionnelle
  import type { Component } from 'vue'

  defineProps<{
    icon?: Component
    title?: string
    subtitle?: string
    compact?: boolean
  }>()
</script>

<template>
  <div class="es" :class="{ 'es--compact': compact }">
    <div v-if="icon" class="es-icon">
      <component :is="icon" :size="compact ? 24 : 32" />
    </div>
    <slot name="icon" />
    <h3 v-if="title" class="es-title">{{ title }}</h3>
    <p v-if="subtitle" class="es-sub">{{ subtitle }}</p>
    <slot />
  </div>
</template>

<style scoped>
.es {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 24px;
  text-align: center;
}

.es--compact { padding: 20px 16px; }

.es-icon {
  color: var(--text-muted);
  opacity: 0.3;
  margin-bottom: 8px;
}

.es-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.es--compact .es-title { font-size: 13px; }

.es-sub {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 320px;
  line-height: 1.5;
}

.es--compact .es-sub { font-size: 12px; }
</style>
