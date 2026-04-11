<script setup lang="ts">
  // Titre de section unifie. Remplace .dv-section-title (heading), .db-section-title
  // et .sa-section-label (label uppercase). Cf. design-system/cursus/MASTER.md §7.
  //
  // Variants :
  //  - heading (defaut) : 15px bold primary, eventuellement avec icone leading +
  //    description en sous-titre
  //  - label : 10px uppercase muted, letter-spacing .08em
  //
  // Slots :
  //  - leading : icone (lucide) avant le titre
  //  - default : texte du titre
  //  - actions : controle a droite (bouton, link, etc.)
  //  - description : sous-titre, alternative a la prop `description`

  type Variant = 'heading' | 'label'
  type Tag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span'

  withDefaults(defineProps<{
    variant?: Variant
    /** Description en sous-titre (variant heading uniquement). Slot description override la prop. */
    description?: string
    /** Element HTML rendu pour la racine. Defaut h3 (heading) ou span (label). */
    as?: Tag
  }>(), {
    variant: 'heading',
  })
</script>

<template>
  <div class="ui-section-title" :class="`ui-section-title--${variant}`">
    <component
      :is="as ?? (variant === 'label' ? 'span' : 'h3')"
      class="ui-section-title__main"
    >
      <span v-if="$slots.leading" class="ui-section-title__leading">
        <slot name="leading" />
      </span>
      <span class="ui-section-title__text">
        <slot />
      </span>
      <span v-if="$slots.actions" class="ui-section-title__actions">
        <slot name="actions" />
      </span>
    </component>
    <p v-if="variant === 'heading' && ($slots.description || description)" class="ui-section-title__desc">
      <slot name="description">{{ description }}</slot>
    </p>
  </div>
</template>

<style scoped>
.ui-section-title {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.ui-section-title__main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  color: var(--text-primary);
}

.ui-section-title__leading {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.ui-section-title__text { flex: 1; min-width: 0; }

.ui-section-title__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
  flex-shrink: 0;
}

.ui-section-title__desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

/* Variant heading : titre principal de section */
.ui-section-title--heading .ui-section-title__main {
  font-size: 15px;
  font-weight: 700;
}

/* Variant label : tres petit, uppercase, muted (style "section header" de carte) */
.ui-section-title--label {
  margin-bottom: var(--space-sm);
}
.ui-section-title--label .ui-section-title__main {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-muted);
}
</style>
