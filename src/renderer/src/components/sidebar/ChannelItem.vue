<script setup lang="ts">
  import { computed } from 'vue'
  import { Lock, Hash, Megaphone, VolumeX } from 'lucide-vue-next'
  import { useAppStore } from '@/stores/app'

  interface Props {
    channelId:  number
    name:       string
    type?:      'chat' | 'annonce' | 'dm'
    muted?:     boolean
    isPrivate?: boolean
    description?: string | null
  }

  const props  = withDefaults(defineProps<Props>(), { type: 'chat', muted: false, isPrivate: false, description: null })
  const emit   = defineEmits<{ click: []; contextmenu: [e: MouseEvent] }>()
  const appStore = useAppStore()

  const isActive    = computed(() => appStore.activeChannelId === props.channelId)
  const unread      = computed(() => (props.muted ? 0 : appStore.unread[props.channelId] ?? 0))
  const mentionPing = computed(() => (props.muted ? 0 : appStore.mentionChannels[props.channelId] ?? 0))

  // Icône dérivée du type/état — évite les emojis (font-dependent)
  const PrefixIcon = computed(() => {
    if (props.muted) return VolumeX
    if (props.type === 'annonce') return Megaphone
    return Hash
  })
</script>

<template>
  <button
    class="sidebar-item"
    :class="{
      active: isActive,
      'has-unread': unread > 0,
      'has-mention': mentionPing > 0,
      'is-muted': muted,
    }"
    :title="description || undefined"
    @click="emit('click')"
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    <component :is="PrefixIcon" :size="13" class="channel-prefix" aria-hidden="true" />
    <span class="channel-name">{{ name }}</span>
    <Lock v-if="isPrivate" :size="10" class="channel-lock" aria-label="Canal privé" />

    <!-- Badge mention @ - prioritaire sur le badge unread -->
    <span v-if="mentionPing > 0" class="mention-ping-badge" aria-label="Vous êtes mentionné">@</span>
    <span v-else-if="unread > 0" class="unread-badge">{{ unread > 9 ? '9+' : unread }}</span>
  </button>
</template>

<style scoped>
.is-muted { opacity: .55; }
.is-muted:hover { opacity: .8; }

/* Icône prefix : cohérente avec text color du bouton parent */
.channel-prefix {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: .7;
}
.sidebar-item.active .channel-prefix { color: var(--accent); opacity: 1; }
.sidebar-item.has-unread .channel-prefix { opacity: .9; }
.sidebar-item.has-mention .channel-prefix { color: var(--color-danger); opacity: 1; }

/* Cadenas canal privé */
.channel-lock {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: .6;
  margin-left: 2px;
}
.sidebar-item.active .channel-lock { opacity: .9; color: var(--accent-light); }

/* Badge mention @ */
.mention-ping-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--color-danger);
  color: white;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -.5px;
  line-height: 1;
  flex-shrink: 0;
  animation: mention-pulse 2.2s ease-in-out infinite;
}

@keyframes mention-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger) 55%, transparent); }
  50%       { box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-danger) 0%,  transparent); }
}

.has-mention .channel-name {
  color: var(--text-primary);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .mention-ping-badge { animation: none; }
}
</style>
