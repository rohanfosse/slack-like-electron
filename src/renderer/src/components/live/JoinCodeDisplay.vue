<!-- JoinCodeDisplay.vue - Affichage grand format du code de session Live -->
<script setup lang="ts">
  import { ref } from 'vue'
  import { Copy, Check } from 'lucide-vue-next'

  const props = defineProps<{ code: string }>()

  const copied = ref(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(props.code)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } catch { /* clipboard not available */ }
  }
</script>

<template>
  <div class="join-code-card">
    <span class="join-code-label">Code de session</span>
    <div class="join-code-value">
      <span v-for="(ch, i) in code.split('')" :key="i" class="join-code-char" :style="{ animationDelay: `${i * 60}ms` }">
        {{ ch }}
      </span>
    </div>
    <button class="join-code-copy" :class="{ copied }" @click="copyCode">
      <Check v-if="copied" :size="16" />
      <Copy v-else :size="16" />
      {{ copied ? 'Copié !' : 'Copier' }}
    </button>
  </div>
</template>

<style scoped>
.join-code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 40px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius, 12px);
}
.join-code-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.join-code-value {
  display: flex;
  gap: 8px;
}
.join-code-char {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 48px;
  font-weight: 800;
  color: var(--text-primary);
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 60px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: char-pop .3s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes char-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.join-code-copy {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: var(--bg-hover);
  color: var(--text-secondary, #aaa);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all .15s;
}
.join-code-copy:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.join-code-copy.copied {
  color: #22c55e;
  border-color: rgba(34,197,94,.3);
}
</style>
