<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Send, Type, Paperclip, Loader2, X as XIcon, Reply } from 'lucide-vue-next'
import { useAppStore }      from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'
import { avatarColor, initials } from '@/utils/format'
import FormatToolbar from './FormatToolbar.vue'

const appStore      = useAppStore()
const messagesStore = useMessagesStore()

const inputEl     = ref<HTMLTextAreaElement | null>(null)
const content     = ref('')
const showToolbar = ref(false)
const sending     = ref(false)

// ── Brouillons (auto-save localStorage) ──────────────────────────────────────
let _draftTimer: ReturnType<typeof setTimeout> | null = null

const draftKey = computed(() => {
  if (appStore.activeChannelId)   return `draft_ch_${appStore.activeChannelId}`
  if (appStore.activeDmStudentId) return `draft_dm_${appStore.activeDmStudentId}`
  return null
})

function saveDraft() {
  if (!draftKey.value) return
  if (content.value.trim()) localStorage.setItem(draftKey.value, content.value)
  else                      localStorage.removeItem(draftKey.value)
}

function clearDraft() {
  if (_draftTimer) { clearTimeout(_draftTimer); _draftTimer = null }
  if (draftKey.value) localStorage.removeItem(draftKey.value)
}

// ── Mention autocomplete (@) ──────────────────────────────────────────────
interface MentionUser {
  name: string
  type: 'student' | 'teacher' | 'ta' | 'everyone'
}

const allUsers        = ref<MentionUser[]>([])
const mentionActive   = ref(false)
const mentionSearch   = ref('')
const mentionStart    = ref(-1)
const mentionIndex    = ref(0)
const mentionPopupEl  = ref<HTMLElement | null>(null)

/** Supprime les accents pour une comparaison insensible (Élodie ↔ elo) */
function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const mentionResults = computed(() => {
  if (!mentionActive.value) return []
  const q = normalize(mentionSearch.value)
  return allUsers.value
    .filter((u) => normalize(u.name).includes(q))
    .slice(0, 8)
})

// Réinitialiser l'index sélectionné dès que la recherche change
watch(mentionSearch, () => { mentionIndex.value = 0 })

// Vider le cache quand la promo active change
watch(() => appStore.activePromoId, () => { allUsers.value = [] })

async function loadUsers() {
  if (allUsers.value.length) return

  let students: MentionUser[] = []
  const promoId = appStore.activePromoId

  if (promoId) {
    const res = await window.api.getStudents(promoId)
    if (res?.ok) students = res.data.map((s) => ({ name: s.name, type: 'student' as const }))
  } else {
    const res = await window.api.getAllStudents()
    if (res?.ok) students = res.data.map((s) => ({ name: s.name, type: 'student' as const }))
  }

  // Ajouter l'enseignant/TA courant s'il n'est pas dans la liste
  if (appStore.currentUser && appStore.currentUser.type !== 'student') {
    const myName = appStore.currentUser.name
    const myType = appStore.currentUser.type as 'teacher' | 'ta'
    if (!students.some((u) => u.name === myName)) {
      students = [{ name: myName, type: myType }, ...students]
    }
  }

  // @everyone en tête
  allUsers.value = [{ name: 'everyone', type: 'everyone' }, ...students]
}

function insertMention(name: string) {
  if (!inputEl.value) return
  const cursorPos = inputEl.value.selectionStart ?? 0
  const before    = content.value.slice(0, mentionStart.value)
  const after     = content.value.slice(cursorPos)
  content.value   = `${before}@${name} ${after}`
  mentionActive.value = false
  nextTick(() => {
    const pos = mentionStart.value + name.length + 2
    inputEl.value?.setSelectionRange(pos, pos)
    inputEl.value?.focus()
    autoResize()
  })
}

function closeMention() {
  mentionActive.value = false
  mentionIndex.value  = 0
}

// ── Placeholder ───────────────────────────────────────────────────────────
const placeholder = computed(() => {
  if (appStore.isReadonly) return 'Canal d\'annonces — lecture seule'
  if (appStore.activeChannelName) return `Envoyer dans #${appStore.activeChannelName}`
  return 'Votre message…'
})

// ── Auto-resize textarea ──────────────────────────────────────────────────
function autoResize() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = inputEl.value.scrollHeight + 'px'
}

// ── Détection mention ─────────────────────────────────────────────────────
function onInput() {
  autoResize()

  if (!inputEl.value) return
  const cursor = inputEl.value.selectionStart ?? 0
  const before = content.value.slice(0, cursor)

  // Détecte @query jusqu'au prochain espace ou @
  // [^\s@]* → supporte les accents contrairement à \w
  const match = before.match(/@([^\s@]*)$/)
  if (match) {
    mentionSearch.value = match[1]
    mentionStart.value  = cursor - match[0].length
    mentionActive.value = true
    loadUsers()
  } else {
    mentionActive.value = false
  }

  // Brouillon — sauvegarde différée
  if (_draftTimer) clearTimeout(_draftTimer)
  _draftTimer = setTimeout(saveDraft, 500)
}

