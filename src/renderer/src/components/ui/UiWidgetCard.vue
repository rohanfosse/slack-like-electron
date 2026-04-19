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
    /**
     * Couleur d'accent personnalisee (icone + barre laterale) hors palette
     * `tone`. Pour les widgets sentinelle (Bookmarks, Countdown, ...) qui
     * portent leur propre couleur semantique. Si fourni, override `tone`
     * pour la barre et l'icone.
     */
    accentColor?: string
  }>(), {
    tone: 'none',
    interactive: false,
    padding: 'md',
  })

  const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

  const resolvedIconColor = computed(() => {
    if (props.accentColor) return props.accentColor
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
    :accent-color="accentColor"
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
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }
  .uw-icon { flex-shrink: 0; }
  /* Label : sentence case + Plus Jakarta 13px medium — voix landing page,
     remplace l'ancien UPPERCASE letter-spaced 10px (style 2018). */
  .uw-label {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: -0.01em;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .uw-header-extra {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
</style>
