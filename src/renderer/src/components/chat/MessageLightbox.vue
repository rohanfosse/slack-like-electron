<script setup lang="ts">
/**
 * MessageLightbox : visionneuse plein ecran pour une image de message.
 * Nulle si url == null. Emit 'close' sur clic fond / bouton X.
 */
import { Download, Flame, X } from 'lucide-vue-next'
import { authUrl } from '@/utils/auth'
import { useOpenExternal } from '@/composables/useOpenExternal'

interface Props { url: string | null }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { openExternal } = useOpenExternal()

function onOpenExternal() {
  if (props.url) openExternal(props.url)
}
</script>

<template>
  <Transition name="lightbox-fade">
    <div v-if="url" class="lightbox-overlay" @click.self="emit('close')">
      <div class="lightbox-toolbar">
        <a :href="authUrl(url)" download class="lightbox-btn" title="Telecharger" aria-label="Telecharger l'image" @click.stop>
          <Download :size="18" />
        </a>
        <button class="lightbox-btn" title="Ouvrir dans le navigateur" aria-label="Ouvrir dans le navigateur" @click.stop="onOpenExternal">
          <Flame :size="18" />
        </button>
        <button class="lightbox-btn" title="Fermer" aria-label="Fermer la visionneuse" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>
      <img :src="authUrl(url)" class="lightbox-img" alt="Image agrandie" />
    </div>
  </Transition>
</template>
