/**
 * Tests pour useFocusTrap — piege le focus clavier dans un conteneur.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

// Mock onUnmounted since we are not in a component setup context
const unmountCallbacks: Array<() => void> = []
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onUnmounted: (cb: () => void) => { unmountCallbacks.push(cb) },
  }
})

import { useFocusTrap } from '@/composables/useFocusTrap'

function makeElement(tag = 'button'): HTMLElement {
  const el = document.createElement(tag)
  if (tag === 'a') (el as HTMLAnchorElement).href = '#'
  // jsdom has offsetParent always null; override so visibility filter passes
  Object.defineProperty(el, 'offsetParent', { get: () => document.body, configurable: true })
  return el
}

function createContainer(count: number): { container: HTMLElement; elements: HTMLElement[] } {
  const container = document.createElement('div')
  const elements: HTMLElement[] = []
  for (let i = 0; i < count; i++) {
    const el = makeElement('button')
    container.appendChild(el)
    elements.push(el)
  }
  document.body.appendChild(container)
  return { container, elements }
}

/** Wait for Vue watcher + the internal await nextTick() inside useFocusTrap */
async function waitForWatcher() {
  await nextTick() // watcher fires
  await nextTick() // internal await nextTick() in the composable
  await nextTick() // extra safety
}

describe('useFocusTrap', () => {
  let addSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    unmountCallbacks.length = 0
    document.body.innerHTML = ''
    addSpy = vi.spyOn(document, 'addEventListener')
    removeSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    addSpy.mockRestore()
    removeSpy.mockRestore()
    document.body.innerHTML = ''
  })

  it('focuses first focusable element on activate', async () => {
    const { container, elements } = createContainer(2)
    const focusSpy = vi.spyOn(elements[0], 'focus')
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)

    active.value = true
    await waitForWatcher()

    expect(focusSpy).toHaveBeenCalled()
  })

  it('registers keydown listener on activate', async () => {
    const { container } = createContainer(2)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)

    active.value = true
    await waitForWatcher()

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('traps Tab key — cycles from last to first element', async () => {
    const { container, elements } = createContainer(3)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)
    active.value = true
    await waitForWatcher()

    // Simulate: activeElement is the last button
    Object.defineProperty(document, 'activeElement', { value: elements[2], configurable: true, writable: true })

    const focusFirst = vi.spyOn(elements[0], 'focus')
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })

    document.dispatchEvent(event)

    expect(focusFirst).toHaveBeenCalled()
  })

  it('Shift+Tab from first element goes to last element', async () => {
    const { container, elements } = createContainer(3)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)
    active.value = true
    await waitForWatcher()

    Object.defineProperty(document, 'activeElement', { value: elements[0], configurable: true, writable: true })

    const focusLast = vi.spyOn(elements[2], 'focus')
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })

    document.dispatchEvent(event)

    expect(focusLast).toHaveBeenCalled()
  })

  it('saves and restores focus on activate/deactivate', async () => {
    const outsideButton = makeElement('button')
    document.body.appendChild(outsideButton)
    Object.defineProperty(document, 'activeElement', { value: outsideButton, configurable: true, writable: true })

    const { container, elements } = createContainer(2)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)

    const firstFocusSpy = vi.spyOn(elements[0], 'focus')

    active.value = true
    await waitForWatcher()
    expect(firstFocusSpy).toHaveBeenCalled()

    const restoreSpy = vi.spyOn(outsideButton, 'focus')
    active.value = false
    await waitForWatcher()
    expect(restoreSpy).toHaveBeenCalled()
  })

  it('cleans up keydown listener on unmount', async () => {
    const { container } = createContainer(2)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(true)

    useFocusTrap(containerRef, active)
    await waitForWatcher()

    for (const cb of unmountCallbacks) cb()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('does not preventDefault for non-Tab keys', async () => {
    const { container } = createContainer(2)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)
    active.value = true
    await waitForWatcher()

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    document.dispatchEvent(event)

    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('does not cycle Tab when activeElement is in the middle', async () => {
    const { container, elements } = createContainer(3)
    const containerRef = ref<HTMLElement | null>(container)
    const active = ref(false)

    useFocusTrap(containerRef, active)
    active.value = true
    await waitForWatcher()

    Object.defineProperty(document, 'activeElement', { value: elements[1], configurable: true, writable: true })

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    document.dispatchEvent(event)

    expect(preventSpy).not.toHaveBeenCalled()
  })
})
