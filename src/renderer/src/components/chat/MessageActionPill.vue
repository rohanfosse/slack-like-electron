<script setup lang="ts">
/**
 * MessageActionPill : barre d'actions flottante au survol d'un message
 * (style Slack). Contient reply, quick reacts, picker emoji, pin, bookmark,
 * menu ···. Toute la logique metier vient du parent via props/events.
 */
import {
  Pin, PinOff, MoreHorizontal, Copy, Trash2, Pencil,
  SmilePlus, Bookmark, BookmarkCheck, Reply,
} from 'lucide-vue-next'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import { useAppStore } from '@/stores/app'

interface QuickReact { type: string; emoji: string }
interface Props {
  quickReacts: readonly QuickReact[]
  isPinned: boolean
  isBookmarked: boolean
  canEdit: boolean
  canDelete: boolean
  showPicker: boolean
  showMenu: boolean
}
defineProps<Props>()
defineEmits<{
  (e: 'update:showPicker', v: boolean): void
  (e: 'update:showMenu', v: boolean): void
  (e: 'reply'): void
  (e: 'quick-react', type: string): void
  (e: 'pick-emoji', emoji: string): void
  (e: 'toggle-pin'): void
  (e: 'toggle-bookmark'): void
  (e: 'copy'): void
  (e: 'edit'): void
  (e: 'delete'): void
}>()

const appStore = useAppStore()
</script>

<template>
  <div class="msg-action-pill">
    <button class="pill-btn" title="Repondre" aria-label="Repondre au message" @click.stop="$emit('reply')">
      <Reply :size="15" />
    </button>

    <button
      v-for="r in quickReacts"
      :key="r.type"
      class="pill-btn pill-emoji-btn"
      :title="r.emoji"
      :aria-label="`Reagir avec ${r.emoji}`"
      @click.stop="$emit('quick-react', r.type)"
    >{{ r.emoji }}</button>

    <div class="pill-picker-wrap">
      <button
        class="pill-btn"
        title="Ajouter une reaction"
        aria-label="Ouvrir le selecteur de reactions"
        @click.stop="$emit('update:showPicker', !showPicker)"
      >
        <SmilePlus :size="15" />
      </button>
      <div v-if="showPicker" class="full-picker-pos" @click.stop>
        <EmojiPicker @pick="(e: string) => $emit('pick-emoji', e)" />
      </div>
    </div>

    <span class="pill-sep" />

    <button
      v-if="appStore.isTeacher"
      class="pill-btn"
      :title="isPinned ? 'Desepingler' : 'Epingler'"
      :aria-label="isPinned ? 'Desepingler le message' : 'Epingler le message'"
      @click.stop="$emit('toggle-pin')"
    >
      <PinOff v-if="isPinned" :size="15" />
      <Pin v-else :size="15" />
    </button>

    <button
      class="pill-btn"
      :class="{ 'pill-bookmarked': isBookmarked }"
      :title="isBookmarked ? 'Retirer des favoris' : 'Sauvegarder dans les favoris'"
      :aria-label="isBookmarked ? 'Retirer des favoris' : 'Sauvegarder dans les favoris'"
      @click.stop="$emit('toggle-bookmark')"
    >
      <BookmarkCheck v-if="isBookmarked" :size="15" />
      <Bookmark v-else :size="15" />
    </button>

    <div class="pill-menu-wrap" @mouseleave="$emit('update:showMenu', false)">
      <button
        class="pill-btn"
        title="Plus d'options"
        aria-label="Plus d'options"
        @click.stop="$emit('update:showMenu', !showMenu)"
      >
        <MoreHorizontal :size="15" />
      </button>

      <div v-if="showMenu" class="msg-menu" role="menu">
        <button class="msg-menu-item" role="menuitem" @click="$emit('reply')">
          <Reply :size="12" /> Repondre
        </button>
        <button class="msg-menu-item" role="menuitem" @click="$emit('copy')">
          <Copy :size="12" /> Copier le texte
        </button>
        <button v-if="canEdit" class="msg-menu-item" role="menuitem" @click="$emit('edit')">
          <Pencil :size="12" /> Modifier
        </button>
        <button v-if="appStore.isTeacher" class="msg-menu-item" role="menuitem" @click="$emit('toggle-pin')">
          <Pin :size="12" /> {{ isPinned ? 'Desepingler' : 'Epingler' }}
        </button>
        <button v-if="canDelete" class="msg-menu-item msg-menu-danger" role="menuitem" @click="$emit('delete')">
          <Trash2 :size="12" /> Supprimer
        </button>
      </div>
    </div>
  </div>
</template>
