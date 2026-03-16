<script setup lang="ts">
  import { computed, watch, nextTick, ref } from 'vue'
  import { useMessagesStore } from '@/stores/messages'
  import MessageBubble from './MessageBubble.vue'
  import { formatDateSeparator } from '@/utils/date'
  import type { Message } from '@/types'

  const store  = useMessagesStore()
  const listEl = ref<HTMLElement | null>(null)

  // Initialiser les réactions à chaque changement de liste
  watch(
    () => store.messages,
    (msgs) => msgs.forEach((m) => store.initReactions(m.id, m.reactions)),
    { immediate: true },
  )

  // Auto-scroll : seulement si on est déjà en bas (± 100px)
  // Si des "nouveaux messages" existent, scroller jusqu'au marqueur la première fois
  let initialScrollDone = false
  watch(
    () => store.messages.length,
    () => nextTick(() => {
      if (!listEl.value) return
      if (!initialScrollDone && store.firstUnreadId) {
        // Scroller jusqu'au marqueur "nouveaux messages"
        const marker = listEl.value.querySelector('.unread-divider')
        if (marker) {
          marker.scrollIntoView({ block: 'center' })
          initialScrollDone = true
          return
        }
      }
      // Sinon scroll vers le bas
      const el = listEl.value
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
      if (atBottom || !initialScrollDone) {
        el.scrollTop = el.scrollHeight
        initialScrollDone = true
      }
    }),
  )

  // Réinitialiser le scroll à chaque changement de canal
  watch(() => store.loading, (loading) => { if (loading) initialScrollDone = false })

  // ── Groupement par date ────────────────────────────────────────────────────
  interface GroupedMessage { msg: Message; grouped: boolean; isFirstUnread: boolean }
  interface DateGroup      { date: string; messages: GroupedMessage[] }

  const dateGroups = computed<DateGroup[]>(() => {
    const groups: DateGroup[] = []
    let lastDate = ''
    let lastMsg: Message | null = null
    let unreadMarked = false

    for (const msg of store.messages) {
      const date = new Date(msg.created_at).toDateString()
      if (date !== lastDate) {
        lastDate = date
        lastMsg  = null
        groups.push({ date: formatDateSeparator(msg.created_at), messages: [] })
      }
      const grp = groups[groups.length - 1]

      const isFirstUnread =
        !unreadMarked &&
        store.firstUnreadId !== null &&
        msg.id === store.firstUnreadId

      if (isFirstUnread) unreadMarked = true

      grp.messages.push({ msg, grouped: store.isGrouped(msg, lastMsg), isFirstUnread })
      lastMsg = msg
    }
    return groups
  })
</script>

<template>
  <div ref="listEl" id="messages-list" class="messages-list">
    <!-- Squelette de chargement -->
    <template v-if="store.loading">
      <div v-for="i in 5" :key="i" class="skel-msg-row">
        <div class="skel skel-avatar" />
        <div class="skel-msg-body">
          <div class="skel skel-line skel-w30" />
          <div class="skel skel-line skel-w90" />
          <div class="skel skel-line skel-w70" />
        </div>
      </div>
    </template>

    <!-- Messages -->
    <template v-else-if="store.messages.length">
      <template v-for="group in dateGroups" :key="group.date">
        <div class="date-separator"><span>{{ group.date }}</span></div>

        <template v-for="{ msg, grouped, isFirstUnread } in group.messages" :key="msg.id">
          <!-- Séparateur "Nouveaux messages" -->
          <div v-if="isFirstUnread" class="unread-divider">
            <span class="unread-divider-label">Nouveaux messages</span>
          </div>

          <MessageBubble
            :msg="msg"
            :grouped="grouped"
            :search-term="store.searchTerm"
          />
        </template>
      </template>
    </template>

    <!-- État vide -->
    <div v-else class="empty-state">
      <p>{{ store.searchTerm ? 'Aucun message ne correspond à cette recherche.' : "Aucun message pour l'instant." }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Séparateur "Nouveaux messages" — style Slack */
.unread-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 20px;
  position: relative;
}

.unread-divider::before,
.unread-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-danger);
  opacity: .5;
}

.unread-divider-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-danger);
  white-space: nowrap;
  padding: 0 8px;
  flex-shrink: 0;
}
</style>
