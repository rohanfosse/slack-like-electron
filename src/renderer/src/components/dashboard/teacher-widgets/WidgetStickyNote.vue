<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { StickyNote } from 'lucide-vue-next'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

const STORAGE_KEY = 'teacher_sticky_note'
const MAX_CHARS = 2000

const content = ref<string>('')
const initialized = ref(false)

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) content.value = saved
  } catch { /* storage disabled */ }
  initialized.value = true
})

let persistTimer: ReturnType<typeof setTimeout> | null = null
watch(content, (newVal) => {
  if (!initialized.value) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, newVal.slice(0, MAX_CHARS))
    } catch { /* quota full */ }
  }, 1000)
})

onUnmounted(() => {
  if (persistTimer) clearTimeout(persistTimer)
})
</script>

<template>
  <UiWidgetCard :icon="StickyNote" label="Bloc-notes" class="wsn-card">
    <textarea
      v-model="content"
      class="wsn-textarea"
      :maxlength="MAX_CHARS"
      placeholder="Note perso rapide… (sauvegarde auto, privé)"
      aria-label="Bloc-notes personnel"
      rows="6"
    />
  </UiWidgetCard>
</template>

<style scoped>
.wsn-card {
  background: linear-gradient(135deg, rgba(255, 232, 141, 0.08) 0%, rgba(255, 214, 51, 0.04) 100%);
}

.wsn-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font);
  font-size: var(--text-sm);
  line-height: 1.5;
  resize: none;
  padding: var(--space-xs);
  box-sizing: border-box;
  min-height: 110px;
}
.wsn-textarea::placeholder {
  color: var(--text-muted);
  font-style: italic;
}
.wsn-textarea:focus {
  background: rgba(255, 232, 141, 0.05);
  border-radius: var(--radius-sm);
}
</style>
