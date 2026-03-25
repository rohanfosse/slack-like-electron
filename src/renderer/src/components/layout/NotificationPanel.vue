<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CheckCheck, X, CheckCircle2, Bell,
  MessageSquare, AtSign, Mail, Award, Clock, Pen, FileText, ClipboardList, AlertTriangle,
} from 'lucide-vue-next'
import { useAppStore }    from '@/stores/app'
import { useMessagesStore } from '@/stores/messages'
import { useRouter } from 'vue-router'

const emit = defineEmits<{ close: [] }>()

const appStore      = useAppStore()
const messagesStore = useMessagesStore()
const router        = useRouter()

type FilterType = 'all' | 'messages' | 'grades' | 'deadlines' | 'other'
const filter = ref<FilterType>('all')

const CATEGORY_ICONS: Record<string, object> = {
  message: MessageSquare, mention: AtSign, dm: Mail,
  grade: Award, deadline: Clock, signature: Pen,
  document: FileText, assignment: ClipboardList,
}
const CATEGORY_COLORS: Record<string, string> = {
  message: 'var(--text-muted)', mention: 'var(--accent)', dm: 'var(--accent)',
  grade: '#f59e0b', deadline: '#ef4444', signature: '#8b5cf6',
  document: '#059669', assignment: '#3b82f6',
}

const filtered = computed(() => {
  const list = appStore.notificationHistory
  if (filter.value === 'all') return list
  if (filter.value === 'messages') return list.filter(n => ['message', 'mention', 'dm'].includes(n.category ?? ''))
  if (filter.value === 'grades') return list.filter(n => n.category === 'grade')
  if (filter.value === 'deadlines') return list.filter(n => n.category === 'deadline')
  return list.filter(n => ['signature', 'document', 'assignment'].includes(n.category ?? ''))
})

// Regroupement par jour
const grouped = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86_400_000
  const weekAgo = today - 7 * 86_400_000

  const groups: { label: string; items: typeof filtered.value }[] = []
  const todayItems = filtered.value.filter(n => n.timestamp >= today)
  const yesterdayItems = filtered.value.filter(n => n.timestamp >= yesterday && n.timestamp < today)
  const weekItems = filtered.value.filter(n => n.timestamp >= weekAgo && n.timestamp < yesterday)
  const olderItems = filtered.value.filter(n => n.timestamp < weekAgo)

  if (todayItems.length) groups.push({ label: "Aujourd'hui", items: todayItems })
  if (yesterdayItems.length) groups.push({ label: 'Hier', items: yesterdayItems })
  if (weekItems.length) groups.push({ label: 'Cette semaine', items: weekItems })
  if (olderItems.length) groups.push({ label: 'Plus ancien', items: olderItems })
  return groups
})

const hasAny     = computed(() => appStore.notificationHistory.length > 0)
const hasUnread  = computed(() => appStore.notificationHistory.some(n => !n.read))
const unreadCount = computed(() => appStore.notificationHistory.filter(n => !n.read).length)

async function goTo(entry: typeof appStore.notificationHistory[number]) {
  entry.read = true
  emit('close')
  const promoId = entry.promoId ?? appStore.activePromoId ?? 0
  if (entry.dmStudentId) {
    appStore.markDmRead(entry.authorName)
    await router.push('/messages')
  } else if (entry.channelId) {
    appStore.openChannel(entry.channelId, promoId, entry.channelName)
    await router.push('/messages')
    await messagesStore.fetchMessages()
  } else if (entry.category === 'grade' || entry.category === 'assignment' || entry.category === 'deadline') {
    await router.push('/dashboard')
  } else if (entry.category === 'document') {
    await router.push('/messages')
  }
}

function removeNotif(id: string) {
  appStore.notificationHistory = appStore.notificationHistory.filter(n => n.id !== id)
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)     return "A l'instant"
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function notifTitle(n: typeof appStore.notificationHistory[number]): string {
  return (n as any).title || n.authorName || ''
}
function notifPreview(n: typeof appStore.notificationHistory[number]): string {
  return (n as any).preview || (n.dmStudentId ? 'Message direct' : `#${n.channelName}`)
}
function notifCategory(n: typeof appStore.notificationHistory[number]): string {
  return (n as any).category || (n.isMention ? 'mention' : 'message')
}
</script>

