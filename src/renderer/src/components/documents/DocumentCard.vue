<script setup lang="ts">
/**
 * DocumentCard : card d'un document unique, supporte 3 modes visuels :
 *  - 'grid'  : card verticale avec description, meta, actions (par defaut)
 *  - 'list'  : ligne horizontale compacte avec colonnes
 *  - 'dense' : card minimale avec juste icone + nom + date
 * Les styles correspondants vivent toujours dans DocumentsView (.doc-card--list,
 * .doc-card--dense, etc.) pour eviter la duplication CSS.
 */
import type { Component } from 'vue'
import {
  Star, Copy, Eye, ExternalLink, Download, Pencil, Trash2, File, BookMarked,
} from 'lucide-vue-next'
import { formatDate } from '@/utils/date'
import { useAppStore } from '@/stores/app'
import { useDocumentsStore } from '@/stores/documents'
import type { AppDocument } from '@/types'
import type { DocumentsViewMode } from '@/composables/useDocumentsViewMode'

interface Props {
  doc: AppDocument
  viewMode: DocumentsViewMode
  selectionMode: boolean
  selected: boolean
  iconColor: string
  iconLabel: string
  iconKey: string
  iconComponent?: Component
  /** "Nouveau" badge (added in last 24h) */
  isRecent: boolean
  fileSize: string | null
}

interface Emits {
  (e: 'open'): void
  (e: 'toggle-select'): void
  (e: 'copy-link'): void
  (e: 'download'): void
  (e: 'edit'): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const appStore = useAppStore()
const docStore = useDocumentsStore()

const isDense = props.viewMode === 'dense'
const isList = props.viewMode === 'list'
const iconSize = isDense ? 18 : (isList ? 20 : 28)
const actionSize = isDense ? 12 : 14
const iconBg = props.iconColor + '1A'
const typeBadgeBg = props.iconColor + '22'

function onCardClick() {
  if (props.selectionMode) emit('toggle-select')
  else emit('open')
}
</script>

<template>
  <div
    class="doc-card"
    :class="{
      'doc-card--dense': isDense,
      'doc-card--list': isList,
      'doc-card--fav': docStore.isFavorite(doc.id),
      'doc-card--selected': selected,
    }"
    :title="doc.description ?? doc.name"
    @click="onCardClick"
  >
    <input
      v-if="selectionMode"
      type="checkbox"
      class="doc-select-cb"
      :checked="selected"
      @click.stop="emit('toggle-select')"
    />
    <button
      v-else
      class="doc-card-fav"
      :class="{
        'doc-card-fav--dense': isDense,
        'doc-card-fav--active': docStore.isFavorite(doc.id),
      }"
      :title="docStore.isFavorite(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
      :aria-label="docStore.isFavorite(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
      @click.stop="docStore.toggleFavorite(doc.id)"
    >
      <Star :size="isDense ? 10 : 13" />
    </button>

    <div
      :class="isDense ? 'doc-dense-icon' : 'doc-card-icon'"
      :style="{ background: iconBg, color: iconColor }"
    >
      <component :is="iconComponent ?? File" :size="iconSize" />
    </div>

    <template v-if="!isDense">
      <span class="doc-card-type-badge" :style="{ background: typeBadgeBg, color: iconColor }">
        {{ iconLabel }}
      </span>

      <p class="doc-card-name">
        {{ doc.name }}
        <span v-if="isRecent" class="doc-new-badge">Nouveau</span>
      </p>

      <p v-if="doc.description" class="doc-card-desc">{{ doc.description }}</p>

      <span v-if="doc.travail_title" class="doc-devoir-badge">
        <BookMarked :size="10" />
        {{ doc.travail_title }}
      </span>

      <p class="doc-card-meta">
        <span v-if="!appStore.activeChannelId && doc.channel_name">#{{ doc.channel_name }}</span>
        <span>{{ formatDate(doc.created_at) }}</span>
        <span v-if="fileSize" class="doc-card-size">{{ fileSize }}</span>
      </p>
    </template>

    <template v-else>
      <p class="doc-dense-name">{{ doc.name }}</p>
      <span class="doc-dense-meta">
        {{ formatDate(doc.created_at) }}
        <span v-if="fileSize" class="doc-dense-size">{{ fileSize }}</span>
      </span>
    </template>

    <div class="doc-card-actions" @click.stop>
      <button
        v-if="!isDense"
        class="doc-card-action-btn"
        :class="{ 'doc-fav--active': docStore.isFavorite(doc.id) }"
        :title="docStore.isFavorite(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
        :aria-label="docStore.isFavorite(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'"
        @click="docStore.toggleFavorite(doc.id)"
      >
        <Star :size="actionSize" />
      </button>
      <button
        class="doc-card-action-btn"
        title="Copier le lien"
        aria-label="Copier le lien"
        @click="emit('copy-link')"
      >
        <Copy :size="actionSize" />
      </button>
      <button
        class="doc-card-action-btn"
        :title="doc.type === 'link' ? 'Ouvrir le lien' : 'Previsualiser'"
        :aria-label="doc.type === 'link' ? 'Ouvrir le lien' : 'Previsualiser'"
        @click="emit('open')"
      >
        <Eye v-if="doc.type === 'file'" :size="actionSize" />
        <ExternalLink v-else :size="actionSize" />
      </button>
      <button
        v-if="doc.type === 'file'"
        class="doc-card-action-btn"
        title="Telecharger"
        aria-label="Telecharger"
        @click="emit('download')"
      >
        <Download :size="actionSize" />
      </button>
      <button
        v-if="!isDense && appStore.isTeacher"
        class="doc-card-action-btn"
        title="Modifier"
        aria-label="Modifier"
        @click="emit('edit')"
      >
        <Pencil :size="actionSize" />
      </button>
      <button
        v-if="appStore.isTeacher"
        class="doc-card-action-btn doc-card-action-btn--danger"
        title="Supprimer"
        aria-label="Supprimer"
        @click="emit('delete')"
      >
        <Trash2 :size="actionSize" />
      </button>
    </div>
  </div>
</template>
