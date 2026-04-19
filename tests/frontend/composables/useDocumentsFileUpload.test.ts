/**
 * Tests pour useDocumentsFileUpload — file handling de la modale d'ajout
 * (picker, drag-drop, validation extensions, progression upload).
 *
 * Extrait en v2.169 de useDocumentsAdd pour separer les responsabilites.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const showToast = vi.fn()

vi.mock('@/composables/useToast', () => ({
  useToast: vi.fn(() => ({ showToast })),
}))

vi.mock('@/utils/auth', () => ({
  getAuthToken: () => 'test-token',
}))

const openFileDialog = vi.fn()

vi.stubGlobal('window', {
  api: { openFileDialog },
  location: { origin: 'http://localhost:3001' },
})

import { useDocumentsFileUpload } from '@/composables/useDocumentsFileUpload'

describe('useDocumentsFileUpload', () => {
  let upload: ReturnType<typeof useDocumentsFileUpload>

  beforeEach(() => {
    showToast.mockClear()
    openFileDialog.mockReset()
    upload = useDocumentsFileUpload()
  })

  describe('etat initial', () => {
    it('start avec une liste vide et aucun drag en cours', () => {
      expect(upload.addFiles.value).toEqual([])
      expect(upload.pendingFileCount.value).toBe(0)
      expect(upload.addFile.value).toBeNull()
      expect(upload.addFileName.value).toBeNull()
      expect(upload.modalDragOver.value).toBe(false)
      expect(upload.uploadProgress.value).toBe(0)
      expect(upload.uploadCurrentIndex.value).toBe(0)
      expect(upload.uploadTotal.value).toBe(0)
    })
  })

  describe('pickFile', () => {
    it('ajoute les fichiers retournes par openFileDialog', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/tmp/rapport.pdf', '/tmp/notes.xlsx'] })
      await upload.pickFile()
      expect(upload.addFiles.value).toHaveLength(2)
      expect(upload.addFiles.value[0]).toEqual({ path: '/tmp/rapport.pdf', name: 'rapport.pdf' })
      expect(upload.addFiles.value[1]).toEqual({ path: '/tmp/notes.xlsx', name: 'notes.xlsx' })
    })

    it('refuse les extensions bloquees et toast une erreur', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/tmp/virus.exe'] })
      await upload.pickFile()
      expect(upload.addFiles.value).toEqual([])
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('non autorisé'), 'error')
    })

    it('accepte les fichiers sans extension', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/tmp/LICENSE'] })
      await upload.pickFile()
      expect(upload.addFiles.value).toHaveLength(1)
      expect(upload.addFiles.value[0].name).toBe('LICENSE')
    })

    it('deduplique si le meme path est deja present', async () => {
      openFileDialog.mockResolvedValueOnce({ ok: true, data: ['/tmp/a.pdf'] })
      await upload.pickFile()
      openFileDialog.mockResolvedValueOnce({ ok: true, data: ['/tmp/a.pdf', '/tmp/b.pdf'] })
      await upload.pickFile()
      expect(upload.addFiles.value).toHaveLength(2)
      expect(upload.addFiles.value.map((f) => f.path)).toEqual(['/tmp/a.pdf', '/tmp/b.pdf'])
    })

    it('no-op si openFileDialog retourne ok:false', async () => {
      openFileDialog.mockResolvedValue({ ok: false })
      await upload.pickFile()
      expect(upload.addFiles.value).toEqual([])
    })
  })

  describe('removeFile / clearFile', () => {
    it('removeFile retire un fichier a l\'index donne', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/a.pdf', '/b.pdf', '/c.pdf'] })
      await upload.pickFile()
      upload.removeFile(1)
      expect(upload.addFiles.value.map((f) => f.name)).toEqual(['a.pdf', 'c.pdf'])
    })

    it('clearFile vide la liste', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/a.pdf'] })
      await upload.pickFile()
      upload.clearFile()
      expect(upload.addFiles.value).toEqual([])
    })
  })

  describe('resetFiles', () => {
    it('remet la liste + la progression a zero', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/a.pdf'] })
      await upload.pickFile()
      upload.uploadProgress.value = 50
      upload.uploadCurrentIndex.value = 1
      upload.uploadTotal.value = 3
      upload.resetFiles()
      expect(upload.addFiles.value).toEqual([])
      expect(upload.uploadProgress.value).toBe(0)
      expect(upload.uploadCurrentIndex.value).toBe(0)
      expect(upload.uploadTotal.value).toBe(0)
    })
  })

  describe('addFile / addFileName (retrocompat)', () => {
    it('expose le premier fichier', async () => {
      openFileDialog.mockResolvedValue({ ok: true, data: ['/tmp/unique.pdf'] })
      await upload.pickFile()
      expect(upload.addFile.value).toBe('/tmp/unique.pdf')
      expect(upload.addFileName.value).toBe('unique.pdf')
    })

    it('null quand la liste est vide', () => {
      expect(upload.addFile.value).toBeNull()
      expect(upload.addFileName.value).toBeNull()
    })
  })

  describe('drag & drop modal', () => {
    function dragEvent(type: string, hasFiles = true): DragEvent {
      const dataTransfer = {
        types: hasFiles ? ['Files'] : [],
        dropEffect: '',
        files: [] as unknown as FileList,
      } as unknown as DataTransfer
      return {
        type,
        preventDefault: vi.fn(),
        dataTransfer,
      } as unknown as DragEvent
    }

    it('onModalDragEnter active le flag si dataTransfer contient "Files"', () => {
      upload.onModalDragEnter(dragEvent('dragenter'))
      expect(upload.modalDragOver.value).toBe(true)
    })

    it('onModalDragEnter ignore les drags sans "Files" (ex. texte)', () => {
      upload.onModalDragEnter(dragEvent('dragenter', false))
      expect(upload.modalDragOver.value).toBe(false)
    })

    it('onModalDragLeave designe-off quand le compteur atteint 0', () => {
      upload.onModalDragEnter(dragEvent('dragenter'))
      upload.onModalDragEnter(dragEvent('dragenter')) // enter imbrique
      expect(upload.modalDragOver.value).toBe(true)
      upload.onModalDragLeave()
      expect(upload.modalDragOver.value).toBe(true) // encore 1 enter actif
      upload.onModalDragLeave()
      expect(upload.modalDragOver.value).toBe(false)
    })

    it('onModalDragOver set le dropEffect a "copy" + preventDefault', () => {
      const evt = dragEvent('dragover')
      upload.onModalDragOver(evt)
      expect(evt.preventDefault).toHaveBeenCalled()
      expect(evt.dataTransfer!.dropEffect).toBe('copy')
    })
  })
})
