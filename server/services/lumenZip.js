/**
 * Lumen — Service de construction d'un zip streaming depuis un snapshot JSON.
 *
 * Le snapshot contient l'arborescence et le contenu base64 des fichiers d'un
 * repo git exemple. Ce service recompose les fichiers dans un archive ZIP
 * pipee dans un stream writable (typiquement la reponse HTTP d'Express).
 *
 * Streaming : archiver gere le backpressure, donc un projet de 5 Mo n'est
 * jamais materialise integralement en memoire.
 */
const archiver = require('archiver')

/**
 * Construit un zip depuis un snapshot et le pipe dans un stream writable.
 *
 * Le zip contient tous les fichiers du snapshot avec leurs chemins relatifs
 * preserves, plus un fichier `README-snapshot.txt` en racine avec les
 * metadonnees (repo_url, commit_sha, fetched_at).
 *
 * @param {object} snapshot Snapshot deja parse (pas une string JSON).
 * @param {NodeJS.WritableStream} writable Stream de sortie (ex: res).
 * @returns {Promise<{ bytes: number, files: number }>} Resout quand le zip
 *   est finalise et ecrit dans le stream.
 */
function streamZipFromSnapshot(snapshot, writable) {
  return new Promise((resolve, reject) => {
    if (!snapshot || !Array.isArray(snapshot.files)) {
      reject(new Error('Snapshot invalide : pas de champ files.'))
      return
    }

    const zip = archiver('zip', { zlib: { level: 6 } })

    let bytes = 0
    let fileCount = 0

    zip.on('warning', (err) => {
      // Les warnings de type ENOENT sont normaux pour un archive virtuel ;
      // on les propage quand meme pour le logging.
      if (err.code !== 'ENOENT') reject(err)
    })
    zip.on('error', reject)
    zip.on('end', () => {
      resolve({ bytes: zip.pointer(), files: fileCount })
    })

    writable.on('error', reject)

    zip.pipe(writable)

    // README metadonnees en racine
    const readme = [
      `Projet d'exemple — snapshot Cursus`,
      ``,
      `Repo     : ${snapshot.repo_url ?? 'inconnu'}`,
      `Branche  : ${snapshot.default_branch ?? 'inconnue'}`,
      `Commit   : ${snapshot.commit_sha ?? 'inconnu'}`,
      `Snapshote: ${snapshot.fetched_at ?? 'inconnu'}`,
      `Fichiers : ${snapshot.file_count ?? snapshot.files.length}`,
      `Taille   : ${snapshot.total_size ?? 'inconnue'} octets`,
      ``,
      `Ce zip a ete genere a partir du snapshot fige cote Cursus, pas depuis`,
      `le repo GitHub en direct. Il reflete l'etat du repo au moment de la`,
      `publication du cours.`,
    ].join('\n')
    zip.append(readme, { name: 'README-snapshot.txt' })

    // Fichiers du snapshot
    for (const entry of snapshot.files) {
      if (typeof entry.path !== 'string' || typeof entry.content_base64 !== 'string') {
        continue
      }
      const buffer = Buffer.from(entry.content_base64, 'base64')
      bytes += buffer.length
      fileCount += 1
      zip.append(buffer, { name: entry.path })
    }

    zip.finalize().catch(reject)
  })
}

module.exports = { streamZipFromSnapshot }
