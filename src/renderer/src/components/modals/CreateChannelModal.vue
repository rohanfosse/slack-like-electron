<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useAppStore } from '@/stores/app'
  import { useToast }    from '@/composables/useToast'
  import Modal from '@/components/ui/Modal.vue'
  import type { Student } from '@/types'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const appStore = useAppStore()
  const { showToast } = useToast()

  const channelName  = ref('')
  const visibility   = ref<'public' | 'private'>('public')
  const members      = ref<number[]>([])
  const students     = ref<Student[]>([])
  const creating     = ref(false)

  watch(() => props.modelValue, async (open) => {
    if (open && appStore.activePromoId) {
      const res = await window.api.getStudents(appStore.activePromoId)
      students.value = res?.ok ? res.data : []
      channelName.value = ''
      visibility.value  = 'public'
      members.value     = []
    }
  })

  async function create() {
    if (!channelName.value.trim() || !appStore.activePromoId) return
    creating.value = true
    try {
      const res = await window.api.createChannel({
        name: channelName.value.trim(),
        promoId: appStore.activePromoId,
        isPrivate: visibility.value === 'private',
        members: visibility.value === 'private' ? members.value : [],
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
