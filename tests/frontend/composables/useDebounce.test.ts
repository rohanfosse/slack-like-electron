import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDebounce } from '../../../src/renderer/src/composables/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns the initial value immediately', () => {
    const source = ref('hello')
    const debounced = useDebounce(source, 300)
    expect(debounced.value).toBe('hello')
  })

  it('does not update immediately on source change', async () => {
    const source = ref('initial')
    const debounced = useDebounce(source, 300)

    source.value = 'changed'
    await nextTick()

    expect(debounced.value).toBe('initial')
  })

  it('updates after the delay', async () => {
    const source = ref('initial')
    const debounced = useDebounce(source, 300)

    source.value = 'changed'
    await nextTick()

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(debounced.value).toBe('changed')
  })

  it('resets timer on rapid changes', async () => {
    const source = ref('a')
    const debounced = useDebounce(source, 200)

    source.value = 'b'
    await nextTick()
    vi.advanceTimersByTime(100) // 100ms elapsed

    source.value = 'c'
    await nextTick()
    vi.advanceTimersByTime(100) // 100ms more (200 total, but timer reset)

    expect(debounced.value).toBe('a') // not yet

    vi.advanceTimersByTime(100) // 100ms more = 200ms since last change
    await nextTick()

    expect(debounced.value).toBe('c')
  })

  it('works with number refs', async () => {
    const source = ref(0)
    const debounced = useDebounce(source, 100)

    source.value = 42
    await nextTick()
    vi.advanceTimersByTime(100)
    await nextTick()

    expect(debounced.value).toBe(42)
  })

  it('uses default delay of 300ms', async () => {
    const source = ref('test')
    const debounced = useDebounce(source)

    source.value = 'updated'
    await nextTick()

    vi.advanceTimersByTime(299)
    await nextTick()
    expect(debounced.value).toBe('test')

    vi.advanceTimersByTime(1)
    await nextTick()
    expect(debounced.value).toBe('updated')
  })
})
