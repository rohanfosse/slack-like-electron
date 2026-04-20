/**
 * Gestion des réactions emoji sur les messages (toggle, picker, liste affichée).
 * Used by ChatBubble.vue
 */
import { ref, computed } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import type { Message } from '@/types'

const REACT_TYPES = [
  { type: 'check', emoji: '✅' },
  { type: 'thumb', emoji: '👍' },
  { type: 'fire',  emoji: '🔥' },
  { type: 'heart', emoji: '❤️' },
  { type: 'think', emoji: '🤔' },
  { type: 'eyes',  emoji: '👀' },
]

const QUICK_REACTS = REACT_TYPES.slice(0, 4)

/**
 * Réactions sur un message : toggle, picker, liste à afficher.
 */
export function useBubbleReactions(msg: () => Message) {
  const messagesStore = useMessagesStore()
  const showPicker = ref(false)

  function quickReact(type: string) { messagesStore.toggleReaction(msg().id, type) }

  function pickReact(type: string) {
    messagesStore.toggleReaction(msg().id, type)
    showPicker.value = false
  }

  function pickEmojiReact(emoji: string) {
    messagesStore.toggleReaction(msg().id, emoji)
    showPicker.value = false
  }

  // Map des types 'legacy' (check/thumb/fire/...) vers leur emoji.
  // Les reactions arbitraires (via context menu ou picker) sont keyed par
  // emoji directement : key = emoji.
  const TYPE_TO_EMOJI = new Map(REACT_TYPES.map(t => [t.type, t.emoji]))

  const reactionsToShow = computed(() => {
    const r    = messagesStore.reactions[msg().id] ?? {}
    const mine = messagesStore.userVotes[msg().id] ?? new Set()
    const out: { type: string; emoji: string; count: number; isMine: boolean }[] = []
    for (const [key, count] of Object.entries(r)) {
      const n = count as number
      if (!n || n <= 0) continue
      const emoji = TYPE_TO_EMOJI.get(key) ?? key
      out.push({ type: key, emoji, count: n, isMine: mine.has(key) })
    }
    return out
  })

  return {
    REACT_TYPES, QUICK_REACTS,
    showPicker, quickReact, pickReact, pickEmojiReact,
    reactionsToShow,
  }
}
