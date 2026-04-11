<script setup lang="ts">
  // Champ de formulaire unifie. Wrapper sur .form-input/.form-textarea/.form-select
  // (cf. design-system/cursus/MASTER.md §7).
  //
  // Apporte par-dessus :
  //  - label visible (visible-labels rule, MASTER §9)
  //  - helper text persistant + error inline (cf. inline-validation MD)
  //  - aria-describedby auto pour relier helper/error a l'input
  //  - focus ring tokenise via box-shadow (respecte border-radius)
  //  - support type="textarea" et type="select" via prop `as`
  import { computed, useId } from 'vue'

  type As = 'input' | 'textarea' | 'select'

  const props = withDefaults(defineProps<{
    modelValue?: string | number | null
    label?: string
    /** input HTML type (ignore si as=textarea/select) */
    type?: string
    /** Element rendu : input (defaut) / textarea / select */
    as?: As
    placeholder?: string
    helper?: string
    error?: string | null
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    autocomplete?: string
    rows?: number
    /** id explicite (sinon useId() pour relier label/aria) */
    id?: string
  }>(), {
    type: 'text',
    as: 'input',
    rows: 3,
    required: false,
    disabled: false,
    readonly: false,
  })

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'blur', ev: FocusEvent): void
    (e: 'focus', ev: FocusEvent): void
  }>()

  const autoId = useId()
  const inputId = computed(() => props.id ?? `ui-input-${autoId}`)
  const helperId = computed(() => `${inputId.value}-helper`)
  const errorId = computed(() => `${inputId.value}-error`)
  const describedBy = computed(() => {
    const ids: string[] = []
    if (props.helper) ids.push(helperId.value)
    if (props.error) ids.push(errorId.value)
    return ids.length ? ids.join(' ') : undefined
  })

  function onInput(ev: Event) {
    const target = ev.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    emit('update:modelValue', target.value)
  }
</script>

<template>
  <div class="ui-input" :class="{ 'ui-input--has-error': !!error, 'ui-input--disabled': disabled }">
    <label v-if="label" :for="inputId" class="ui-input__label">
      {{ label }}
      <span v-if="required" class="ui-input__required" aria-hidden="true">*</span>
    </label>

    <input
      v-if="as === 'input'"
      :id="inputId"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :autocomplete="autocomplete"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedBy"
      class="form-input ui-input__control"
      @input="onInput"
      @blur="(ev) => emit('blur', ev)"
      @focus="(ev) => emit('focus', ev)"
    />

    <textarea
      v-else-if="as === 'textarea'"
      :id="inputId"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :rows="rows"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedBy"
      class="form-textarea ui-input__control"
      @input="onInput"
      @blur="(ev) => emit('blur', ev)"
      @focus="(ev) => emit('focus', ev)"
    />

    <select
      v-else
      :id="inputId"
      :value="modelValue ?? ''"
      :required="required"
      :disabled="disabled"
      :aria-invalid="!!error || undefined"
      :aria-describedby="describedBy"
      class="form-select ui-input__control"
      @change="onInput"
      @blur="(ev) => emit('blur', ev)"
      @focus="(ev) => emit('focus', ev)"
    >
      <slot />
    </select>

    <p v-if="error" :id="errorId" class="ui-input__error" role="alert">{{ error }}</p>
    <p v-else-if="helper" :id="helperId" class="ui-input__helper">{{ helper }}</p>
  </div>
</template>

<style scoped>
.ui-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.ui-input__label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.ui-input__required {
  color: var(--color-danger);
  font-weight: 700;
}

.ui-input__control:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), .15);
}

.ui-input--has-error .ui-input__control {
  border-color: var(--color-danger);
}
.ui-input--has-error .ui-input__control:focus-visible {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(231,76,60,.15);
}

.ui-input--disabled {
  opacity: .5;
  pointer-events: none;
}

.ui-input__helper {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.ui-input__error {
  font-size: 12px;
  color: var(--color-danger);
  margin: 0;
  font-weight: 600;
  line-height: 1.4;
}
</style>
