<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTravauxStore } from '@/stores/travaux'

const appStore = useAppStore()
const travauxStore = useTravauxStore()

const onlineCount = computed(() => appStore.onlineUsers?.length ?? 0)

const rendusTotal = computed(() => {
  return travauxStore.devoirs.filter((d) => d.depot_id != null).length
})

const hasData = computed(() => onlineCount.value > 0 || rendusTotal.value > 0)
</script>

<template>
  <div class="wpa">
    <template v-if="hasData">
      <span class="wpa-dot" />
      <span class="wpa-text">
        <strong class="wpa-mono">{{ onlineCount }}</strong> en ligne
        <template v-if="rendusTotal > 0">
          <span class="wpa-sep">·</span>
          <strong class="wpa-mono">{{ rendusTotal }}</strong> rendus
        </template>
      </span>
    </template>
    <template v-else>
      <span class="wpa-text wpa-text--muted">Activité de la promo</span>
    </template>
  </div>
</template>

<style scoped>
.wpa {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: background var(--motion-base) var(--ease-out), border-color var(--motion-base) var(--ease-out);
}

.wpa-dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--color-online);
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(var(--color-success-rgb), 0.4);
}

.wpa-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.wpa-text--muted {
  color: var(--text-muted);
  opacity: .7;
}

.wpa-sep {
  margin: 0 var(--space-xs);
  color: var(--text-muted);
  opacity: .5;
}

.wpa-mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}
</style>
