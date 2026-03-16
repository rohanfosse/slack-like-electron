<script setup lang="ts">
  /**
   * RessourcesModal — Ressources pédagogiques attachées à un travail
   *
   * TODO: Implémenter :
   *   - Liste des ressources (fichier ou lien)
   *   - Formulaire d'ajout (type radio : lien / fichier)
   *   - Bouton supprimer (prof seulement)
   *   - Ouverture : openExternal pour lien, openPath pour fichier
   *
   * Référence : renderer/js/views/ressources.js
   * Store : useTravauxStore() → ressources, fetchRessources()
   */
  import { watch } from 'vue'
  import { ExternalLink, FileText, Trash2 } from 'lucide-vue-next'
  import { useTravauxStore } from '@/stores/travaux'
  import { useAppStore }     from '@/stores/app'
  import Modal from '@/components/ui/Modal.vue'

  const props = defineProps<{ modelValue: boolean }>()
  const emit  = defineEmits<{ 'update:modelValue': [v: boolean] }>()

  const travauxStore = useTravauxStore()
  const appStore     = useAppStore()

  watch(() => props.modelValue, async (open) => {
    if (open && appStore.currentTravailId) {
      await travauxStore.fetchRessources(appStore.currentTravailId)
    }
  })

  async function open(content: string, type: string) {
    if (type === 'link') await window.api.openExternal(content)
    else await window.api.openPath(content)
  }

  async function remove(id: number) {
    await window.api.deleteRessource(id)
    if (appStore.currentTravailId) await travauxStore.fetchRessources(appStore.currentTravailId)
  }
</script>

<template>
  <Modal :model-value="modelValue" title="Ressources pédagogiques" @update:model-value="emit('update:modelValue', $event)">
    <div style="padding:16px;min-height:160px">
      <ul id="ressources-list" style="list-style:none;display:flex;flex-direction:column;gap:6px">
        <li
          v-for="r in travauxStore.ressources"
          :key="r.id"
          style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-tertiary);border-radius:6px"
        >
          <ExternalLink v-if="r.type === 'link'" :size="14" style="color:var(--accent)" />
          <FileText v-else :size="14" style="color:var(--accent)" />
          <button class="btn-ghost" style="flex:1;text-align:left;font-size:13px" @click="open(r.content, r.type)">
            {{ r.name }}
          </button>
          <button v-if="appStore.isTeacher" class="btn-icon" title="Supprimer" @click="remove(r.id)">
            <Trash2 :size="13" />
          </button>
        </li>
        <li v-if="!travauxStore.ressources.length" style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">
          Aucune ressource.
        </li>
      </ul>

      <!-- TODO: Formulaire d'ajout de ressource (lien / fichier) -->
      <!-- Référence : renderer/js/views/ressources.js → form-add-ressource -->
      <p v-if="appStore.isTeacher" style="margin-top:16px;font-size:12px;color:var(--text-muted);text-align:center">
        Formulaire d'ajout à implémenter — voir <code>renderer/js/views/ressources.js</code>
      </p>
    </div>
  </Modal>
</template>
