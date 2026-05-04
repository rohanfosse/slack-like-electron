/**
 * Construit l'icone Cursus sans fond blanc + multi-resolutions.
 *
 * Source : resources/icon.png (512x512, oiseau bleu+vert sur fond blanc)
 * Methode : chroma key sur les pixels blancs avec edge anti-aliasing.
 *           - pixel pur blanc -> alpha 0
 *           - pixel quasi-blanc -> alpha proportionnel a la luminosite
 *           - pixel colore -> alpha 255
 * Sortie  : PNGs 16, 24, 32, 48, 64, 128, 256, 512 dans resources/icons-app/
 *           + remplacement de resources/icon.png
 *
 * Lancer : node scripts/build-logo-transparent.js
 */
const sharp = require('sharp')
const fs    = require('fs')
const path  = require('path')

// Source : logo.png (oiseau bleu+vert sur fond blanc) — PAS icon.png qui est
// le carre installer Windows avec degrade.
const SRC      = path.join(__dirname, '..', 'src', 'renderer', 'src', 'assets', 'logo.png.bak')
const OUT_DIR  = path.join(__dirname, '..', 'resources', 'icons-app')
const SIZES    = [16, 24, 32, 48, 64, 128, 256, 512]

// Seuils chroma key blanc -> transparent.
// Tweakable : si reste un halo blanc au bord, baisser WHITE_THRESHOLD ; si la
// silhouette devient trouée, augmenter EDGE_START.
const WHITE_THRESHOLD = 248   // au-dessus = pur blanc -> alpha 0
const EDGE_START       = 200  // en-dessous = pleinement opaque
const EDGE_RANGE       = WHITE_THRESHOLD - EDGE_START

async function removeWhiteBg(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const out = Buffer.from(data)

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i]
    const g = out[i + 1]
    const b = out[i + 2]
    const minRGB = Math.min(r, g, b)

    if (minRGB >= WHITE_THRESHOLD) {
      // Pur blanc -> totalement transparent
      out[i + 3] = 0
    } else if (minRGB > EDGE_START) {
      // Edge anti-alias -> alpha graduel (preserve les contours fins)
      const t = (minRGB - EDGE_START) / EDGE_RANGE
      out[i + 3] = Math.round(255 * (1 - t))
    }
    // sinon : pixel colore, on garde tel quel
  }

  return sharp(out, { raw: { width, height, channels } }).png()
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log(`[logo] source  : ${SRC}`)
  console.log(`[logo] sortie  : ${OUT_DIR}/`)
  console.log(`[logo] tailles : ${SIZES.join(', ')}`)

  // 1) Genere le master transparent 512x512 en buffer reutilisable.
  const masterBuf = await (await removeWhiteBg(SRC)).toBuffer()
  const masterMeta = await sharp(masterBuf).metadata()
  console.log(`[logo] master transparent : ${masterMeta.width}x${masterMeta.height}, alpha OK`)

  // 2) Genere chaque taille via lanczos3 (best quality downsample).
  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `icon-${size}.png`)
    await sharp(masterBuf)
      .resize(size, size, { kernel: 'lanczos3', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out)
    console.log(`[logo] ✓ ${out}`)
  }

  // 3) Remplace src/renderer/src/assets/logo.png (utilise dans NavRail).
  //    On NE TOUCHE PAS resources/icon.png : c'est le carre degrade pour
  //    l'installer Windows (.ico bake), il a son propre design carre.
  const rendererLogo = path.join(__dirname, '..', 'src', 'renderer', 'src', 'assets', 'logo.png')
  await sharp(masterBuf)
    .resize(128, 128, { kernel: 'lanczos3', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(rendererLogo + '.tmp')
  fs.renameSync(rendererLogo + '.tmp', rendererLogo)
  console.log(`[logo] ✓ ${rendererLogo} (remplace, transparent)`)

  console.log('\n[logo] Termine. Pour Windows .ico, lancer ensuite :')
  console.log('       node scripts/build-logo-ico.js')
}

main().catch(err => {
  console.error('[logo] ERREUR:', err)
  process.exit(1)
})
