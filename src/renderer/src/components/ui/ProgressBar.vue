<script setup lang="ts">
  // Barre de progression reutilisable
  import { computed } from 'vue'

  const props = withDefaults(defineProps<{
    value: number
    max?: number
    color?: string
    size?: 'sm' | 'md' | 'lg'
    label?: string
    showPct?: boolean
  }>(), {
    max: 100,
    size: 'sm',
    showPct: false,
  })

  const pct = computed(() =>
    props.max > 0 ? Math.min(100, Math.round((props.value / props.max) * 100)) : 0,
  )
</script>

<template>
  <div class="pb" :class="`pb--${size}`">
    <div class="pb-track">
      <div
        class="pb-fill"
        :style="{ width: pct + '%', background: color || undefined }"
      />
    </div>
    <span v-if="label || showPct" class="pb-label">
      {{ label || (pct + '%') }}
    </span>
  </div>
</template>

<style scoped>
.pb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pb-track {
  flex: 1;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
}

.pb--sm .pb-track { height: 4px; }
.pb--md .pb-track { height: 6px; }
.pb--lg .pb-track { height: 10px; border-radius: 6px; }

.pb-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 0.3s ease;
}

.pb-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
