<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import { useLinkPreviews, type LinkPreview } from '@/composables/useLinkPreviews'

const props = defineProps<{ preview: LinkPreview }>()
const { imageUrl } = useLinkPreviews()

function openExternal() {
  try { window.api.openExternal(props.preview.url) } catch { window.open(props.preview.url, '_blank') }
}

function shortHost(url: string): string {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return url }
}
</script>

<template>
  <div class="link-preview" role="link" tabindex="0" @click="openExternal" @keydown.enter="openExternal">
    <div v-if="preview.image" class="link-preview-image">
      <img :src="imageUrl(preview.image)" :alt="preview.title ?? ''" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />
    </div>
    <div class="link-preview-body">
      <span class="link-preview-site">
        <ExternalLink :size="10" />
        {{ preview.site_name || shortHost(preview.url) }}
      </span>
      <span v-if="preview.title" class="link-preview-title">{{ preview.title }}</span>
      <span v-if="preview.description" class="link-preview-desc">{{ preview.description }}</span>
    </div>
  </div>
</template>

<style scoped>
.link-preview {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  padding: 10px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
  cursor: pointer;
  max-width: 520px;
  transition: background var(--motion-fast), border-color var(--motion-fast);
}
.link-preview:hover {
  background: var(--bg-active);
  border-color: var(--accent);
}
.link-preview:focus-visible { outline: none; box-shadow: var(--focus-ring); }

.link-preview-image {
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-surface);
}
.link-preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.link-preview-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.link-preview-site {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .3px;
  font-weight: 600;
}
.link-preview-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.link-preview-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
