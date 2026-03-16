<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { LogOut } from 'lucide-vue-next'
  import { useAppStore } from '@/stores/app'
  import { useRouter }   from 'vue-router'
  import { usePrefs }    from '@/composables/usePrefs'
  import { useToast }    from '@/composables/useToast'
  import Modal from '@/components/ui/Modal.vue'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const appStore = useAppStore()
  const router   = useRouter()
  const { getPref, setPref } = usePrefs()
  const { showToast }        = useToast()

  const activeSection   = ref<'general' | 'compte'>('general')
  const docsDefault     = ref(getPref('docsOpenByDefault'))
  const pendingPhoto    = ref<string | null>(appStore.currentUser?.photo_data ?? null)

  watch(docsDefault, (v) => setPref('docsOpenByDefault', v))

  async function pickPhoto() {
    const res = await window.api.openImageDialog()
    if (res?.ok && res.data) pendingPhoto.value = res.data
  }

  function handleLogout() {
    emit('update:modelValue', false)
    appStore.logout()
    router.replace('/')
    showToast('Déconnexion réussie.', 'info')
  }
</script>

<template>
  <Modal :model-value="modelValue" title="Paramètres" max-width="680px" @update:model-value="emit('update:modelValue', $event)">
    <div class="settings-layout" style="display:flex;min-height:340px">
      <!-- Navigation -->
      <nav class="settings-nav" style="width:160px;border-right:1px solid var(--border);padding:8px 0;flex-shrink:0">
        <button
          class="settings-nav-item"
          :class="{ active: activeSection === 'general' }"
          @click="activeSection = 'general'"
        >
          Général
        </button>
        <button
          class="settings-nav-item"
          :class="{ active: activeSection === 'compte' }"
          @click="activeSection = 'compte'"
        >
          Mon compte
        </button>
      </nav>

      <!-- Contenu -->
      <div class="settings-body" style="flex:1;padding:20px 24px;overflow-y:auto">
        <!-- ── Général ───────────────────────────────────────────────────── -->
        <section v-if="activeSection === 'general'" class="settings-section">
          <h4 class="settings-section-title">Documents</h4>
          <label class="settings-toggle-row">
            <input
              id="settings-docs-default"
              v-model="docsDefault"
              type="checkbox"
            />
            <span>Ouvrir les fichiers dans l'explorateur par défaut</span>
          </label>
        </section>

        <!-- ── Compte ────────────────────────────────────────────────────── -->
        <section v-else class="settings-section">
          <h4 class="settings-section-title">Photo de profil</h4>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
            <div
              class="avatar"
              style="width:56px;height:56px;font-size:20px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#fff"
            >
              <img v-if="pendingPhoto" :src="pendingPhoto" style="width:100%;height:100%;object-fit:cover" />
              <span v-else>{{ appStore.currentUser?.avatar_initials }}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <button class="btn-ghost" style="font-size:12px" @click="pickPhoto">Changer la photo</button>
              <button v-if="pendingPhoto" class="btn-ghost" style="font-size:12px;color:var(--error)" @click="pendingPhoto = null">Supprimer</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nom</label>
            <input
              :value="appStore.currentUser?.name"
              type="text"
              class="form-input"
              disabled
              style="opacity:.6"
            />
          </div>
          <div class="form-group" style="margin-top:8px">
            <label class="form-label">Type</label>
            <input
              :value="appStore.currentUser?.type === 'teacher' ? 'Professeur' : 'Étudiant'"
              type="text"
              class="form-input"
              disabled
              style="opacity:.6"
            />
          </div>
        </section>
      </div>
    </div>

    <!-- Pied de modal -->
    <div class="modal-footer" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
      <button class="btn-danger" style="display:flex;align-items:center;gap:6px" @click="handleLogout">
        <LogOut :size="14" /> Se déconnecter
      </button>
    </div>
  </Modal>
</template>
