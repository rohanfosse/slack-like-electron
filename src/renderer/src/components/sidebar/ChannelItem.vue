<script setup lang="ts">
  import { computed } from 'vue'
  import { useAppStore } from '@/stores/app'

  interface Props {
    channelId: number
    name:      string
    prefix?:   string
    type?:     'chat' | 'annonce' | 'dm'
    muted?:    boolean
  }

  const props  = withDefaults(defineProps<Props>(), { prefix: '#', type: 'chat', muted: false })
  const emit   = defineEmits<{ click: []; contextmenu: [e: MouseEvent] }>()
  const appStore = useAppStore()

  const isActive = computed(() => appStore.activeChannelId === props.channelId)
  const unread   = computed(() => (props.muted ? 0 : appStore.unread[props.channelId] ?? 0))
</script>

<template>
  <button
    class="sidebar-item"
    :class="{ active: isActive, 'has-unread': unread > 0, 'is-muted': muted }"
    @click="emit('click')"
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    <span class="channel-prefix">{{ muted ? '🔇' : prefix }}</span>
    <span class="channel-name">{{ name }}</span>
    <span v-if="unread > 0" class="unread-badge">{{ unread > 9 ? '9+' : unread }}</span>
  </button>
</template>

<style scoped>
.is-muted { opacity: .55; }
.is-muted:hover { opacity: .8; }
</style>