// Fermer la mention au clic ailleurs
function onBlur() {
  setTimeout(closeMention, 150)
}

// ── Pièce jointe (Paperclip) ──────────────────────────────────────────────
const attaching = ref(false)

async function attachFile() {
  if (attaching.value) return
  attaching.value = true
  try {
    const res = await window.api.openFileDialog()
    if (!res?.ok || !res.data) return
    const filePath = res.data as string
    const insert = content.value ? `\n${filePath}` : filePath
    content.value += insert
    nextTick(() => { autoResize(); inputEl.value?.focus() })
  } finally {
    attaching.value = false
  }
}

// ── Envoi ──────────────────────────────────────────────────────────────────
async function send() {
  if (!content.value.trim() || sending.value || appStore.isReadonly) return
  mentionActive.value = false
  sending.value = true
  try {
    await messagesStore.sendMessage(content.value)
    clearDraft()
    content.value = ''
    if (inputEl.value) inputEl.value.style.height = 'auto'
  } finally {
    sending.value = false
    inputEl.value?.focus()
  }
}

function scrollMentionIntoView() {
  nextTick(() => {
    const popup = mentionPopupEl.value
    if (!popup) return
    const active = popup.querySelector('.mi-mention-selected') as HTMLElement
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(e: KeyboardEvent) {
  if (mentionActive.value && mentionResults.value.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % mentionResults.value.length
      scrollMentionIntoView()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value - 1 + mentionResults.value.length) % mentionResults.value.length
      scrollMentionIntoView()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      insertMention(mentionResults.value[mentionIndex.value].name)
      return
    }
    if (e.key === 'Escape') {
      closeMention()
      e.preventDefault()
      return
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
  if (e.key === 'Escape' && mentionActive.value) {
    closeMention()
    e.preventDefault()
  }
}

// Restaurer le brouillon quand le canal change
watch(
  () => [appStore.activeChannelId, appStore.activeDmStudentId],
  () => {
    mentionActive.value = false
    if (_draftTimer) { clearTimeout(_draftTimer); _draftTimer = null }
    const key = draftKey.value
    content.value = key ? (localStorage.getItem(key) ?? '') : ''
    nextTick(() => {
      autoResize()
      inputEl.value?.focus()
    })
  },
)
</script>

<template>
  <div id="message-input-area" class="message-input-area" :class="{ readonly: appStore.isReadonly }">
    <template v-if="!appStore.isReadonly">

      <!-- Zone indicateur de frappe -->
      <div class="mi-typing" aria-live="polite">
        <span v-if="messagesStore.typingText" class="mi-typing-text">
          {{ messagesStore.typingText }}
        </span>
      </div>

      <!-- Prévisualisation de la citation -->
      <Transition name="quote-slide">
        <div v-if="messagesStore.quotedMessage" class="mi-quote-preview">
          <Reply :size="13" class="mi-quote-icon" />
          <div class="mi-quote-body">
            <span class="mi-quote-author">{{ messagesStore.quotedMessage.author_name }}</span>
            <span class="mi-quote-text">{{ messagesStore.quotedMessage.content.slice(0, 100) }}</span>
          </div>
          <button class="btn-icon mi-quote-close" aria-label="Annuler la citation" @click="messagesStore.clearQuote()">
            <XIcon :size="13" />
          </button>
        </div>
      </Transition>

      <!-- Barre de formatage -->
      <FormatToolbar v-if="showToolbar" :input-el="inputEl" />

      <!-- Zone de saisie principale -->
      <div id="message-input-wrapper" class="message-input-wrapper">

        <button
          id="btn-toggle-format"
          class="btn-icon"
          :class="{ active: showToolbar }"
          title="Mise en forme"
          aria-label="Afficher la barre de mise en forme"
          @click="showToolbar = !showToolbar"
        >
          <Type :size="16" />
        </button>

        <!-- Autocomplete mentions -->
        <Transition name="mention-pop">
          <div
            v-if="mentionActive && mentionResults.length"
            ref="mentionPopupEl"
            class="mi-mention-popup"
            role="listbox"
            aria-label="Mentions"
          >
            <div class="mi-mention-header">Membres</div>
            <button
              v-for="(user, i) in mentionResults"
              :key="user.name"
              class="mi-mention-item"
              :class="{
                'mi-mention-everyone': user.name === 'everyone',
                'mi-mention-selected': i === mentionIndex,
              }"
              role="option"
              :aria-selected="i === mentionIndex"
              @mousedown.prevent="insertMention(user.name)"
              @mouseenter="mentionIndex = i"
            >
              <!-- Avatar initiales -->
              <div
                class="mi-mention-avatar"
                :class="{ 'mi-mention-avatar-everyone': user.name === 'everyone' }"
                :style="user.name !== 'everyone' ? { background: avatarColor(user.name) } : {}"
              >
                {{ user.name === 'everyone' ? '✦' : initials(user.name) }}
              </div>

              <span class="mi-mention-name">{{ user.name }}</span>

              <span v-if="user.name === 'everyone'" class="mi-mention-hint">Notifie tout le monde</span>
              <span v-else-if="user.type === 'teacher'" class="mi-mention-badge mi-badge-teacher">Resp. Péda.</span>
              <span v-else-if="user.type === 'ta'" class="mi-mention-badge mi-badge-ta">Intervenant</span>
            </button>
          </div>
        </Transition>

        <textarea
          id="message-input"
          ref="inputEl"
          v-model="content"
          class="message-input"
          :placeholder="placeholder"
          rows="1"
          @input="onInput"
          @keydown="onKeydown"
          @blur="onBlur"
        />

        <!-- Paperclip -->
        <button
          class="btn-icon mi-attach-btn"
          :class="{ attaching }"
          title="Joindre un fichier"
          aria-label="Joindre un fichier"
          :disabled="attaching"
          @click="attachFile"
        >
          <Loader2 v-if="attaching" :size="16" class="mi-spinner" />
          <Paperclip v-else :size="16" />
        </button>

        <button
          id="btn-send"
          class="btn-primary mi-send-btn"
          :disabled="!content.trim() || sending"
          aria-label="Envoyer le message"
          @click="send"
        >
          <Loader2 v-if="sending" :size="16" class="mi-spinner" />
          <Send v-else :size="16" />
        </button>

      </div>
    </template>

    <p v-else class="readonly-notice">Ce canal est en lecture seule.</p>
  </div>
</template>

<style scoped>
/* ── Indicateur de frappe ── */
.mi-typing {
  min-height: 18px;
  padding: 0 4px 2px 4px;
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
.mi-typing-text::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  margin-right: 5px;
  vertical-align: middle;
  animation: mi-pulse 1.4s ease-in-out infinite;
}

/* ── Prévisualisation citation ── */
.mi-quote-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 12px;
  margin: 0 0 2px;
  background: rgba(74, 144, 217, .07);
  border-left: 3px solid var(--accent);
  border-radius: 0 4px 4px 0;
}
.mi-quote-icon { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
.mi-quote-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.mi-quote-author {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-light, #7db8f0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mi-quote-text {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mi-quote-close {
  flex-shrink: 0;
  padding: 3px;
  opacity: .6;
  transition: opacity var(--t-fast);
}
.mi-quote-close:hover { opacity: 1; }

/* Transition entrée/sortie quote */
.quote-slide-enter-active,
.quote-slide-leave-active { transition: all .15s ease; }
.quote-slide-enter-from,
.quote-slide-leave-to     { opacity: 0; transform: translateY(-4px); max-height: 0; }

/* ── Wrapper (nécessaire pour le positionnement du popup) ── */
.message-input-wrapper { position: relative; }

/* ── Autocomplete mention ── */
.mi-mention-popup {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--bg-modal);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, .45);
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}

