<script setup lang="ts">
  import type { Component } from 'vue'

  interface Props {
    initials:  string
    color:     string
    size?:     number
    photoData?: string | null
    /** Composant Lucide à afficher à la place des initiales */
    icon?:     Component | null
  }

  const props = withDefaults(defineProps<Props>(), { size: 34, photoData: null, icon: null })
</script>

<template>
  <div
    class="msg-avatar"
    :style="{
      width:           `${props.size}px`,
      height:          `${props.size}px`,
      fontSize:        `${Math.round(props.size * 0.33)}px`,
      flexShrink:      0,
      borderRadius:    '8px',
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
      v-else-if="props.icon"
      :is="props.icon"
      :size="Math.round(props.size * 0.52)"
    />
    <span v-else>{{ props.initials }}</span>
  </div>
</template>
