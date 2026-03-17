<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useAppStore } from '@/stores/app'
  import { useToast }    from '@/composables/useToast'
  import { CATEGORY_ICONS, parseCategoryIcon } from '@/utils/categoryIcon'
  import Modal from '@/components/ui/Modal.vue'
  import type { Student } from '@/types'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const appStore = useAppStore()
  const { showToast } = useToast()

  const channelName      = ref('')
  const channelType      = ref<'chat' | 'annonce'>('chat')
  const categoryIconKey  = ref('')
  const categoryText     = ref('')
  const visibility      = ref<'public' | 'private'>('public')
  const members         = ref<number[]>([])
  const students        = ref<Student[]>([])
  const creating        = ref(false)

  watch(() => props.modelValue, async (open) => {
    if (open && appStore.activePromoId) {
      const res = await window.api.getStudents(appStore.activePromoId)
      students.value = res?.ok ? res.data : []
      channelName.value   = ''
      channelType.value   = 'chat'
      visibility.value    = 'public'
      members.value       = []
      // Pré-remplir la catégorie si demandé depuis le menu contextuel
      const pending = appStore.pendingChannelCategory
      if (pending) {
        const { label } = parseCategoryIcon(pending)
        categoryIconKey.value = pending.includes(' ') ? pending.split(' ')[0] : ''
        categoryText.value    = label || pending
        appStore.pendingChannelCategory = null
      } else {
        categoryIconKey.value = ''
        categoryText.value    = ''
      }
    }
  })

  async function create() {
    if (!channelName.value.trim() || !appStore.activePromoId) return
    creating.value = true
    try {
      const res = await window.api.createChannel({
        name: channelName.value.trim(),
        promoId: appStore.activePromoId,
        type: channelType.value,
        isPrivate: visibility.value === 'private',
        members: visibility.value === 'private' ? members.value : [],
        category: (() => {
          const t = categoryText.value.trim()
          if (!t) return null
          return categoryIconKey.value ? `${categoryIconKey.value} ${t}` : t
        })(),
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
        <label class="form-label">Catégorie <span style="opacity:.55;font-weight:400">(optionnelle)</span></label>
        <!-- Lucide icon picker -->
        <div class="cc-icon-grid" style="margin-bottom:6px">
          <button
            v-for="ic in CATEGORY_ICONS"
            :key="ic.key"
            class="cc-icon-btn"
            :class="{ selected: categoryIconKey === ic.key }"
            type="button"
            :title="ic.label"
            @click="categoryIconKey = categoryIconKey === ic.key ? '' : ic.key"
          >
            <component :is="ic.component" :size="15" />
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <component
            v-if="categoryIconKey"
            :is="CATEGORY_ICONS.find(i => i.key === categoryIconKey)!.component"
            :size="16"
            class="cc-icon-preview"
          />
          <input
            v-model="categoryText"
            type="text"
            class="form-input"
            style="flex:1"
            placeholder="ex : Cours, Développement, Réseaux…"
          />
        </div>
        <span style="font-size:11px;color:var(--text-muted);margin-top:3px;display:block">
          Les canaux d'une même catégorie sont regroupés dans la barre latérale.
        </span>
      </div>

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

<style scoped>
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
