<script setup lang="ts">
  // Wrapper standardise pour tous les widgets du dashboard (bento etudiant et
  // pilote). Compose UiCard + un header unifie (icone + label uppercase +
  // slot droit pour badge/count/state). Cf. design-system §widgets.
  //
  // Le but : eradiquer les variantes .war-header / .we-head / .sa-card-header
  // qui coexistaient. Tous les nouveaux widgets DOIVENT utiliser ce wrapper.
  import { computed, type Component } from 'vue'
  import UiCard from './UiCard.vue'

  type Tone = 'none' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

  const props = withDefaults(defineProps<{
    label: string
    icon?: Component
    tone?: Tone
    interactive?: boolean
    padding?: 'sm' | 'md' | 'lg'
    ariaLabel?: string
    /** Override de la couleur de l'icone (sinon derivee du `tone`). */
    iconColor?: string
  }>(), {
    tone: 'none',
    interactive: false,
    padding: 'md',
  })

  const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

  const resolvedIconColor = computed(() => {
    if (props.iconColor) return props.iconColor
    switch (props.tone) {
      case 'danger':  return 'var(--color-danger)'
      case 'warning': return 'var(--color-warning)'
      case 'success': return 'var(--color-success)'
      case 'info':    return 'var(--color-info)'
      case 'accent':  return 'var(--accent)'
      default:        return 'var(--text-muted)'
    }
  })
</script>

<template>
  <UiCard
    :tone="tone"
    :interactive="interactive"
    :padding="padding"
    :aria-label="ariaLabel ?? label"
    @click="(ev: MouseEvent) => emit('click', ev)"
  >
    <header class="uw-header">
      <component :is="icon" v-if="icon" :size="14" class="uw-icon" :style="{ color: resolvedIconColor }" />
      <span class="uw-label">{{ label }}</span>
      <div v-if="$slots['header-extra']" class="uw-header-extra">
        <slot name="header-extra" />
      </div>
    </header>
    <slot />
  </UiCard>
</template>

<style scoped>
  .uw-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
  }
  .uw-icon { flex-shrink: 0; }
  .uw-label {
    text-transform: uppercase;
    letter-spacing: .08em;
    font-size: var(--text-2xs);
    font-weight: 700;
    color: var(--text-muted);
    flex: 1;
    min-width: 0;
  }
  .uw-header-extra {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
</style>
