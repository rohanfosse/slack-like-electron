<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import { Plus } from 'lucide-vue-next'
  import { useAppStore } from '@/stores/app'
  import { useToast }    from '@/composables/useToast'
  import { CATEGORY_ICONS, parseCategoryIcon } from '@/utils/categoryIcon'
  import Modal from '@/components/ui/Modal.vue'
  import type { Student } from '@/types'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const appStore = useAppStore()
  const { showToast } = useToast()

  const channelName         = ref('')
  const channelType         = ref<'chat' | 'annonce'>('chat')
  const visibility          = ref<'public' | 'private'>('public')
  const members             = ref<number[]>([])
  const students            = ref<Student[]>([])
  const creating            = ref(false)

  // Catégorie — liste déroulante
  const existingCategories  = ref<string[]>([])
  const selectedCategory    = ref<string>('')   // '' = aucune, '__new__' = créer, sinon valeur existante
  const newCategoryIconKey  = ref('')
  const newCategoryText     = ref('')

  const isCreatingNew = computed(() => selectedCategory.value === '__new__')

  watch(() => props.modelValue, async (open) => {
    if (!open || !appStore.activePromoId) return

    const [stuRes, chRes] = await Promise.all([
      window.api.getStudents(appStore.activePromoId),
      window.api.getChannels(appStore.activePromoId),
    ])
    students.value = stuRes?.ok ? stuRes.data : []

    // Extraire les catégories uniques
    const chs: any[] = chRes?.ok ? chRes.data : []
    const cats = [...new Set(chs.map((c: any) => c.category).filter(Boolean))] as string[]
    existingCategories.value = cats

    // Reset
    channelName.value     = ''
    channelType.value     = 'chat'
    visibility.value      = 'public'
    members.value         = []
    newCategoryIconKey.value = ''
    newCategoryText.value    = ''

    // Pré-remplir si demandé depuis le menu contextuel
    const pending = appStore.pendingChannelCategory
    if (pending) {
      appStore.pendingChannelCategory = null
      if (cats.includes(pending)) {
        selectedCategory.value = pending
      } else {
        selectedCategory.value = '__new__'
        const { label } = parseCategoryIcon(pending)
        newCategoryIconKey.value = pending.includes(' ') ? pending.split(' ')[0] : ''
        newCategoryText.value    = label || pending
      }
    } else {
      selectedCategory.value = cats.length ? '' : '__new__'
    }
  })

  async function create() {
    if (!channelName.value.trim() || !appStore.activePromoId) return

    // Calculer la catégorie finale
    let category: string | null = null
    if (selectedCategory.value && selectedCategory.value !== '__new__') {
      category = selectedCategory.value
    } else if (isCreatingNew.value) {
      const t = newCategoryText.value.trim()
      if (t) category = newCategoryIconKey.value ? `${newCategoryIconKey.value} ${t}` : t
    }

    creating.value = true
    try {
      const res = await window.api.createChannel({
        name:      channelName.value.trim(),
        promoId:   appStore.activePromoId,
        type:      channelType.value,
        isPrivate: visibility.value === 'private',
        members:   visibility.value === 'private' ? members.value : [],
        category,
      })
      if (!res?.ok) { showToast(res?.error ?? 'Erreur lors de la création.'); return }
      showToast('Canal créé.', 'success')
      emit('update:modelValue', false)
    } finally {
      creating.value = false
    }
  }

  function toggleMember(id: number) {
    const idx = members.value.indexOf(id)
    if (idx === -1) members.value.push(id)
    else members.value.splice(idx, 1)
  }
</script>

