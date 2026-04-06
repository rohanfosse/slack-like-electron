/** RexActivityForm — Formulaire de creation/edition d'activite REX pour enseignants. */
<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { MessageSquare, Cloud, Star, FileText, BarChart, Smile, ArrowUpDown, Grid3X3, Plus, X } from 'lucide-vue-next'
  import type { RexActivity } from '@/types'

  type RexType = RexActivity['type']

  const props = defineProps<{ initialData?: RexActivity | null }>()

  const emit = defineEmits<{
    add: [payload: { type: RexType; title: string; max_words?: number; max_rating?: number; options?: string[] }]
    cancel: []
  }>()

  const isEditing = !!props.initialData

  function parseOptions(data?: RexActivity | null): string[] {
    if (!data?.options) return ['', '']
    try { const arr = JSON.parse(data.options as string); return Array.isArray(arr) ? arr : ['', ''] } catch { return ['', ''] }
  }

  const selectedType = ref<RexType | null>(props.initialData?.type ?? null)
  const title        = ref(props.initialData?.title ?? '')
  const maxWords     = ref(props.initialData?.max_words ?? 2)
  const maxRating    = ref(props.initialData?.max_rating ?? 5)
  const sondageOptions = ref<string[]>(props.initialData?.type === 'sondage' ? parseOptions(props.initialData) : ['', ''])
  const prioriteItems  = ref<string[]>(props.initialData?.type === 'priorite' ? parseOptions(props.initialData) : ['', '', ''])
  const matriceCriteria = ref<string[]>(props.initialData?.type === 'matrice' ? parseOptions(props.initialData) : ['', ''])

  const HUMEUR_EMOJIS = ['😊', '🙂', '😐', '😟', '🤯']

  const types: { value: RexType; label: string; icon: typeof MessageSquare }[] = [
    { value: 'sondage_libre',    label: 'Sondage libre',    icon: MessageSquare },
    { value: 'nuage',            label: 'Nuage de mots',    icon: Cloud },
    { value: 'echelle',          label: 'Echelle',          icon: Star },
    { value: 'question_ouverte', label: 'Question ouverte', icon: FileText },
    { value: 'sondage',          label: 'Sondage',          icon: BarChart },
    { value: 'humeur',           label: 'Humeur',           icon: Smile },
    { value: 'priorite',         label: 'Priorite',         icon: ArrowUpDown },
    { value: 'matrice',          label: 'Matrice',          icon: Grid3X3 },
  ]

  const canSubmit = computed(() => selectedType.value && title.value.trim())

  function addSondageOption() { if (sondageOptions.value.length < 8) sondageOptions.value = [...sondageOptions.value, ''] }
  function removeSondageOption(i: number) { if (sondageOptions.value.length > 2) sondageOptions.value = sondageOptions.value.filter((_, idx) => idx !== i) }
  function addPrioriteItem() { if (prioriteItems.value.length < 8) prioriteItems.value = [...prioriteItems.value, ''] }
  function removePrioriteItem(i: number) { if (prioriteItems.value.length > 2) prioriteItems.value = prioriteItems.value.filter((_, idx) => idx !== i) }
  function addMatriceCrit() { if (matriceCriteria.value.length < 8) matriceCriteria.value = [...matriceCriteria.value, ''] }
  function removeMatriceCrit(i: number) { if (matriceCriteria.value.length > 2) matriceCriteria.value = matriceCriteria.value.filter((_, idx) => idx !== i) }

  function submit() {
    if (!canSubmit.value || !selectedType.value) return
    const payload: { type: RexType; title: string; max_words?: number; max_rating?: number; options?: string[] } = {
      type: selectedType.value,
      title: title.value.trim(),
    }
    if (selectedType.value === 'nuage') payload.max_words = maxWords.value
    if (selectedType.value === 'echelle') payload.max_rating = maxRating.value
    if (selectedType.value === 'sondage') {
      const filtered = sondageOptions.value.map(o => o.trim()).filter(Boolean)
      if (filtered.length < 2) return
      payload.options = filtered
    }
    if (selectedType.value === 'humeur') payload.options = HUMEUR_EMOJIS
    if (selectedType.value === 'priorite') {
      const filtered = prioriteItems.value.map(o => o.trim()).filter(Boolean)
      if (filtered.length < 2) return
      payload.options = filtered
    }
    if (selectedType.value === 'matrice') {
      const filtered = matriceCriteria.value.map(o => o.trim()).filter(Boolean)
      if (filtered.length < 2) return
      payload.options = filtered
      payload.max_rating = maxRating.value
    }
    emit('add', payload)
    if (!isEditing) { title.value = ''; selectedType.value = null }
  }
</script>