<template>
  <div class="notif-panel" role="dialog" aria-label="Centre de notifications" aria-live="polite">
    <!-- En-tete -->
    <div class="notif-header">
      <span class="notif-title">Notifications</span>
      <span v-if="unreadCount" class="notif-badge">{{ unreadCount }}</span>
      <div class="notif-header-actions">
        <button v-if="hasUnread" class="notif-mark-all" title="Tout marquer comme lu" @click="appStore.markAllRead()">
          <CheckCheck :size="13" /> Tout lire
        </button>
        <button class="notif-close-btn" aria-label="Fermer" @click="emit('close')"><X :size="14" /></button>
      </div>
    </div>

    <!-- Filtres -->
    <div v-if="hasAny" class="notif-filters">
      <button :class="{ active: filter === 'all' }" @click="filter = 'all'">Tout</button>
      <button :class="{ active: filter === 'messages' }" @click="filter = 'messages'">Messages</button>
      <button :class="{ active: filter === 'grades' }" @click="filter = 'grades'">Notes</button>
      <button :class="{ active: filter === 'deadlines' }" @click="filter = 'deadlines'">Deadlines</button>
      <button :class="{ active: filter === 'other' }" @click="filter = 'other'">Autre</button>
    </div>

    <!-- Vide -->
    <div v-if="!hasAny" class="notif-empty">
      <Bell :size="28" class="notif-empty-icon" />
      <p>Aucune notification</p>
    </div>

    <!-- Toutes lues -->
    <div v-else-if="!filtered.length" class="notif-empty" style="padding: 16px 12px;">
      <CheckCircle2 :size="22" style="color: var(--color-success); opacity: .6;" />
      <p>Rien dans cette categorie</p>
    </div>

    <!-- Groupes par jour -->
    <div v-else class="notif-scroll">
      <div v-for="group in grouped" :key="group.label" class="notif-group">
        <div class="notif-group-label">{{ group.label }}</div>
        <button
          v-for="n in group.items"
          :key="n.id"
          class="notif-item"
          :class="{ unread: !n.read }"
          @click="goTo(n)"
        >
          <div class="notif-item-icon" :style="{ color: CATEGORY_COLORS[notifCategory(n)] || 'var(--text-muted)' }">
            <component :is="CATEGORY_ICONS[notifCategory(n)] || Bell" :size="14" />
          </div>
          <div class="notif-item-body">
            <span class="notif-item-title">{{ notifTitle(n) }}</span>
            <span class="notif-item-preview">{{ notifPreview(n) }}</span>
          </div>
          <div class="notif-item-right">
            <span class="notif-item-time">{{ formatTime(n.timestamp) }}</span>
            <button class="notif-item-dismiss" title="Supprimer" @click.stop="removeNotif(n.id)"><X :size="10" /></button>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif-panel {
  position: absolute; left: calc(100% + 10px); bottom: 0;
  width: 320px; max-height: 480px;
  background: var(--bg-modal); border: 1px solid var(--border);
  border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.55);
  display: flex; flex-direction: column; overflow: hidden; z-index: 200;
}
.notif-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px 8px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.notif-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .5px; }
.notif-badge {
  font-size: 10px; font-weight: 700; color: #fff;
  background: var(--color-danger, #dc2626); border-radius: 10px; padding: 1px 6px;
}
.notif-header-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.notif-mark-all {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--accent); background: none; border: none;
  cursor: pointer; padding: 2px 6px; border-radius: 6px; transition: background .1s;
}
.notif-mark-all:hover { background: rgba(74,144,217,.12); }
.notif-close-btn {
  background: none; border: none; color: var(--text-muted); cursor: pointer;
  padding: 3px; border-radius: 5px; display: flex; transition: color .1s, background .1s;
}
.notif-close-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

/* Filtres */
.notif-filters {
  display: flex; gap: 3px; padding: 8px 10px 6px; flex-shrink: 0; overflow-x: auto;
}
.notif-filters button {
  font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 100px;
  border: 1px solid var(--border); background: transparent; color: var(--text-muted);
  cursor: pointer; white-space: nowrap; font-family: inherit; transition: all .12s;
}
.notif-filters button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.notif-filters button:hover:not(.active) { border-color: var(--text-muted); }

/* Vide */
.notif-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 32px 16px; color: var(--text-muted); font-size: 12.5px;
}
.notif-empty-icon { opacity: .35; }
.notif-empty p { margin: 0; }

/* Scroll */
.notif-scroll { flex: 1; overflow-y: auto; }

/* Groupes */
.notif-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--text-muted); padding: 8px 12px 4px;
  background: var(--bg-modal); position: sticky; top: 0; z-index: 1;
}

/* Items */
.notif-item {
  display: flex; align-items: flex-start; gap: 8px; width: 100%;
  padding: 8px 12px; background: transparent; border: none;
  cursor: pointer; text-align: left; transition: background .08s;
}
.notif-item:hover { background: var(--bg-hover); }
.notif-item.unread { background: rgba(74,144,217,.05); }
.notif-item.unread:hover { background: rgba(74,144,217,.1); }

.notif-item-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  background: var(--bg-hover);
}
.notif-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.notif-item-title {
  font-size: 12px; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.notif-item-preview {
  font-size: 11px; color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.notif-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.notif-item-time { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.notif-item-dismiss {
  width: 16px; height: 16px; border-radius: 4px; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity .1s, background .1s;
}
.notif-item:hover .notif-item-dismiss { opacity: 1; }
.notif-item-dismiss:hover { background: var(--bg-hover); color: var(--text-primary); }
</style>
