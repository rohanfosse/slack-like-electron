/**
 * WidgetQuickCreate.vue — Boutons rapides pour creer un devoir, un
 * cours Lumen, ou ouvrir les ressources. Shortcut prof pour reduire
 * les frictions de creation de contenu.
 */
<script setup lang="ts">
import { Plus, FileText, Lightbulb, FolderOpen } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useModalsStore } from '@/stores/modals'

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
  <div class="dashboard-card sa-card wqc-card">
    <div class="sa-card-header">
      <Plus :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Creation rapide</span>
    </div>

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
  </div>
</template>

<style scoped>
.wqc-card { cursor: default; }

.wqc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}
.wqc-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 6px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  transition: all var(--motion-fast) var(--ease-out);
  min-height: 56px;
}
.wqc-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}
.wqc-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.wqc-btn:active { transform: translateY(0); }
</style>