<template>
  <div class="rex-form">
    <div class="rex-form-types">
      <button
        v-for="t in types"
        :key="t.value"
        class="rex-type-btn"
        :class="{ active: selectedType === t.value }"
        @click="selectedType = t.value"
      >
        <component :is="t.icon" :size="20" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <input
      v-model="title"
      type="text"
      class="rex-form-input"
      placeholder="Titre de l'activite..."
      @keydown.enter="submit"
    />

    <div v-if="selectedType === 'nuage'" class="rex-form-option">
      <span class="rex-form-option-label">Nombre de mots max :</span>
      <div class="rex-form-option-btns">
        <button v-for="n in [1, 2, 3]" :key="n" :class="{ active: maxWords === n }" @click="maxWords = n">{{ n }}</button>
      </div>
    </div>

    <div v-if="selectedType === 'echelle' || selectedType === 'matrice'" class="rex-form-option">
      <span class="rex-form-option-label">Echelle :</span>
      <div class="rex-form-option-btns">
        <button :class="{ active: maxRating === 5 }" @click="maxRating = 5">5 etoiles</button>
        <button :class="{ active: maxRating === 10 }" @click="maxRating = 10">10 slider</button>
      </div>
    </div>

    <div v-if="selectedType === 'sondage'" class="rex-form-option rex-form-list">
      <span class="rex-form-option-label">Options du sondage :</span>
      <div v-for="(_, i) in sondageOptions" :key="i" class="rex-form-list-row">
        <input v-model="sondageOptions[i]" class="rex-form-input" :placeholder="`Option ${i + 1}`" maxlength="100" />
        <button v-if="sondageOptions.length > 2" class="rex-form-remove" @click="removeSondageOption(i)"><X :size="14" /></button>
      </div>
      <button v-if="sondageOptions.length < 8" class="rex-form-add" @click="addSondageOption"><Plus :size="14" /> Option</button>
    </div>

    <div v-if="selectedType === 'priorite'" class="rex-form-option rex-form-list">
      <span class="rex-form-option-label">Items a classer :</span>
      <div v-for="(_, i) in prioriteItems" :key="i" class="rex-form-list-row">
        <input v-model="prioriteItems[i]" class="rex-form-input" :placeholder="`Item ${i + 1}`" maxlength="100" />
        <button v-if="prioriteItems.length > 2" class="rex-form-remove" @click="removePrioriteItem(i)"><X :size="14" /></button>
      </div>
      <button v-if="prioriteItems.length < 8" class="rex-form-add" @click="addPrioriteItem"><Plus :size="14" /> Item</button>
    </div>

    <div v-if="selectedType === 'matrice'" class="rex-form-option rex-form-list">
      <span class="rex-form-option-label">Criteres a evaluer :</span>
      <div v-for="(_, i) in matriceCriteria" :key="i" class="rex-form-list-row">
        <input v-model="matriceCriteria[i]" class="rex-form-input" :placeholder="`Critere ${i + 1}`" maxlength="100" />
        <button v-if="matriceCriteria.length > 2" class="rex-form-remove" @click="removeMatriceCrit(i)"><X :size="14" /></button>
      </div>
      <button v-if="matriceCriteria.length < 8" class="rex-form-add" @click="addMatriceCrit"><Plus :size="14" /> Critere</button>
    </div>

    <div class="rex-form-footer">
      <button v-if="isEditing" class="rex-form-cancel" @click="emit('cancel')">Annuler</button>
      <button class="rex-form-submit" :disabled="!canSubmit" @click="submit">
        {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.rex-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  background: rgba(13, 148, 136, 0.05);
  border: 1px solid rgba(13, 148, 136, 0.2);
  border-radius: 12px;
}
.rex-form-types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.rex-type-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border, rgba(255,255,255,.08));
  background: var(--bg-elevated, #1e1f21);
  color: var(--text-secondary, #aaa);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.4s ease;
  font-family: var(--font, inherit);
}
.rex-type-btn:hover {
  border-color: rgba(13, 148, 136, 0.35);
  color: #14b8a6;
}
.rex-type-btn.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.12);
  color: #0d9488;
}
.rex-form-input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border, rgba(255,255,255,.08));
  background: var(--bg-elevated, #1e1f21);
  color: var(--text-primary, #fff);
  font-size: 14px;
  font-family: var(--font, inherit);
  outline: none;
  transition: border-color 0.4s ease;
}
.rex-form-input:focus {
  border-color: #0d9488;
}
.rex-form-option {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rex-form-option-label {
  font-size: 13px;
  color: var(--text-secondary, #aaa);
}
.rex-form-option-btns {
  display: flex;
  gap: 6px;
}
.rex-form-option-btns button {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border, rgba(255,255,255,.08));
  background: var(--bg-elevated, #1e1f21);
  color: var(--text-secondary, #aaa);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.4s ease;
  font-family: var(--font, inherit);
}
.rex-form-option-btns button.active {
  border-color: #0d9488;
  background: rgba(13, 148, 136, 0.12);
  color: #0d9488;
}
.rex-form-submit {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #0d9488;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.4s ease;
  font-family: var(--font, inherit);
}
.rex-form-submit:hover:not(:disabled) {
  background: #14b8a6;
}
.rex-form-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rex-form-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.rex-form-cancel {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--border, rgba(255,255,255,.08));
  background: transparent;
  color: var(--text-secondary, #aaa);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font, inherit);
}
.rex-form-cancel:hover { background: var(--bg-hover); }
/* Listes d'options (sondage, priorite, matrice) */
.rex-form-list { display: flex; flex-direction: column; gap: 6px; }
.rex-form-list-row { display: flex; gap: 6px; align-items: center; }
.rex-form-list-row .rex-form-input { flex: 1; }
.rex-form-remove { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; border-radius: 6px; }
.rex-form-remove:hover { background: rgba(239, 68, 68, .15); color: #ef4444; }
.rex-form-add { display: flex; align-items: center; gap: 4px; background: none; border: 1px dashed var(--border); border-radius: 8px; padding: 8px 12px; color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.rex-form-add:hover { border-color: var(--accent); color: var(--accent); }
</style>
