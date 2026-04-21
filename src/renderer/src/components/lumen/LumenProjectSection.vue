<script setup lang="ts">
/**
 * Pill compact "Cours Lumen" integre dans la barre de stats d'un projet.
 *
 * Comportements :
 *  - 0 repo + teacher : petit lien "+ Lier un cours" (ouvre LumenLinkRepoModal)
 *  - 0 repo + student : rend rien
 *  - >=1 repo : pill cliquable "N cours Lumen" avec dropdown listant repos + chapitres
 *
 * Place inline dans le header projet, n'impose plus aucun bloc vertical.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, FileText, Plus, ChevronDown, AlertTriangle } from 'lucide-vue-next'
import { useLumenStore } from '@/stores/lumen'
import { useToast } from '@/composables/useToast'
import type { LumenRepo } from '@/types'
import LumenLinkRepoModal from '@/components/lumen/LumenLinkRepoModal.vue'

interface Props {
  promoId: number
  projectName: string
  isTeacher: boolean
}
const props = defineProps<Props>()

const router = useRouter()
const lumenStore = useLumenStore()
const { showToast } = useToast()

const linkedRepos = ref<LumenRepo[]>([])
const loading = ref(false)
const linkModalOpen = ref(false)
const dropdownOpen = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

async function loadRepos(): Promise<void> {
  if (!props.promoId || !props.projectName) return
  loading.value = true
  try {
    linkedRepos.value = await lumenStore.fetchReposByProjectName(props.promoId, props.projectName)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadRepos()
  document.addEventListener('mousedown', onClickAway, { capture: true })
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickAway, { capture: true })
  document.removeEventListener('keydown', onKey)
})
watch(() => [props.promoId, props.projectName], loadRepos)

const hasRepos = computed(() => linkedRepos.value.length > 0)
const shouldRender = computed(() => props.isTeacher || hasRepos.value)

function onClickAway(e: MouseEvent): void {
  if (!dropdownOpen.value) return
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) dropdownOpen.value = false
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && dropdownOpen.value) dropdownOpen.value = false
}

function openChapter(repo: LumenRepo, chapterPath: string): void {
  dropdownOpen.value = false
  router.push({ name: 'lumen', query: { repo: String(repo.id), chapter: chapterPath } })
}

function openFirstChapter(repo: LumenRepo): void {
  const first = repo.manifest?.chapters?.[0]
  if (first) openChapter(repo, first.path)
}

function handleLinked(): void {
  linkModalOpen.value = false
  showToast('Cours lié au projet', 'success')
  loadRepos()
}
</script>

<template>
  <span v-if="shouldRender" ref="wrapperRef" class="lumen-inline">
    <!-- Teacher + 0 repo : lien discret -->
    <button
      v-if="!loading && !hasRepos && isTeacher"
      type="button"
      class="lumen-inline-link"
      title="Lier un cours Lumen à ce projet"
      @click="linkModalOpen = true"
    >
      <Plus :size="11" />
      <span>Lier un cours</span>
    </button>

    <!-- >=1 repo : pill + dropdown -->
    <template v-else-if="hasRepos">
      <button
        type="button"
        class="lumen-inline-pill"
        :class="{ 'lumen-inline-pill--open': dropdownOpen }"
        :title="`${linkedRepos.length} cours Lumen lié${linkedRepos.length > 1 ? 's' : ''}`"
        @click="dropdownOpen = !dropdownOpen"
      >
        <BookOpen :size="11" />
        <span>{{ linkedRepos.length }} cours Lumen</span>
        <ChevronDown :size="11" class="lumen-inline-chev" />
      </button>

      <div v-if="dropdownOpen" class="lumen-inline-panel" role="menu">
        <div class="lumen-inline-panel-header">
          <span>Cours liés</span>
          <button
            v-if="isTeacher"
            type="button"
            class="lumen-inline-add"
            title="Lier un autre cours"
            @click="linkModalOpen = true; dropdownOpen = false"
          >
            <Plus :size="10" /> Ajouter
          </button>
        </div>

        <ul class="lumen-inline-repo-list">
          <li v-for="repo in linkedRepos" :key="repo.id" class="lumen-inline-repo">
            <button
              type="button"
              class="lumen-inline-repo-title"
              :title="`Ouvrir ${repo.manifest?.project ?? repo.fullName}`"
              @click="openFirstChapter(repo)"
            >
              <span class="lumen-inline-repo-name">{{ repo.manifest?.project ?? repo.fullName }}</span>
              <span v-if="repo.manifest?.module" class="lumen-inline-repo-module">{{ repo.manifest.module }}</span>
              <AlertTriangle v-if="repo.manifestError" :size="11" class="lumen-inline-err" :title="repo.manifestError ?? undefined" />
            </button>
            <ol v-if="repo.manifest?.chapters?.length" class="lumen-inline-chapters">
              <li v-for="(ch, i) in repo.manifest.chapters" :key="ch.path">
                <button
                  type="button"
                  class="lumen-inline-chapter"
                  @click="openChapter(repo, ch.path)"
                >
                  <span class="lumen-inline-chapter-num">{{ String(i + 1).padStart(2, '0') }}</span>
                  <FileText :size="10" />
                  <span class="lumen-inline-chapter-title">{{ ch.title }}</span>
                  <span v-if="ch.duration" class="lumen-inline-chapter-duration">{{ ch.duration }} min</span>
                </button>
              </li>
            </ol>
          </li>
        </ul>
      </div>
    </template>

    <LumenLinkRepoModal
      v-if="linkModalOpen"
      :promo-id="promoId"
      :project-name="projectName"
      @close="linkModalOpen = false"
      @linked="handleLinked"
    />
  </span>
</template>

<style scoped>
.lumen-inline {
  position: relative;
  display: inline-flex;
  align-items: center;
  font-family: var(--font);
}

/* Tiny text-link version (teacher + 0 repo) */
.lumen-inline-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  border-radius: 5px;
  cursor: pointer;
  transition: color .1s, background .1s;
}
.lumen-inline-link:hover {
  color: var(--accent);
  background: var(--accent-subtle, rgba(var(--accent-rgb), .1));
}

