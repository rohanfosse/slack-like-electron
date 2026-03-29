import { describe, it, expect, vi, beforeEach } from 'vitest'

const showToastMock = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

import { useApi } from '@/composables/useApi'

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
})

describe('useApi', () => {
  it('returns data on successful call', async () => {
    const { api } = useApi()
    const result = await api(() => Promise.resolve({ ok: true, data: [1, 2, 3] }))
    expect(result).toEqual([1, 2, 3])
  })

  it('returns null on ok:false and shows toast', async () => {
    const { api } = useApi()
    const result = await api(
      () => Promise.resolve({ ok: false, error: 'Not found' }),
      'search',
    )
    expect(result).toBeNull()
    expect(showToastMock).toHaveBeenCalledWith('Not found', 'error', expect.anything())
  })

  it('returns null and does not toast when silent option is true', async () => {
    const { api } = useApi()
    const result = await api(
      () => Promise.resolve({ ok: false, error: 'Error' }),
      { context: 'search', silent: true },
    )
    expect(result).toBeNull()
    expect(showToastMock).not.toHaveBeenCalled()
  })

  it('returns null when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const { api } = useApi()
    const call = vi.fn()
    const result = await api(call)
    expect(result).toBeNull()
    expect(call).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalled()
  })

  it('does not toast offline error when silent', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const { api } = useApi()
    await api(vi.fn(), { silent: true })
    expect(showToastMock).not.toHaveBeenCalled()
  })

  it('returns null on thrown error and shows toast', async () => {
    const { api } = useApi()
    const result = await api(
      () => { throw new Error('Something broke') },
      'send',
    )
    expect(result).toBeNull()
    expect(showToastMock).toHaveBeenCalled()
  })

  it('retries on network error', async () => {
    const { api } = useApi()
    let attempt = 0
    const call = vi.fn().mockImplementation(() => {
      attempt++
      if (attempt < 3) throw new Error('Failed to fetch')
      return Promise.resolve({ ok: true, data: 'ok' })
    })

    const result = await api(call, { retries: 2 })
    expect(result).toBe('ok')
    expect(call).toHaveBeenCalledTimes(3)
  })

  it('shows network error after all retries fail', async () => {
    const { api } = useApi()
    const call = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    const result = await api(call, { retries: 1 })
    expect(result).toBeNull()
    expect(call).toHaveBeenCalledTimes(2)
    expect(showToastMock).toHaveBeenCalled()
  })

  it('does not retry on business error (ok:false)', async () => {
    const { api } = useApi()
    const call = vi.fn().mockResolvedValue({ ok: false, error: 'Invalid input' })
    await api(call, { retries: 2 })
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('returns null when data is undefined in ok response', async () => {
    const { api } = useApi()
    const result = await api(() => Promise.resolve({ ok: true }))
    expect(result).toBeNull()
  })

  it('auto-detects forbidden context from server error', async () => {
    const { api } = useApi()
    await api(() => Promise.resolve({ ok: false, error: 'Vous n\'avez pas les permissions nécessaires' }))
    // Should still show toast (auto-detected forbidden context)
    expect(showToastMock).toHaveBeenCalled()
  })

  it('shows timeout error for timeout exceptions', async () => {
    const { api } = useApi()
    await api(() => { throw new Error('Request timeout') })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringContaining('temps'),
      'error',
      expect.anything(),
    )
  })

  it('ERROR_CONTEXT is exposed', () => {
    const { ERROR_CONTEXT } = useApi()
    expect(ERROR_CONTEXT).toBeDefined()
    expect(ERROR_CONTEXT['send']).toBeDefined()
    expect(ERROR_CONTEXT['send'].msg).toBeTruthy()
  })
})
