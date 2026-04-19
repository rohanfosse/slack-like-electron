<script setup lang="ts">
import { Plus, FileText, Lightbulb, FolderOpen } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useModalsStore } from '@/stores/modals'
import UiWidgetCard from '@/components/ui/UiWidgetCard.vue'

const router = useRouter()
const modals = useModalsStore()

function createDevoir() {
  modals.newDevoir = true
}

function createLumenCourse() {
  router.push('/lumen')
}

function openDocuments() {
  router.push('/documents')
}
</script>

<template>
  <UiWidgetCard :icon="Plus" label="Creation rapide">
    <div class="wqc-grid">
      <button type="button" class="wqc-btn" @click="createDevoir">
        <FileText :size="18" />
        <span>Devoir</span>
      </button>
      <button type="button" class="wqc-btn" @click="createLumenCourse">
        <Lightbulb :size="18" />
        <span>Cours Lumen</span>
      </button>
      <button type="button" class="wqc-btn" @click="openDocuments">
        <FolderOpen :size="18" />
        <span>Ressources</span>
      </button>
    </div>
  </UiWidgetCard>
</template>

<style scoped>
.wqc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.wqc-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-md) var(--space-xs);
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  transition:
    background var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
  min-height: 56px;
}

.wqc-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.wqc-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.wqc-btn:active { transform: translateY(0); }
</style>