<template>
  <Modal :model-value="modelValue" title="Créer un canal" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:16px;display:flex;flex-direction:column;gap:14px">

      <!-- Nom -->
      <div class="form-group">
        <label class="form-label">Nom du canal</label>
        <input
          id="new-channel-name"
          v-model="channelName"
          type="text"
          class="form-input"
          placeholder="ex : général, tp-réseaux…"
          autofocus
        />
      </div>

      <!-- Catégorie — liste déroulante -->
      <div class="form-group">
        <label class="form-label">Catégorie <span style="opacity:.55;font-weight:400">(optionnelle)</span></label>

        <select v-model="selectedCategory" class="form-input cc-cat-select">
          <option value="">— Aucune catégorie —</option>
          <optgroup v-if="existingCategories.length" label="Catégories existantes">
            <option
              v-for="cat in existingCategories"
              :key="cat"
              :value="cat"
            >
              {{ parseCategoryIcon(cat).label }}
            </option>
          </optgroup>
          <option value="__new__">+ Créer une nouvelle catégorie…</option>
        </select>

        <!-- Formulaire catégorie nouvelle -->
        <div v-if="isCreatingNew" class="cc-new-cat">
          <div class="cc-icon-grid">
            <button
              v-for="ic in CATEGORY_ICONS"
              :key="ic.key"
              class="cc-icon-btn"
              :class="{ selected: newCategoryIconKey === ic.key }"
              type="button"
              :title="ic.label"
              @click="newCategoryIconKey = newCategoryIconKey === ic.key ? '' : ic.key"
            >
              <component :is="ic.component" :size="15" />
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
            <component
              v-if="newCategoryIconKey"
              :is="CATEGORY_ICONS.find(i => i.key === newCategoryIconKey)!.component"
              :size="16"
              class="cc-icon-preview"
            />
            <input
              v-model="newCategoryText"
              type="text"
              class="form-input"
              style="flex:1"
              placeholder="Nom de la catégorie…"
            />
          </div>
        </div>
      </div>

      <!-- Type -->
      <div class="form-group">
        <label class="form-label">Type</label>
        <div style="display:flex;gap:16px">
          <label class="radio-label">
            <input v-model="channelType" type="radio" value="chat" />
            Chat
          </label>
          <label class="radio-label">
            <input v-model="channelType" type="radio" value="annonce" />
            Annonces (lecture seule pour les étudiants)
          </label>
        </div>
      </div>

      <!-- Visibilité -->
      <div class="form-group">
        <label class="form-label">Visibilité</label>
        <div style="display:flex;gap:16px">
          <label class="radio-label">
            <input v-model="visibility" type="radio" value="public" />
            Public
          </label>
          <label class="radio-label">
            <input v-model="visibility" type="radio" value="private" />
            Privé (membres restreints)
          </label>
        </div>
      </div>

      <!-- Membres (canal privé) -->
      <div v-if="visibility === 'private'" class="form-group">
        <label class="form-label">Membres autorisés</label>
        <div id="channel-members-checkboxes" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
          <label
            v-for="s in students"
            :key="s.id"
            class="checkbox-label"
            style="display:flex;align-items:center;gap:8px;padding:4px"
          >
            <input
              type="checkbox"
              :checked="members.includes(s.id)"
              @change="toggleMember(s.id)"
            />
            <span>{{ s.name }}</span>
          </label>
        </div>
      </div>

    </div>

    <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn-ghost" @click="emit('update:modelValue', false)">Annuler</button>
      <button class="btn-primary" :disabled="!channelName.trim() || creating" @click="create">
        {{ creating ? 'Création…' : 'Créer' }}
      </button>
    </div>
  </Modal>
</template>

<style scoped>
/* Select catégorie */
.cc-cat-select {
  cursor: pointer;
}
.cc-cat-select option,
.cc-cat-select optgroup {
  background: var(--bg-modal, #1e2127);
  color: var(--text-primary);
}

/* Nouvelle catégorie */
.cc-new-cat {
  margin-top: 10px;
  padding: 12px;
  background: rgba(74,144,217,.05);
  border: 1px solid rgba(74,144,217,.18);
  border-radius: 6px;
}

.cc-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.cc-icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid transparent;
  border-radius: 5px;
  background: rgba(255,255,255,.04);
  color: var(--text-muted);
  cursor: pointer;
  transition: all .1s;
}
.cc-icon-btn:hover    { background: var(--bg-hover); border-color: var(--border-input); color: var(--text-primary); }
.cc-icon-btn.selected { border-color: var(--accent); background: rgba(74,144,217,.15); color: var(--accent); }

.cc-icon-preview {
  flex-shrink: 0;
  color: var(--accent);
}
</style>
