/**
 * Tests unitaires pour le composable useBentoPrefs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

// Mock localStorage
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

// Mock the registry with known test widgets
vi.mock('@/components/dashboard/student-widgets/registry', () => ({
  STUDENT_WIDGETS: [
    { id: 'w1', label: 'Widget 1', icon: {}, description: 'W1', defaultEnabled: true },
    { id: 'w2', label: 'Widget 2', icon: {}, description: 'W2', defaultEnabled: true },
    { id: 'w3', label: 'Widget 3', icon: {}, description: 'W3', defaultEnabled: true },
    { id: 'w4', label: 'Widget 4', icon: {}, description: 'W4', defaultEnabled: false },
  ],
}))

vi.mock('@/constants', () => ({
  STORAGE_KEYS: { BENTO_PREFS: 'cc_bento_prefs' },
}))

import { useBentoPrefs } from '@/composables/useBentoPrefs'

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('useBentoPrefs', () => {
  it('default order matches registry (enabled in order, disabled in hidden)', () => {
    const { prefs } = useBentoPrefs()
    expect(prefs.value.order).toEqual(['w1', 'w2', 'w3'])
    expect(prefs.value.hidden).toEqual(['w4'])
  })

  it('toggleWidget hides a visible widget (removes from order, adds to hidden)', async () => {
    const { toggleWidget, prefs } = useBentoPrefs()
    toggleWidget('w2')
    expect(prefs.value.order).not.toContain('w2')
    expect(prefs.value.hidden).toContain('w2')
  })

  it('toggleWidget shows a hidden widget (removes from hidden, adds to order)', async () => {
    const { toggleWidget, prefs } = useBentoPrefs()
    // w4 is hidden by default
    toggleWidget('w4')
    expect(prefs.value.hidden).not.toContain('w4')
    expect(prefs.value.order).toContain('w4')
  })

  it('resetDefaults restores default order', () => {
    const { toggleWidget, resetDefaults, prefs } = useBentoPrefs()
    toggleWidget('w1')
    toggleWidget('w3')
    resetDefaults()
    expect(prefs.value.order).toEqual(['w1', 'w2', 'w3'])
    expect(prefs.value.hidden).toEqual(['w4'])
  })

  it('persistence: changes are saved to localStorage', async () => {
    const { toggleWidget } = useBentoPrefs()
    toggleWidget('w1')
    await nextTick()
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'cc_bento_prefs',
      expect.any(String),
    )
    const saved = JSON.parse(store['cc_bento_prefs'])
    expect(saved.hidden).toContain('w1')
  })

  it('loads from localStorage on init', () => {
    store['cc_bento_prefs'] = JSON.stringify({
      order: ['w3', 'w1'],
      hidden: ['w2'],
    })
    const { prefs } = useBentoPrefs()
    expect(prefs.value.order).toContain('w3')
    expect(prefs.value.order).toContain('w1')
    // w4 was missing from stored prefs - should be added according to defaultEnabled (false → hidden)
    expect(prefs.value.hidden).toContain('w4')
  })

  it('corrupt localStorage: handles gracefully and uses defaults', () => {
    store['cc_bento_prefs'] = '{invalid json!!!'
    const { prefs } = useBentoPrefs()
    expect(prefs.value.order).toEqual(['w1', 'w2', 'w3'])
    expect(prefs.value.hidden).toEqual(['w4'])
  })
})
