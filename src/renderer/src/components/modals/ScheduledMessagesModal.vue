<script setup lang="ts">
/**
 * Liste des messages programmes de l'utilisateur. Edition inline de la date,
 * suppression, re-programmation des messages en echec.
 */
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Clock, Trash2, AlertTriangle, CheckCircle2, Hash, User, Edit3 } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useScheduledMessages, type ScheduledMessage } from '@/composables/useScheduledMessages'
import { formatDate, formatTime } from '@/utils/date'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const store = useScheduledMessages()
// storeToRefs preserve la reactivite des refs (items, loading). Le destructuring
// direct casse la reactivity sur les setup stores Pinia.
const { items, loading } = storeToRefs(store)
const editingId = ref<number | null>(null)
const editDate = ref('')
const editTime = ref('')

// Force un reload a chaque ouverture pour refleter l'etat backend courant
// (messages envoyes / echoues depuis la derniere fois). load(false) retourne
// immediatement si deja loaded — on force avec true.
onMounted(() => { store.load(true) })
watch(() => props.modelValue, (open) => { if (open) store.load(true) })

function contextLabel(m: ScheduledMessage): string {
  if (m.channel_name) return `#${m.channel_name}`
  if (m.dm_peer_name) return `@${m.dm_peer_name}`
  return 'Message privé'
}

function formatWhen(iso: string): string {
  try { return `${formatDate(iso)} ${formatTime(iso)}` } catch { return iso }
}

function startEdit(m: ScheduledMessage) {
  editingId.value = m.id
  const d = new Date(m.send_at)
  editDate.value = d.toISOString().slice(0, 10)
  editTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function saveEdit(m: ScheduledMessage) {
  if (!editDate.value || !editTime.value) return
  const iso = new Date(`${editDate.value}T${editTime.value}`).toISOString()
  const ok = await store.update(m.id, { sendAt: iso })
  if (ok) editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}
</script>

<template>
  <Modal :model-value="modelValue" title="Messages programmés" max-width="640px" @update:model-value="emit('update:modelValue', $event)">
    <div class="smm-body">
      <div v-if="loading && !items.length" class="smm-loading">Chargement…</div>

      <EmptyState
        v-else-if="!items.length"
        :icon="Clock"
        title="Aucun message programmé"
        subtitle="Écris un message puis clique sur l'icône horloge pour le programmer."
        size="md"
        tone="accent"
      />

      <ul v-else class="smm-list">
        <li v-for="m in items" :key="m.id" class="smm-item" :class="{ 'smm-failed': !!m.failed_at }">
          <div class="smm-head">
            <span class="smm-ctx">
              <Hash v-if="m.channel_id" :size="12" />
              <User v-else :size="12" />
              {{ contextLabel(m) }}
            </span>
            <span class="smm-when">
              <Clock :size="12" />
              {{ formatWhen(m.send_at) }}
            </span>
            <span v-if="m.failed_at" class="smm-badge smm-badge-failed">
              <AlertTriangle :size="11" /> Echec
            </span>
            <span v-else class="smm-badge smm-badge-pending">
              <CheckCircle2 :size="11" /> En attente
            </span>
          </div>

          <div class="smm-preview">{{ m.content.slice(0, 240) }}{{ m.content.length > 240 ? '…' : '' }}</div>

          <div v-if="m.failed_at" class="smm-error">
            {{ m.error || 'Echec inconnu. Modifiez la date pour relancer.' }}
          </div>

          <div v-if="editingId === m.id" class="smm-edit">
            <input v-model="editDate" type="date" class="smm-input" />
            <input v-model="editTime" type="time" class="smm-input" step="60" />
            <button class="smm-btn smm-btn-save" @click="saveEdit(m)">Enregistrer</button>
            <button class="smm-btn smm-btn-cancel" @click="cancelEdit">Annuler</button>
          </div>

          <div v-else class="smm-actions">
            <button class="smm-btn" @click="startEdit(m)">
              <Edit3 :size="12" /> Modifier
            </button>
            <button class="smm-btn smm-btn-danger" @click="store.remove(m.id)">
              <Trash2 :size="12" /> Supprimer
            </button>
          </div>
        </li>
      </ul>
    </div>
  </Modal>
</template>

<style scoped>
.smm-body { padding: 12px 16px 16px; }
.smm-loading { padding: 40px; text-align: center; color: var(--text-muted); }

.smm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto; }

.smm-item {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.smm-item.smm-failed { border-color: var(--color-warning); background: rgba(232, 137, 26, .06); }

.smm-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
.smm-ctx  { color: var(--accent); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.smm-when { color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; }
.smm-badge {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase;
}
.smm-badge-pending { background: rgba(46, 204, 113, .15); color: var(--color-success); }
.smm-badge-failed  { background: rgba(231, 76, 60, .15); color: var(--color-danger); }

.smm-preview {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}
.smm-error {
  font-size: 12px;
  color: var(--color-danger);
  background: rgba(231, 76, 60, .08);
  padding: 4px 8px;
  border-radius: 4px;
}

.smm-actions, .smm-edit { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.smm-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.smm-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.smm-btn-danger:hover { background: rgba(231, 76, 60, .12); color: var(--color-danger); border-color: var(--color-danger); }
.smm-btn-save {
  background: var(--accent); color: #fff; border-color: var(--accent);
}
.smm-input {
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-input);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12px;
}
</style>