.mi-mention-header {
  padding: 6px 14px 5px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  user-select: none;
}

.mi-mention-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font);
  font-size: 13.5px;
  color: var(--text-secondary);
  text-align: left;
  transition: background .08s;
}
.mi-mention-item:hover,
.mi-mention-item.mi-mention-selected {
  background: rgba(255, 255, 255, .07);
  color: var(--text-primary);
}

/* Avatar ── */
.mi-mention-avatar {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -.3px;
  user-select: none;
}

.mi-mention-avatar-everyone {
  background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
  font-size: 12px;
}

/* Nom ── */
.mi-mention-name {
  flex: 1;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* @everyone — nom en rouge */
.mi-mention-everyone .mi-mention-name {
  color: var(--color-danger, #e74c3c);
  font-weight: 700;
}

/* Hint "Notifie tout le monde" ── */
.mi-mention-hint {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--text-muted);
  font-style: italic;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Badges type ── */
.mi-mention-badge {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
  white-space: nowrap;
}
.mi-badge-teacher {
  background: rgba(123, 104, 238, .2);
  color: #9b87f5;
}
.mi-badge-ta {
  background: rgba(39, 174, 96, .2);
  color: var(--color-success);
}

/* Transition d'apparition du popup ── */
.mention-pop-enter-active { transition: opacity .1s ease, transform .1s ease; }
.mention-pop-leave-active { transition: opacity .08s ease, transform .08s ease; }
.mention-pop-enter-from,
.mention-pop-leave-to     { opacity: 0; transform: translateY(4px); }

/* ── Bouton paperclip ── */
.mi-attach-btn { transition: color .15s, opacity .15s; }
.mi-attach-btn:not(:disabled):hover { color: var(--accent); }
.mi-attach-btn:disabled:not(.attaching) { opacity: .4; cursor: not-allowed; }

/* ── Bouton envoi ── */
.mi-send-btn { transition: opacity .15s, transform .15s, background .15s; }
.mi-send-btn:not(:disabled):hover { transform: scale(1.06); }

/* ── Spinner ── */
@keyframes mi-spin { to { transform: rotate(360deg); } }
.mi-spinner { animation: mi-spin .65s linear infinite; }

@keyframes mi-pulse {
  0%, 100% { opacity: .4; transform: scale(.85); }
  50%       { opacity: 1;  transform: scale(1.1); }
}
</style>
