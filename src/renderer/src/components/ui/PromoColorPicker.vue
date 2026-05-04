<script setup lang="ts">
/**
 * Swatch picker pour la couleur d'une promotion.
 * Source unique : `PROMO_PALETTE` (8 couleurs calibrées).
 *
 * Usage :
 *   <PromoColorPicker v-model="color" />
 *   <PromoColorPicker v-model="color" size="sm" />
 */
import { Check } from 'lucide-vue-next'
import { PROMO_PALETTE } from '@/utils/promoPalette'

interface Props {
  modelValue: string
  size?: 'sm' | 'md'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

function pick(color: string): void {
  if (props.disabled) return
  emit('update:modelValue', color)
}
</script>

<template>
  <div class="pcp-grid" :class="`pcp-grid--${size}`" role="radiogroup" aria-label="Couleur de la promotion">
    <button
      v-for="c in PROMO_PALETTE"
      :key="c.slug"
      type="button"
      class="pcp-swatch"
      :class="{ 'pcp-swatch--selected': modelValue.toLowerCase() === c.value.toLowerCase() }"
      :style="{ background: c.value }"
      :aria-label="c.label"
      :aria-checked="modelValue.toLowerCase() === c.value.toLowerCase()"
      :disabled="disabled"
      role="radio"
      @click="pick(c.value)"
    >
      <Check v-if="modelValue.toLowerCase() === c.value.toLowerCase()" :size="size === 'sm' ? 12 : 14" class="pcp-check" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.pcp-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pcp-swatch {
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
  transition: transform 0.15s ease-out, box-shadow 0.15s, border-color 0.15s;
}
.pcp-grid--md .pcp-swatch { width: 32px; height: 32px; }
.pcp-grid--sm .pcp-swatch { width: 24px; height: 24px; border-radius: var(--radius-sm); }

.pcp-swatch:hover:not(:disabled) { transform: scale(1.12); }
.pcp-swatch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.pcp-swatch:disabled { cursor: not-allowed; opacity: 0.5; }

.pcp-swatch--selected {
  border-color: var(--bg-main);
  box-shadow: 0 0 0 2px var(--accent), 0 2px 8px rgba(0,0,0,0.18);
  transform: scale(1.08);
}
.pcp-check {
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
}

@media (prefers-reduced-motion: reduce) {
  .pcp-swatch { transition: none; }
  .pcp-swatch:hover:not(:disabled) { transform: none; }
  .pcp-swatch--selected { transform: none; }
}
</style>
