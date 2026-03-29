import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/constants', () => ({
  STORAGE_KEYS: { SESSION: 'cc_session' },
}))

import { getAuthToken, authUrl } from '@/utils/auth'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
  length: 0,
  key: vi.fn(() => null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('getAuthToken', () => {
  it('returns token from stored session', () => {
    store['cc_session'] = JSON.stringify({ token: 'jwt123' })
    expect(getAuthToken()).toBe('jwt123')
  })

  it('returns empty string when no session', () => {
    expect(getAuthToken()).toBe('')
  })

  it('returns empty string when session has no token', () => {
    store['cc_session'] = JSON.stringify({ name: 'Jean' })
    expect(getAuthToken()).toBe('')
  })

  it('handles corrupt JSON gracefully', () => {
    store['cc_session'] = '{bad json!!!'
    expect(getAuthToken()).toBe('')
  })
})

describe('authUrl', () => {
  it('returns empty string for null/undefined input', () => {
    expect(authUrl(null)).toBe('')
    expect(authUrl(undefined)).toBe('')
  })

  it('returns the URL as-is when it does not contain /uploads/', () => {
    expect(authUrl('https://example.com/images/cat.png')).toBe('https://example.com/images/cat.png')
  })

  it('appends token param to /uploads/ URLs', () => {
    store['cc_session'] = JSON.stringify({ token: 'abc' })
    const result = authUrl('http://localhost:3000/uploads/file.pdf')
    expect(result).toBe('http://localhost:3000/uploads/file.pdf?token=abc')
  })

  it('uses & separator when URL already has query params', () => {
    store['cc_session'] = JSON.stringify({ token: 'abc' })
    const result = authUrl('http://localhost:3000/uploads/file.pdf?v=1')
    expect(result).toBe('http://localhost:3000/uploads/file.pdf?v=1&token=abc')
  })

  it('preserves hash fragment after token', () => {
    store['cc_session'] = JSON.stringify({ token: 'xyz' })
    const result = authUrl('http://localhost:3000/uploads/img.png#size=200')
    expect(result).toBe('http://localhost:3000/uploads/img.png?token=xyz#size=200')
  })

  it('returns URL without token when no session exists', () => {
    const url = 'http://localhost:3000/uploads/file.pdf'
    expect(authUrl(url)).toBe(url)
  })
})
