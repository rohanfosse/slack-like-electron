import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cacheData, loadCached, clearOfflineCache } from '../../../src/renderer/src/composables/useOfflineCache'

// Mock window.api
const mockApi = {
  offlineWrite: vi.fn().mockResolvedValue({ ok: true, data: null }),
  offlineRead: vi.fn().mockResolvedValue({ ok: true, data: null }),
  offlineClear: vi.fn().mockResolvedValue({ ok: true, data: null }),
}

vi.stubGlobal('window', { api: mockApi })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('cacheData', () => {
  it('calls offlineWrite with key and data', async () => {
    await cacheData('test-key', { foo: 'bar' })
    expect(mockApi.offlineWrite).toHaveBeenCalledWith('test-key', { foo: 'bar' })
  })

  it('does not throw on API error', async () => {
    mockApi.offlineWrite.mockRejectedValueOnce(new Error('disk full'))
    await expect(cacheData('key', 'data')).resolves.toBeUndefined()
  })
})

describe('loadCached', () => {
  it('returns data when cache hit', async () => {
    mockApi.offlineRead.mockResolvedValueOnce({ ok: true, data: [1, 2, 3] })
    const result = await loadCached<number[]>('messages-ch-1')
    expect(result).toEqual([1, 2, 3])
  })

  it('returns null when cache miss', async () => {
    mockApi.offlineRead.mockResolvedValueOnce({ ok: true, data: null })
    const result = await loadCached('missing-key')
    expect(result).toBeNull()
  })

  it('returns null when API fails', async () => {
    mockApi.offlineRead.mockRejectedValueOnce(new Error('read error'))
    const result = await loadCached('key')
    expect(result).toBeNull()
  })

  it('returns null when response not ok', async () => {
    mockApi.offlineRead.mockResolvedValueOnce({ ok: false, error: 'corrupt' })
    const result = await loadCached('key')
    expect(result).toBeNull()
  })
})

describe('clearOfflineCache', () => {
  it('calls offlineClear', async () => {
    await clearOfflineCache()
    expect(mockApi.offlineClear).toHaveBeenCalled()
  })

  it('does not throw on API error', async () => {
    mockApi.offlineClear.mockRejectedValueOnce(new Error('permission denied'))
    await expect(clearOfflineCache()).resolves.toBeUndefined()
  })
})
