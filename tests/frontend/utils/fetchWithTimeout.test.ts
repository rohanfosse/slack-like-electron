/**
 * Tests pour fetchWithTimeout — wrapper fetch avec AbortSignal.timeout.
 * Robustesse pilote : sans timeout, un upload hung bloque l UI indefiniment
 * (uploading.value = true jamais reset).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithTimeout, isAbortError, DEFAULT_FETCH_TIMEOUT_MS } from '@/utils/fetchWithTimeout'

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('delegue a fetch() avec le signal en plus', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    await fetchWithTimeout('https://a.fr/x')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://a.fr/x')
    expect(init.signal).toBeDefined()
  })

  it('transmet la methode et le body au fetch sous-jacent', async () => {
    fetchMock.mockResolvedValue(new Response('{}'))
    const body = JSON.stringify({ x: 1 })
    await fetchWithTimeout('https://a.fr/x', { method: 'POST', body })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(body)
  })

  it('utilise le timeout par defaut (30s) si non fourni', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }))
      const promise = fetchWithTimeout('https://a.fr/x')
      vi.advanceTimersByTime(DEFAULT_FETCH_TIMEOUT_MS + 10)
      await expect(promise).rejects.toThrow()
    } finally { vi.useRealTimers() }
  })

  it('respecte un timeout custom court', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }))
      const promise = fetchWithTimeout('https://a.fr/x', {}, 500)
      vi.advanceTimersByTime(1000)
      await expect(promise).rejects.toThrow()
    } finally { vi.useRealTimers() }
  })

  it('combine le signal du caller et le timeout (abort externe)', async () => {
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const ctrl = new AbortController()
    const promise = fetchWithTimeout('https://a.fr/x', { signal: ctrl.signal }, 10_000)
    ctrl.abort()
    await expect(promise).rejects.toThrow()
  })
})

describe('fetchWithTimeout — signal deja abort', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      if (init.signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
      return Promise.resolve(new Response('{}'))
    }) as unknown as typeof fetch
  })

  afterEach(() => { globalThis.fetch = originalFetch })

  it('rejette immediatement si le signal caller est deja abort', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(fetchWithTimeout('https://a.fr/x', { signal: ctrl.signal })).rejects.toThrow()
  })
})

describe('isAbortError', () => {
  it('reconnait AbortError', () => {
    const err = new DOMException('Aborted', 'AbortError')
    expect(isAbortError(err)).toBe(true)
  })

  it('reconnait TimeoutError', () => {
    const err = new DOMException('Timed out', 'TimeoutError')
    expect(isAbortError(err)).toBe(true)
  })

  it('false pour une erreur normale', () => {
    expect(isAbortError(new Error('boom'))).toBe(false)
  })

  it('false pour null/undefined/string', () => {
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
    expect(isAbortError('AbortError')).toBe(false)
  })
})
