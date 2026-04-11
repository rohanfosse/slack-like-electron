<script setup lang="ts">
/**
 * WidgetLumenProgress.vue — "Continuer la lecture".
 *
 * v2.48 : le tracking "X/Y chapitres lus" est supprime (accuse de lecture
 * retire). Ce widget affiche maintenant le dernier chapitre ouvert dans
 * Lumen avec un gros bouton qui y retourne directement. Zero friction pour
 * reprendre son cours. Si pas d'historique, affiche juste un lien vers le
 * module Lumen.
 */
import { computed, onMounted, ref } from 'vue'
import { BookOpen, ChevronRight, Play } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useLumenStore } from '@/stores/lumen'
import { useAppStore } from '@/stores/app'
import { useLumenLastChapter } from '@/composables/useLumenLastChapter'

const router = useRouter()
const lumenStore = useLumenStore()
const appStore = useAppStore()
const lastChapter = useLumenLastChapter()

const loading = ref(true)

onMounted(async () => {
  const pid = appStore.activePromoId
  if (pid) {
    await lumenStore.fetchReposForPromo(pid)
  }
  loading.value = false
})

/** Dernier chapitre lu (depuis localStorage) enrichi avec titres du manifest. */
const resumeInfo = computed(() => {
  const pid = appStore.activePromoId
  if (!pid) return null
  const last = lastChapter.get(pid)
  if (!last) return null
  const repo = lumenStore.repos.find((r) => r.id === last.repoId)
  if (!repo) return null
  const chapter = repo.manifest?.chapters.find((c) => c.path === last.chapterPath)
  if (!chapter) return null
  return {
    repoName: repo.manifest?.project ?? repo.fullName,
    chapterTitle: chapter.title,
    repoId: repo.id,
    chapterPath: last.chapterPath,
  }
})

function openLumen() {
  const r = resumeInfo.value
  if (r) {
    router.push({ name: 'lumen', query: { repo: String(r.repoId), chapter: r.chapterPath } })
  } else {
    router.push('/lumen')
  }
}
</script>

<template>
  <div class="wlp-card">
    <header class="wlp-head">
      <div class="wlp-title">
        <BookOpen :size="14" />
        <span>Continuer la lecture</span>
      </div>
      <button type="button" class="wlp-more" title="Ouvrir Lumen" @click="openLumen">
        <ChevronRight :size="12" />
      </button>
    </header>

    <div v-if="loading" class="wlp-body wlp-loading">
      <span>Chargement...</span>
    </div>

    <button v-else-if="resumeInfo" type="button" class="wlp-resume" @click="openLumen">
      <span class="wlp-resume-icon">
        <Play :size="14" />
      </span>
      <span class="wlp-resume-text">
        <span class="wlp-resume-repo">{{ resumeInfo.repoName }}</span>
        <span class="wlp-resume-chapter">{{ resumeInfo.chapterTitle }}</span>
      </span>
    </button>

    <div v-else class="wlp-body wlp-empty">
      <p>Aucun cours ouvert recemment.</p>
      <button type="button" class="wlp-open-btn" @click="openLumen">
        Ouvrir Lumen
      </button>
    </div>
  </div>
</template>

<style scoped>
.wlp-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  height: 100%;
}
.wlp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wlp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.wlp-more {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 2px;
}

.wlp-body {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.wlp-loading {
  color: var(--text-muted);
  font-size: 12px;
  justify-content: center;
}

.wlp-resume {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all var(--t-fast, 150ms) ease;
}
.wlp-resume:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}
.wlp-resume-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  flex-shrink: 0;
}
.wlp-resume-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.wlp-resume-repo {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wlp-resume-chapter {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wlp-empty {
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  font-size: 12px;
  color: var(--text-muted);
}
.wlp-empty p { margin: 0; }
.wlp-open-btn {
  padding: 6px 14px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
.wlp-open-btn:hover { opacity: 0.9; }
</style>
