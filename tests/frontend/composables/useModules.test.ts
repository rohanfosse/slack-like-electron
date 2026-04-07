import { describe, it, expect, vi, beforeEach } from 'vitest'

const getModulesMock = vi.fn()
const setModuleEnabledMock = vi.fn()

;(window as unknown as { api: Record<string, unknown> }).api = {
  ...((window as unknown as { api: Record<string, unknown> }).api ?? {}),
  getModules: getModulesMock,
  setModuleEnabled: setModuleEnabledMock,
}

// useModules uses module-level state, so we must re-import fresh each time
// We reset by calling resetLoaded() before each test
import { useModules, type ModuleName } from '@/composables/useModules'

describe('useModules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { resetLoaded } = useModules()
    resetLoaded()
  })

  it('MODULES array contains exactly 6 items', () => {
    const { MODULES } = useModules()
    expect(MODULES).toHaveLength(6)
    expect(MODULES).toEqual(['kanban', 'frise', 'rex', 'live', 'signatures', 'lumen'])
  })

  it('MODULE_LABELS has all 6 modules with string labels', () => {
    const { MODULE_LABELS, MODULES } = useModules()
    for (const m of MODULES) {
      expect(typeof MODULE_LABELS[m]).toBe('string')
      expect(MODULE_LABELS[m].length).toBeGreaterThan(0)
    }
  })

  it('isEnabled defaults to true for all modules', () => {
    const { isEnabled, MODULES } = useModules()
    for (const m of MODULES) {
      expect(isEnabled(m)).toBe(true)
    }
  })

  it('loadModules fetches and updates state', async () => {
    getModulesMock.mockResolvedValue({
      ok: true,
      data: { kanban: false, frise: true, rex: false, live: true, signatures: false },
    })

    const { loadModules, isEnabled } = useModules()
    await loadModules()

    expect(getModulesMock).toHaveBeenCalledOnce()
    expect(isEnabled('kanban')).toBe(false)
    expect(isEnabled('frise')).toBe(true)
    expect(isEnabled('rex')).toBe(false)
    expect(isEnabled('live')).toBe(true)
    expect(isEnabled('signatures')).toBe(false)
  })

  it('loadModules handles API error gracefully (defaults stay true)', async () => {
    getModulesMock.mockRejectedValue(new Error('Network error'))

    const { loadModules, isEnabled, MODULES } = useModules()
    await loadModules()

    for (const m of MODULES) {
      expect(isEnabled(m)).toBe(true)
    }
  })

  it('loadModules handles response with ok=false gracefully', async () => {
    getModulesMock.mockResolvedValue({ ok: false })

    const { loadModules, isEnabled, MODULES } = useModules()
    await loadModules()

    for (const m of MODULES) {
      expect(isEnabled(m)).toBe(true)
    }
  })

  it('setEnabled updates local state and calls API', async () => {
    setModuleEnabledMock.mockResolvedValue({ ok: true })

    const { setEnabled, isEnabled } = useModules()
    await setEnabled('kanban', false)

    expect(isEnabled('kanban')).toBe(false)
    expect(setModuleEnabledMock).toHaveBeenCalledWith('kanban', false)
  })

  it('setEnabled can re-enable a module', async () => {
    setModuleEnabledMock.mockResolvedValue({ ok: true })

    const { setEnabled, isEnabled } = useModules()
    await setEnabled('rex', false)
    expect(isEnabled('rex')).toBe(false)

    await setEnabled('rex', true)
    expect(isEnabled('rex')).toBe(true)
    expect(setModuleEnabledMock).toHaveBeenCalledTimes(2)
  })

  it('loadModules only calls API once (caches loaded flag)', async () => {
    getModulesMock.mockResolvedValue({ ok: true, data: { kanban: false } })

    const { loadModules } = useModules()
    await loadModules()
    await loadModules()

    expect(getModulesMock).toHaveBeenCalledOnce()
  })

  it('resetLoaded allows loadModules to fetch again', async () => {
    getModulesMock.mockResolvedValue({ ok: true, data: {} })

    const { loadModules, resetLoaded } = useModules()
    await loadModules()
    expect(getModulesMock).toHaveBeenCalledOnce()

    resetLoaded()
    await loadModules()
    expect(getModulesMock).toHaveBeenCalledTimes(2)
  })
})
