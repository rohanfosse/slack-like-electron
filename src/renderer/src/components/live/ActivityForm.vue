<!-- ActivityForm.vue - Formulaire de création d'activité Live (QCM / Sondage / Nuage) -->
<script setup lang="ts">
  import { ref } from 'vue'
  import { ListChecks, MessageCircle, Cloud, Plus, X } from 'lucide-vue-next'

  const emit = defineEmits<{
    save: [payload: { type: 'qcm' | 'sondage' | 'nuage'; title: string; options?: string[]; max_words?: number }]
    cancel: []
  }>()

  const activityType = ref<'qcm' | 'sondage' | 'nuage'>('qcm')
  const title = ref('')
  const options = ref<string[]>(['', ''])
  const maxWords = ref(2)

  const typeCards = [
    { id: 'qcm' as const,     label: 'QCM',     icon: ListChecks,   desc: 'Choix multiple' },
    { id: 'sondage' as const,  label: 'Sondage',  icon: MessageCircle, desc: 'Réponse libre' },
    { id: 'nuage' as const,    label: 'Nuage',    icon: Cloud,         desc: 'Nuage de mots' },
  ]

  function addOption() {
    if (options.value.length < 6) options.value.push('')
  }

  function removeOption(i: number) {
    if (options.value.length > 2) options.value.splice(i, 1)
  }

  function save() {
    if (!title.value.trim()) return
    const payload: { type: 'qcm' | 'sondage' | 'nuage'; title: string; options?: string[]; max_words?: number } = {
      type: activityType.value,
      title: title.value.trim(),
    }
    if (activityType.value === 'qcm') {
      const filtered = options.value.map(o => o.trim()).filter(Boolean)
      if (filtered.length < 2) return
      payload.options = filtered
    }
    if (activityType.value === 'nuage') {
      payload.max_words = maxWords.value
    }
    emit('save', payload)
  }
</script>

<template>
  <div class="activity-form">
    <h3 class="form-title">Nouvelle activité</h3>

    <!-- Type selector -->
    <div class="type-cards">
      <button
        v-for="t in typeCards"
        :key="t.id"
        class="type-card"
        :class="{ active: activityType === t.id }"
        @click="activityType = t.id"
      >
        <component :is="t.icon" :size="22" />
        <span class="type-card-label">{{ t.label }}</span>
        <span class="type-card-desc">{{ t.desc }}</span>
      </button>
    </div>

    <!-- Title -->
    <input
      v-model="title"
      class="form-input"
      placeholder="Question ou titre de l'activité"
      maxlength="200"
    />

    <!-- QCM options -->
    <div v-if="activityType === 'qcm'" class="options-section">
      <div v-for="(opt, i) in options" :key="i" class="option-row">
        <input
          v-model="options[i]"
          class="form-input option-input"
          :placeholder="`Option ${i + 1}`"
          maxlength="100"
        />
        <button
          v-if="options.length > 2"
          class="option-remove"
          @click="removeOption(i)"
        >
          <X :size="14" />
        </button>
      </div>
      <button v-if="options.length < 6" class="add-option-btn" @click="addOption">
        <Plus :size="14" />
        Ajouter une option
      </button>
    </div>

    <!-- Nuage max words -->
    <div v-if="activityType === 'nuage'" class="max-words-section">
      <label class="max-words-label">Nombre de mots par réponse</label>
      <div class="max-words-btns">
        <button
          v-for="n in [1, 2, 3]"
          :key="n"
          class="max-words-btn"
          :class="{ active: maxWords === n }"
          @click="maxWords = n"
        >
          {{ n }}
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button class="btn-cancel" @click="emit('cancel')">Annuler</button>
      <button class="btn-save" :disabled="!title.trim()" @click="save">Ajouter</button>
    </div>
  </div>
</template>

<style scoped>
.activity-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #fff);
}
.type-cards {
  display: flex;
  gap: 10px;
}
.type-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,.04);
  border: 2px solid rgba(255,255,255,.08);
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  transition: all .15s;
}
.type-card:hover {
  background: rgba(255,255,255,.07);
  border-color: rgba(255,255,255,.15);
}
.type-card.active {
  background: var(--accent-subtle, rgba(74,144,217,.12));
  border-color: var(--accent, #4a90d9);
  color: var(--accent, #4a90d9);
}
.type-card-label {
  font-size: 14px;
  font-weight: 700;
}
.type-card-desc {
  font-size: 11px;
  color: var(--text-muted, #888);
}
.type-card.active .type-card-desc {
  color: var(--accent, #4a90d9);
  opacity: .7;
}
.form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--bg-input, rgba(255,255,255,.06));
  border: 1px solid var(--border-input, rgba(255,255,255,.1));
  color: var(--text-primary, #fff);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.form-input:focus {
  border-color: var(--accent, #4a90d9);
}
.options-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.option-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.option-input {
  flex: 1;
}
.option-remove {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(239,68,68,.1);
  border: none;
  color: #f87171;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
  flex-shrink: 0;
}
.option-remove:hover {
  background: rgba(239,68,68,.2);
}
.add-option-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  border: 1px dashed rgba(255,255,255,.15);
  color: var(--text-muted, #888);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
}
.add-option-btn:hover {
  background: rgba(255,255,255,.07);
  color: var(--text-secondary, #aaa);
}
.max-words-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.max-words-label {
  font-size: 13px;
  color: var(--text-secondary, #aaa);
  font-weight: 600;
}
.max-words-btns {
  display: flex;
  gap: 8px;
}
.max-words-btn {
  width: 48px;
  height: 40px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  background: rgba(255,255,255,.05);
  border: 2px solid rgba(255,255,255,.08);
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  transition: all .15s;
}
.max-words-btn.active {
  background: var(--accent-subtle, rgba(74,144,217,.12));
  border-color: var(--accent, #4a90d9);
  color: var(--accent, #4a90d9);
}
.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: var(--text-secondary, #aaa);
  cursor: pointer;
  transition: all .15s;
}
.btn-cancel:hover {
  background: rgba(255,255,255,.1);
}
.btn-save {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: var(--accent, #4a90d9);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all .15s;
}
.btn-save:hover {
  filter: brightness(1.1);
}
.btn-save:disabled {
  opacity: .4;
  cursor: not-allowed;
}
</style>
