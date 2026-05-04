<script setup lang="ts">
  // Carte unifiee. Remplace .dv-proj-card / .sa-card / .travail-card /
  // .doc-card / .dv-next-card / .identity-card et leurs variantes
  // (cf. design-system/cursus/MASTER.md §7-8).
  //
  // Variants :
  //   - interactive (defaut false) : hover translateY + elevation, role=button
  //   - elevated   (defaut 1)      : niveau d'elevation au repos (0..3)
  //   - tone       (defaut none)   : barre laterale colore (accent/warning/...)
  //   - padding    (defaut 'md')   : sm/md/lg

  type Tone = 'none' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

  const props = withDefaults(defineProps<{
    interactive?: boolean
    elevated?: 0 | 1 | 2 | 3
    tone?: Tone
    padding?: 'sm' | 'md' | 'lg'
    as?: 'div' | 'article' | 'section' | 'button'
    /** Override couleur de la barre laterale (sinon derivee du `tone`). */
    accentColor?: string
  }>(), {
    interactive: false,
    elevated: 1,
    tone: 'none',
    padding: 'md',
    as: 'div',
  })

  const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

  function onClick(ev: MouseEvent) {
    if (props.interactive) emit('click', ev)
  }
</script>

<template>
  <component
    :is="as"
    class="ui-card"
    :class="[
      `ui-card--pad-${padding}`,
      `ui-card--elev-${elevated}`,
      tone !== 'none' ? `ui-card--tone-${tone}` : null,
      { 'ui-card--interactive': interactive, 'ui-card--accent': accentColor },
    ]"
    :style="accentColor ? { borderLeftColor: accentColor } : undefined"
    :tabindex="interactive ? 0 : undefined"
    :role="interactive && as !== 'button' ? 'button' : undefined"
    @click="onClick"
    @keydown.enter="interactive && $emit('click', $event as unknown as MouseEvent)"
    @keydown.space.prevent="interactive && $emit('click', $event as unknown as MouseEvent)"
  >
    <slot />
  </component>
</template>

<style scoped>
.ui-card {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  text-align: left;
  width: 100%;
  /* Spring easing + transitions allongees pour un feedback "habite",
     pattern landing page (cf. design-system §motion). */
  transition:
    transform var(--motion-slow) var(--ease-spring),
    border-color var(--motion-base) var(--ease-out),
    box-shadow var(--motion-slow) var(--ease-spring),
    background var(--motion-base) var(--ease-out);
}

/* Padding scale */
.ui-card--pad-sm { padding: var(--space-md); }
.ui-card--pad-md { padding: var(--space-lg); }
.ui-card--pad-lg { padding: var(--space-xl); }

/* Elevation au repos */
.ui-card--elev-0 { box-shadow: var(--elevation-0); }
.ui-card--elev-1 { box-shadow: var(--elevation-1); }
.ui-card--elev-2 { box-shadow: var(--elevation-2); }
.ui-card--elev-3 { box-shadow: var(--elevation-3); }

/* Tone : barre laterale 3px (style "categorise") */
.ui-card--tone-accent  { border-left: 3px solid var(--accent); }
.ui-card--tone-success { border-left: 3px solid var(--color-success); }
.ui-card--tone-warning { border-left: 3px solid var(--color-warning); }
.ui-card--tone-danger  { border-left: 3px solid var(--color-danger); }
.ui-card--tone-info    { border-left: 3px solid var(--color-info); }
/* Override couleur via prop accentColor (inline style), gere la largeur ici */
.ui-card--accent       { border-left-width: 3px; border-left-style: solid; }

/* Interactive : hover state + focus ring */
.ui-card--interactive {
  cursor: pointer;
  user-select: none;
}
.ui-card--interactive:hover {
  border-color: rgba(var(--accent-rgb), .35);
  background: rgba(var(--accent-rgb), .04);
  /* v2.273 : alignement landing .bento-card:hover (translateY(-6px) scale(1.02)) —
     compromis density app : -4px / 1.01. */
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    0 8px 24px rgba(var(--accent-rgb), .15),
    0 2px 6px rgba(var(--accent-rgb), .10),
    0 1px 3px rgba(0, 0, 0, .15);
}
.ui-card--interactive:active {
  transform: translateY(-1px) scale(1);
}
.ui-card--interactive:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring), var(--elevation-2);
}
</style>
