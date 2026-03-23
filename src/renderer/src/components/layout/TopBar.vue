/** TopBar — Barre navigation + recherche contextuelle (style Slack). */
<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { ChevronLeft, ChevronRight, Search, X } from 'lucide-vue-next'
  import { useAppStore }      from '@/stores/app'
  import { useMessagesStore } from '@/stores/messages'
  import { useModalsStore }   from '@/stores/modals'
  import { useRoute }         from 'vue-router'

  const appStore      = useAppStore()
  const messagesStore = useMessagesStore()
  const modals        = useModalsStore()
  const route         = useRoute()

  const searchInput   = ref('')
  const searchFocused = ref(false)

  const contextLabel = computed(() => {
    if (appStore.activeChannelName) {
      return appStore.activeDmStudentId
        ? appStore.activeChannelName
        : `#${appStore.activeChannelName}`
    }
    return ''
  })

  const placeholder = computed(() => {
    if (contextLabel.value) return `Rechercher dans ${contextLabel.value}`
    return 'Rechercher (Ctrl+K)'
  })

  const isMessagesRoute = computed(() => route.name === 'messages')

  function onFocus() {
    searchFocused.value = true
  }

  function onBlur() {
    // Petit delai pour laisser le click sur X se produire
    setTimeout(() => { searchFocused.value = false }, 150)
  }

  function doSearch() {
    const term = searchInput.value.trim()
    if (!term) return

    // Si on est dans Messages avec un canal actif, faire une recherche in-channel
    if (isMessagesRoute.value && (appStore.activeChannelId || appStore.activeDmStudentId)) {
      messagesStore.searchTerm = term
      messagesStore.fetchMessages()
    } else {
      // Sinon ouvrir la palette Ctrl+K avec le terme pre-rempli
      modals.cmdPalette = true
    }
  }

  function clearSearch() {
    searchInput.value = ''
    messagesStore.searchTerm = ''
    messagesStore.fetchMessages()
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (messagesStore.searchTerm) clearSearch()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  // Ctrl+K ouvre la palette globale
  function openPalette() {
    modals.cmdPalette = true
  }
</script>

<template>
  <div class="topbar">
    <!-- Navigation arrows -->
    <div class="topbar-nav">
      <button
        class="topbar-nav-btn"
        :disabled="!appStore.canGoBack"
        title="Precedent"
        aria-label="Retour"
        @click="appStore.goBack()"
      >
        <ChevronLeft :size="16" />
      </button>
      <button
        class="topbar-nav-btn"
        :disabled="!appStore.canGoForward"
        title="Suivant"
        aria-label="Avancer"
        @click="appStore.goForward()"
      >
        <ChevronRight :size="16" />
      </button>
    </div>

    <!-- Search bar -->
    <div
      class="topbar-search"
      :class="{ focused: searchFocused, 'has-term': messagesStore.searchTerm }"
    >
      <Search :size="14" class="topbar-search-icon" />
      <input
        v-model="searchInput"
        type="text"
        class="topbar-search-input"
        :placeholder="placeholder"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter="doSearch"
        @keydown="onKeydown"
      />
      <span v-if="messagesStore.searchTerm && isMessagesRoute" class="topbar-search-count">
        {{ messagesStore.messages.length }} resultat{{ messagesStore.messages.length !== 1 ? 's' : '' }}
      </span>
      <button v-if="searchInput || messagesStore.searchTerm" class="topbar-search-clear" @click="clearSearch">
        <X :size="13" />
      </button>
      <kbd class="topbar-kbd" @click="openPalette">Ctrl+K</kbd>
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 0 12px;
  flex: 1;
  min-width: 0;
  -webkit-app-region: no-drag;
}

/* ── Navigation arrows ── */
.topbar-nav {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.topbar-nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  border: none; background: transparent;
  color: var(--text-muted, #888); cursor: pointer;
  transition: all .15s;
}
.topbar-nav-btn:hover:not(:disabled) {
  background: rgba(255,255,255,.08);
  color: var(--text-primary, #fff);
}
.topbar-nav-btn:disabled { opacity: .25; cursor: default; }

/* ── Search bar ── */
.topbar-search {
  flex: 1;
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  background: rgba(255,255,255,.06);
  border: 1px solid transparent;
  transition: all .2s;
}
.topbar-search:hover { background: rgba(255,255,255,.09); }
.topbar-search.focused {
  background: var(--bg-elevated, #1e1f21);
  border-color: var(--accent, #0d9488);
  box-shadow: 0 0 0 1px var(--accent, #0d9488);
}
.topbar-search.has-term {
  border-color: rgba(13, 148, 136, 0.3);
}

.topbar-search-icon {
  color: var(--text-muted, #888);
  flex-shrink: 0;
}
.topbar-search-input {
  flex: 1; min-width: 0;
  background: transparent; border: none; outline: none;
  color: var(--text-primary, #fff);
  font-size: 13px; font-family: var(--font, inherit);
}
.topbar-search-input::placeholder {
  color: var(--text-muted, #888);
}

.topbar-search-count {
  font-size: 11px; color: var(--text-muted, #888);
  white-space: nowrap; flex-shrink: 0;
}

.topbar-search-clear {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 4px;
  border: none; background: transparent;
  color: var(--text-muted, #888); cursor: pointer;
  transition: all .15s; flex-shrink: 0;
}
.topbar-search-clear:hover { background: rgba(255,255,255,.1); color: var(--text-primary, #fff); }

.topbar-kbd {
  font-size: 10px; font-family: var(--font, inherit);
  padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: var(--text-muted, #888);
  cursor: pointer; flex-shrink: 0;
  line-height: 1;
  transition: all .15s;
}
.topbar-kbd:hover { background: rgba(255,255,255,.1); color: var(--text-secondary, #aaa); }

/* ── Light theme ── */
body.light .topbar-search {
  background: rgba(0,0,0,.04);
}
body.light .topbar-search:hover { background: rgba(0,0,0,.07); }
body.light .topbar-search.focused {
  background: #fff;
  border-color: var(--accent, #0d9488);
}
body.light .topbar-nav-btn:hover:not(:disabled) {
  background: rgba(0,0,0,.06);
  color: rgba(0,0,0,.8);
}
body.light .topbar-kbd {
  background: rgba(0,0,0,.04);
  border-color: rgba(0,0,0,.1);
}
</style>