/* Pill version (>=1 repo) */
.lumen-inline-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: var(--bg-hover, rgba(255, 255, 255, .05));
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background .1s, color .1s, border-color .1s;
  font-family: inherit;
}
.lumen-inline-pill:hover,
.lumen-inline-pill--open {
  background: var(--accent-subtle, rgba(var(--accent-rgb), .1));
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), .4);
}
.lumen-inline-chev {
  transition: transform .15s ease;
}
.lumen-inline-pill--open .lumen-inline-chev {
  transform: rotate(180deg);
}

/* Dropdown panel */
.lumen-inline-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  min-width: 280px;
  max-width: 380px;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35), 0 2px 8px rgba(0, 0, 0, .25);
  animation: lumen-inline-in .12s ease;
  padding: 4px;
}
@keyframes lumen-inline-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: none; }
}
.lumen-inline-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.lumen-inline-add {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: transparent;
  border: none;
  color: var(--accent);
  font-size: 10px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  border-radius: 4px;
  font-family: inherit;
}
.lumen-inline-add:hover { background: var(--accent-subtle, rgba(var(--accent-rgb), .1)); }

.lumen-inline-repo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lumen-inline-repo {
  border-radius: 6px;
  overflow: hidden;
}
.lumen-inline-repo-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 5px;
  transition: background .1s;
}
.lumen-inline-repo-title:hover { background: var(--bg-hover, rgba(255, 255, 255, .06)); }
.lumen-inline-repo-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lumen-inline-repo-module {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 400;
  flex-shrink: 0;
}
.lumen-inline-err { color: var(--color-warning, #d98a00); flex-shrink: 0; }

.lumen-inline-chapters {
  list-style: none;
  margin: 0 0 4px;
  padding: 0 4px 2px 6px;
}
.lumen-inline-chapter {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 8px 4px 18px;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background .1s, border-left-color .1s, color .1s;
}
.lumen-inline-chapter:hover {
  background: var(--bg-hover, rgba(255, 255, 255, .05));
  color: var(--text-primary);
  border-left-color: var(--accent);
}
.lumen-inline-chapter-num {
  font-variant-numeric: tabular-nums;
  font-size: 9.5px;
  color: var(--text-muted);
  width: 16px;
  flex-shrink: 0;
}
.lumen-inline-chapter-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lumen-inline-chapter-duration {
  font-size: 9.5px;
  color: var(--text-muted);
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  .lumen-inline-panel,
  .lumen-inline-chev { animation: none; transition: none; }
}
</style>
