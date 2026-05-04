<script setup lang="ts">
  import { computed, type Component } from 'vue'
  import { useStatusesStore } from '@/stores/statuses'

  interface Props {
    initials:  string
    color:     string
    size?:     number
    photoData?: string | null
    /** Composant Lucide a afficher a la place des initiales */
    icon?:     Component | null
    /** Si fourni, affiche un badge emoji de statut en bas a droite */
    userId?:   number | null
    /** Forme : 'round' (50%, alignement landing) ou 'square' (legacy 8px). */
    shape?:    'round' | 'square'
    /** Indicateur de presence : online (vert), away (orange), offline (gris). */
    presence?: 'online' | 'away' | 'offline' | null
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 34, photoData: null, icon: null, userId: null,
    shape: 'round', presence: null,
  })

  const statuses = useStatusesStore()
  const status = computed(() => props.userId != null ? statuses.get(props.userId) : null)
  const badgeSize = computed(() => Math.max(14, Math.round(props.size * 0.42)))
  const presenceSize = computed(() => Math.max(7, Math.round(props.size * 0.28)))
  const presenceColor = computed(() => {
    switch (props.presence) {
      case 'online':  return '#10B981'
      case 'away':    return '#F59E0B'
      case 'offline': return '#94A3B8'
      default:        return null
    }
  })
  const radius = computed(() => props.shape === 'square' ? '8px' : '50%')
</script>

<template>
  <div class="avatar-wrap" :style="{ width: `${props.size}px`, height: `${props.size}px` }">
    <div
      class="msg-avatar"
      :style="{
        width:           `${props.size}px`,
        height:          `${props.size}px`,
        fontSize:        `${Math.round(props.size * 0.33)}px`,
        flexShrink:      0,
        borderRadius:    radius,
        overflow:        'hidden',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      props.photoData ? 'transparent' : props.color,
        color:           '#fff',
        fontWeight:      '700',
        letterSpacing:   '-0.3px',
      }"
    >
      <img
        v-if="props.photoData"
        :src="props.photoData"
        :alt="props.initials"
        style="width: 100%; height: 100%; object-fit: cover"
      />
      <component
        :is="props.icon"
        v-else-if="props.icon"
        :size="Math.round(props.size * 0.52)"
      />
      <span v-else>{{ props.initials }}</span>
    </div>

    <span
      v-if="status?.emoji"
      class="avatar-status-badge"
      :style="{
        width: `${badgeSize}px`,
        height: `${badgeSize}px`,
        fontSize: `${Math.round(badgeSize * 0.75)}px`,
      }"
      :title="status.text || status.emoji"
    >{{ status.emoji }}</span>

    <span
      v-if="presenceColor && !status?.emoji"
      class="avatar-presence-dot"
      :style="{
        width: `${presenceSize}px`,
        height: `${presenceSize}px`,
        background: presenceColor,
      }"
      :title="props.presence ?? ''"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
  display: inline-block;
}
.avatar-status-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: var(--bg-surface, #2a2a2a);
  border: 2px solid var(--bg-primary, #1a1a1a);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* Presence dot — alignement landing (cf. .sidebar-dm-avatar::after).
   Rendu sous status emoji s'il n'y a pas d'emoji status actif. */
.avatar-presence-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  border-radius: 50%;
  border: 2px solid var(--bg-rail);
  box-shadow: 0 0 0 1px rgba(0,0,0,.06);
  pointer-events: none;
}
</style>
