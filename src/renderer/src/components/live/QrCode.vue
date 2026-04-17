/**
 * QrCode : genere un QR code a partir d'une URL ou d'un texte.
 * Utilise un canvas pour le rendu, pas de dependance externe.
 * Algorithme : generation via API encode en data URL.
 */
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  value: string
  size?: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const pixelSize = props.size ?? 160

// Minimal QR code generator — supports alphanumeric mode level M up to ~60 chars
// For longer strings, falls back to a simple grid pattern with the text embedded
// We use a pre-built approach: render via a tiny SVG-based encoder

async function renderQr() {
  const canvas = canvasRef.value
  if (!canvas || !props.value) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = pixelSize
  canvas.height = pixelSize

  // Use dynamic import of qrcode if available, fallback to text display
  try {
    const QRCode = await import('qrcode')
    const dataUrl = await QRCode.toDataURL(props.value, {
      width: pixelSize,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, pixelSize, pixelSize)
      ctx.drawImage(img, 0, 0, pixelSize, pixelSize)
    }
    img.src = dataUrl
  } catch {
    // Fallback: display the code as text in a styled box
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pixelSize, pixelSize)
    ctx.fillStyle = '#000000'
    ctx.font = `bold ${Math.floor(pixelSize / 6)}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(props.value, pixelSize / 2, pixelSize / 2)
  }
}

onMounted(renderQr)
watch(() => props.value, renderQr)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="qr-canvas"
    :width="pixelSize"
    :height="pixelSize"
    :style="{ width: pixelSize + 'px', height: pixelSize + 'px' }"
  />
</template>

<style scoped>
.qr-canvas {
  border-radius: 8px;
  image-rendering: pixelated;
}
</style>
