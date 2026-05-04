<script setup lang="ts">
/**
 * Modal de programmation d'un message. Prend le contenu courant de
 * MessageInput + le contexte (channel/DM) et envoie le payload a
 * useScheduledMessages.create. Minimum 1 min dans le futur (30s serveur-side
 * plus buffer UX), max 1 an.
 */
import { ref, computed, watch } from 'vue'
import { Calendar, Clock, Send } from 'lucide-vue-next'
import Modal from '@/components/ui/Modal.vue'
import { useScheduledMessages } from '@/composables/useScheduledMessages'

interface Props {
  modelValue: boolean
  content: string
  channelId: number | null
  dmStudentId: number | null
  dmPeerId: number | null
  replyToId: number | null
  replyToAuthor: string | null
  replyToPreview: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  scheduled: []
}>()

const { create } = useScheduledMessages()

const dateInput = ref('')
const timeInput = ref('')
const submitting = ref(false)

// Presets rapides : +1h, +demain 9h, +lundi 9h
const quickPresets = computed(() => {
  const now = new Date()
  const in1h = new Date(now.getTime() + 60 * 60 * 1000)
  const tomorrow9 = new Date(now); tomorrow9.setDate(tomorrow9.getDate() + 1); tomorrow9.setHours(9, 0, 0, 0)
  const nextMonday = new Date(now)
  const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
  nextMonday.setHours(9, 0, 0, 0)
  return [
    { label: 'Dans 1 heure', at: in1h },
    { label: 'Demain 9h',    at: tomorrow9 },
    { label: 'Lundi prochain 9h', at: nextMonday },
  ]
})

const sendAtIso = computed<string | null>(() => {
  if (!dateInput.value || !timeInput.value) return null
  const local = new Date(`${dateInput.value}T${timeInput.value}`)
  if (Number.isNaN(local.getTime())) return null
  return local.toISOString()
})

const isFutureEnough = computed(() => {
  if (!sendAtIso.value) return false
  return new Date(sendAtIso.value).getTime() - Date.now() >= 60_000
})

const canSubmit = computed(() =>
  !submitting.value
  && !!props.content.trim()
  && isFutureEnough.value
  && (props.channelId || props.dmStudentId))

function applyPreset(at: Date) {
  const yyyy = at.getFullYear()
  const mm = String(at.getMonth() + 1).padStart(2, '0')
  const dd = String(at.getDate()).padStart(2, '0')
  const hh = String(at.getHours()).padStart(2, '0')
  const mi = String(at.getMinutes()).padStart(2, '0')
  dateInput.value = `${yyyy}-${mm}-${dd}`
  timeInput.value = `${hh}:${mi}`
}

async function submit() {
  if (!canSubmit.value || !sendAtIso.value) return
  submitting.value = true
  const ok = await create({
    channelId:      props.channelId,
    dmStudentId:    props.dmStudentId,
    dmPeerId:       props.dmPeerId,
    content:        props.content,
    sendAt:         sendAtIso.value,
    replyToId:      props.replyToId,
    replyToAuthor:  props.replyToAuthor,
    replyToPreview: props.replyToPreview,
  })
  submitting.value = false
  if (ok) {
    emit('scheduled')
    emit('update:modelValue', false)
  }
}

watch(() => props.modelValue, (open) => {
  if (open && !dateInput.value) applyPreset(quickPresets.value[1].at)
})
</script>

<template>
  <Modal :model-value="modelValue" title="Programmer l'envoi" max-width="460px" @update:model-value="emit('update:modelValue', $event)">
    <div class="sched-body">
      <p class="sched-target">
        <template v-if="channelId">Dans le canal courant</template>
        <template v-else-if="dmStudentId">En message privé</template>
      </p>

      <div class="sched-preview">{{ content.slice(0, 220) }}{{ content.length > 220 ? '…' : '' }}</div>

      <div class="sched-presets">
        <button
          v-for="p in quickPresets"
          :key="p.label"
          class="sched-preset"
          @click="applyPreset(p.at)"
        >{{ p.label }}</button>
      </div>

      <div class="sched-row">
        <label class="sched-field">
          <Calendar :size="14" />
          <input v-model="dateInput" type="date" class="sched-input" />
        </label>
        <label class="sched-field">
          <Clock :size="14" />
          <input v-model="timeInput" type="time" class="sched-input" step="60" />
        </label>
      </div>

      <p v-if="dateInput && timeInput && !isFutureEnough" class="sched-warning">
        La date doit être au moins 1 minute dans le futur.
      </p>

      <div class="sched-actions">
        <button class="sched-btn sched-btn-cancel" @click="emit('update:modelValue', false)">Annuler</button>
        <button class="sched-btn sched-btn-submit" :disabled="!canSubmit" @click="submit">
          <Send :size="13" />
          <span>{{ submitting ? 'Programmation…' : 'Programmer' }}</span>
        </button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.sched-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.sched-target {
  font-size: 12px; color: var(--text-muted); margin: 0;
  text-transform: uppercase; letter-spacing: .4px; font-weight: 700;
}
.sched-preview {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}
.sched-presets { display: flex; gap: 6px; flex-wrap: wrap; }
.sched-preset {
  font-size: 12px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.sched-preset:hover { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }

.sched-row { display: flex; gap: 8px; }
.sched-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  color: var(--text-muted);
}
.sched-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.sched-warning { font-size: 12px; color: var(--color-warning); margin: 0; }
.sched-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.sched-btn {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.sched-btn-submit {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.sched-btn-submit:disabled { opacity: .4; cursor: not-allowed; }
.sched-btn-cancel:hover { background: var(--bg-hover); }
</style>
