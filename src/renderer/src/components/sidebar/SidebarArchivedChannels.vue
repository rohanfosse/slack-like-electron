<script setup lang="ts">
/**
 * SidebarArchivedChannels : section repliable des canaux archives (staff).
 * Chaque ligne offre une action "restaurer" qui repasse le canal en actif.
 */
import { ChevronDown, Archive, ArchiveRestore } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import type { Channel } from '@/types'

interface Props {
  channels: Channel[]
  collapsed: boolean
}
interface Emits {
  (e: 'update:collapsed', value: boolean): void
  (e: 'select', channel: Channel): void
  (e: 'restore', channelId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const appStore = useAppStore()

function toggle() { emit('update:collapsed', !props.collapsed) }
</script>

<template>
  <div class="sidebar-separator" />
  <div
    class="sidebar-section-header sidebar-collapsible-header"
    role="button"
    tabindex="0"
    :aria-expanded="!collapsed"
    @click="toggle"
    @keydown.enter="toggle"
    @keydown.space.prevent="toggle"
  >
    <ChevronDown :size="12" class="sidebar-category-chevron" :class="{ rotated: collapsed }" />
    <Archive :size="12" style="opacity:.5" />
    <span>Canaux archives</span>
    <span class="sidebar-section-count">{{ channels.length }}</span>
  </div>

  <nav v-show="!collapsed" aria-label="Canaux archives" class="sidebar-scroll-list">
    <div
      v-for="ch in channels"
      :key="'arch-' + ch.id"
      class="sidebar-item archived-channel-item"
      :class="{ active: appStore.activeChannelId === ch.id }"
      role="button"
      tabindex="0"
      :aria-label="'Canal archive ' + ch.name"
      @click="emit('select', ch)"
      @keydown.enter="emit('select', ch)"
      @keydown.space.prevent="emit('select', ch)"
    >
      <span class="channel-prefix archived-prefix">#</span>
      <span class="channel-name archived-name">{{ ch.name }}</span>
      <button
        class="archived-restore-btn"
        title="Restaurer"
        aria-label="Restaurer le canal"
        @click.stop="emit('restore', ch.id)"
      >
        <ArchiveRestore :size="13" />
      </button>
    </div>
  </nav>
</template>
