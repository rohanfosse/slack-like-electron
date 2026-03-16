<script setup lang="ts">
  /**
   * NewTravailModal — Création d'un travail (devoir / jalon / projet)
   *
   * TODO: Implémenter le formulaire complet avec :
   *   - Sélection du type (devoir / jalon / projet)
   *   - Date de début + deadline (datetime-local)
   *   - Catégorie, description
   *   - Assignation individuelle ou par groupe
   *   - Constructeur de groupes (group-builder)
   *   - Brouillon / publication
   *
   * Référence : renderer/js/views/travaux.js → openNewTravailModal(), bindNewTravailForm()
   */
  import { ref, watch, computed } from 'vue'
  import { useAppStore }     from '@/stores/app'
  import { useTravauxStore } from '@/stores/travaux'
  import { useToast }        from '@/composables/useToast'
  import Modal from '@/components/ui/Modal.vue'
  import { isoForDatetimeLocal } from '@/utils/date'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const appStore     = useAppStore()
  const travauxStore = useTravauxStore()
  const { showToast } = useToast()

  // ── Formulaire ────────────────────────────────────────────────────────────
  const title       = ref('')
  const description = ref('')
  const type        = ref<'devoir' | 'jalon' | 'projet'>('devoir')
  const category    = ref('')
  const deadline    = ref(isoForDatetimeLocal())
  const startDate   = ref(isoForDatetimeLocal())
  const isDraft     = ref(false)
  const assignTo    = ref<'all' | 'group'>('all')
  const channelId   = ref<number | null>(null)
  const channels    = ref<{ id: number; name: string }[]>([])
  const creating    = ref(false)

  watch(() => props.modelValue, async (open) => {
    if (open && appStore.activePromoId) {
      const res = await window.api.getChannels(appStore.activePromoId)
      channels.value = res?.ok ? res.data : []
      // Pré-sélectionner le canal actif
      channelId.value = appStore.activeChannelId
      title.value = description.value = category.value = ''
      type.value = 'devoir'
      assignTo.value = 'all'
      isDraft.value  = false
      deadline.value = startDate.value = isoForDatetimeLocal()
    }
  })

  const isJalon = computed(() => type.value === 'jalon')

  async function submit() {
    if (!title.value.trim() || !channelId.value) return
    creating.value = true
    try {
      const res = await travauxStore.createTravail({
        title:        title.value.trim(),
        description:  description.value.trim() || null,
        type:         type.value,
        category:     category.value.trim() || null,
        deadline:     deadline.value,
        startDate:    isJalon.value ? null : startDate.value,
        isPublished:  !isDraft.value,
        assignedTo:   assignTo.value,
        channelId:    channelId.value,
      })
      if (!res) return
      showToast('Travail créé.', 'success')
      emit('update:modelValue', false)
    } finally {
      creating.value = false
    }
  }
</script>

<template>
  <Modal :model-value="modelValue" title="Nouveau travail" max-width="620px" @update:model-value="emit('update:modelValue', $event)">
    <form style="padding:16px;display:flex;flex-direction:column;gap:12px" @submit.prevent="submit">

      <!-- Canal -->
      <div class="form-group">
        <label class="form-label">Canal</label>
        <select v-model="channelId" class="form-select" required>
          <option :value="null">Choisir un canal…</option>
          <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <!-- Titre + Type -->
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2">
          <label class="form-label">Titre</label>
          <input v-model="title" type="text" class="form-input" placeholder="Titre du travail" required />
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Type</label>
          <select v-model="type" class="form-select">
            <option value="devoir">Devoir</option>
            <option value="jalon">Jalon</option>
            <option value="projet">Projet</option>
          </select>
        </div>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label class="form-label">Description <span style="opacity:.6">(optionnel)</span></label>
        <textarea v-model="description" class="form-input" rows="3" style="resize:vertical" placeholder="Instructions, objectifs…" />
      </div>

      <!-- Dates -->
      <div style="display:flex;gap:10px">
        <div v-if="!isJalon" class="form-group" style="flex:1">
          <label class="form-label">Date de début</label>
          <input v-model="startDate" type="datetime-local" class="form-input" />
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">{{ isJalon ? 'Date du jalon' : 'Date limite' }}</label>
          <input v-model="deadline" type="datetime-local" class="form-input" required />
        </div>
      </div>

      <!-- Catégorie + Assignation -->
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1">
          <label class="form-label">Catégorie <span style="opacity:.6">(optionnel)</span></label>
          <input v-model="category" type="text" class="form-input" placeholder="ex : TP, Projet…" />
        </div>
        <div v-if="!isJalon" class="form-group" style="flex:1">
          <label class="form-label">Assigné à</label>
          <div style="display:flex;gap:16px;padding-top:8px">
            <label class="radio-label"><input v-model="assignTo" type="radio" value="all" /> Toute la promo</label>
            <label class="radio-label"><input v-model="assignTo" type="radio" value="group" /> Par groupe</label>
          </div>
        </div>
      </div>

      <!-- TODO: Constructeur de groupes si assignTo === 'group' -->
      <!-- Référence : renderer/js/views/travaux.js → group-builder-list -->

      <!-- Brouillon -->
      <label class="checkbox-label" style="display:flex;align-items:center;gap:8px">
        <input v-model="isDraft" type="checkbox" />
        Enregistrer comme brouillon (non visible par les étudiants)
      </label>
    </form>

    <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
      <button class="btn-ghost" @click="emit('update:modelValue', false)">Annuler</button>
      <button class="btn-primary" :disabled="!title.trim() || !channelId || creating" @click="submit">
        {{ creating ? 'Création…' : isDraft ? 'Enregistrer brouillon' : 'Publier' }}
      </button>
    </div>
  </Modal>
</template>
