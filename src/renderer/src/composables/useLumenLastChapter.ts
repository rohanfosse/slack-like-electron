/**
 * Memorise le dernier chapitre Lumen ouvert par l'utilisateur (par promo)
 * dans le localStorage. Permet l'auto-resume a l'entree du module : zero
 * clic pour reprendre la lecture la ou on s'etait arrete.
 *
 * Pas un singleton ref reactive comme useLumenFocus : la lecture est
 * one-shot a l'arrivee dans LumenView, l'ecriture est trigger par chaque
 * selection de chapitre. Pas besoin de partager un etat reactif.
 */

const STORAGE_KEY = 'cursus.lumen.lastChapter'

export interface LumenLastChapter {
  promoId: number
  repoId: number
  chapterPath: string
  /** Timestamp ISO de la derniere lecture, pour debug / TTL futur eventuel. */
  at: string
}

function readAll(): Record<string, LumenLastChapter> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Rejet des arrays : JSON.parse('[]') est un object en JS, ce qui
    // passerait le typeof test et corromprait l'indexation par promoId.
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, LumenLastChapter>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota / safari private mode */ }
}

export function useLumenLastChapter() {
  /**
   * Retourne le dernier chapitre lu pour une promo donnee, ou null si
   * jamais lu / promo absente du store local.
   */
  function get(promoId: number): LumenLastChapter | null {
    const all = readAll()
    return all[String(promoId)] ?? null
  }

  /**
   * Memorise le chapitre courant comme dernier lu pour la promo. Ecrase
   * sans question — c'est une preference par promo, pas un historique.
   */
  function set(promoId: number, repoId: number, chapterPath: string): void {
    const all = readAll()
    all[String(promoId)] = {
      promoId,
      repoId,
      chapterPath,
      at: new Date().toISOString(),
    }
    writeAll(all)
  }

  /**
   * Oublie le dernier chapitre d'une promo (ex: changement de promo, reset).
   * Si promoId omis, vide tout.
   */
  function clear(promoId?: number): void {
    if (promoId == null) {
      writeAll({})
      return
    }
    const all = readAll()
    delete all[String(promoId)]
    writeAll(all)
  }

  return { get, set, clear }
}
