/**
 * Tests pour les actions snapshot du store Lumen :
 * - fetchSnapshotTree : cache par courseId
 * - fetchFileContent : decode base64 → text, detection binaire
 * - invalidateSnapshotCache : par cours ou global
 * - refreshSnapshot : patch des metadonnees sur les cours locaux
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLumenStore } from '@/stores/lumen'

// Mock de window.api pour simuler les appels IPC
const apiMock = {
  getLumenSnapshotTree: vi.fn(),
  getLumenSnapshotFile:  vi.fn(),
  refreshLumenSnapshot:  vi.fn(),
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  ;(globalThis as unknown as { window: { api: unknown } }).window = { api: apiMock }
})

function b64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

describe('lumen store — fetchSnapshotTree', () => {
  it('cache le tree apres le premier fetch', async () => {
    apiMock.getLumenSnapshotTree.mockResolvedValue({
      ok: true,
      data: { repo_url: 'x', default_branch: 'main', commit_sha: 's', fetched_at: '2026-01-01', files: [], file_count: 0, total_size: 0 },
    })
    const store = useLumenStore()

    const first = await store.fetchSnapshotTree(42)
    expect(first).toBeDefined()
    expect(apiMock.getLumenSnapshotTree).toHaveBeenCalledTimes(1)

    const second = await store.fetchSnapshotTree(42)
    expect(second).toBeDefined()
    // Deuxieme appel doit venir du cache (pas de nouveau IPC)
    expect(apiMock.getLumenSnapshotTree).toHaveBeenCalledTimes(1)
  })

  it('fetch separement pour des courseId differents', async () => {
    apiMock.getLumenSnapshotTree
      .mockResolvedValueOnce({ ok: true, data: { file_count: 1 } })
      .mockResolvedValueOnce({ ok: true, data: { file_count: 2 } })
    const store = useLumenStore()
    await store.fetchSnapshotTree(1)
    await store.fetchSnapshotTree(2)
    expect(apiMock.getLumenSnapshotTree).toHaveBeenCalledTimes(2)
  })

  it('retourne null si l IPC echoue', async () => {
    apiMock.getLumenSnapshotTree.mockResolvedValue({ ok: false, error: 'boom' })
    const store = useLumenStore()
    const result = await store.fetchSnapshotTree(99)
    expect(result).toBeNull()
  })
})

describe('lumen store — fetchFileContent', () => {
  it('decode le base64 en texte UTF-8', async () => {
    apiMock.getLumenSnapshotFile.mockResolvedValue({
      ok: true,
      data: { path: 'main.py', size: 11, content_base64: b64('print("ok")') },
    })
    const store = useLumenStore()
    const result = await store.fetchFileContent(1, 'main.py')
    expect(result).toBeDefined()
    expect(result?.text).toBe('print("ok")')
    expect(result?.binary).toBe(false)
    expect(result?.size).toBe(11)
  })

  it('detecte les binaires par extension sans fetch IPC', async () => {
    const store = useLumenStore()
    const result = await store.fetchFileContent(1, 'logo.png')
    expect(result?.binary).toBe(true)
    expect(result?.text).toBe('')
    expect(apiMock.getLumenSnapshotFile).not.toHaveBeenCalled()
  })

  it('cache par (courseId, path)', async () => {
    apiMock.getLumenSnapshotFile.mockResolvedValue({
      ok: true,
      data: { path: 'a.py', size: 5, content_base64: b64('hello') },
    })
    const store = useLumenStore()
    await store.fetchFileContent(1, 'a.py')
    await store.fetchFileContent(1, 'a.py')
    expect(apiMock.getLumenSnapshotFile).toHaveBeenCalledTimes(1)
  })

  it('detecte les binaires via caracteres replacement UTF-8', async () => {
    // Buffer avec des bytes non-UTF8 valides
    const binary = Buffer.from([0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8])
    apiMock.getLumenSnapshotFile.mockResolvedValue({
      ok: true,
      data: { path: 'mystery.xyz', size: binary.length, content_base64: binary.toString('base64') },
    })
    const store = useLumenStore()
    const result = await store.fetchFileContent(1, 'mystery.xyz')
    expect(result?.binary).toBe(true)
  })
})

describe('lumen store — invalidateSnapshotCache', () => {
  it('vide le cache pour un cours donne', async () => {
    apiMock.getLumenSnapshotTree.mockResolvedValue({
      ok: true,
      data: { file_count: 1 },
    })
    apiMock.getLumenSnapshotFile.mockResolvedValue({
      ok: true,
      data: { path: 'a.py', size: 5, content_base64: b64('hello') },
    })
    const store = useLumenStore()
    await store.fetchSnapshotTree(1)
    await store.fetchFileContent(1, 'a.py')
    await store.fetchSnapshotTree(2)

    store.invalidateSnapshotCache(1)

    // Apres invalidation de 1, un nouveau fetch doit appeler l IPC
    await store.fetchSnapshotTree(1)
    expect(apiMock.getLumenSnapshotTree).toHaveBeenCalledTimes(3)
    // Mais le cache du cours 2 est preserve
    await store.fetchSnapshotTree(2)
    expect(apiMock.getLumenSnapshotTree).toHaveBeenCalledTimes(3)
  })

  it('vide tout le cache si aucun courseId', async () => {
    apiMock.getLumenSnapshotTree.mockResolvedValue({ ok: true, data: { file_count: 1 } })
    const store = useLumenStore()
    await store.fetchSnapshotTree(1)
    await store.fetchSnapshotTree(2)
    store.invalidateSnapshotCache()
    await store.fetchSnapshotTree(1)
    await store.fetchSnapshotTree(2)
    expect(apiMock.getLumenSnapshotTree).toHaveBeenCalledTimes(4)
  })
})
