/**
 * Tests pour useConfirm — dialog de confirmation asynchrone (singleton).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useConfirm } from '@/composables/useConfirm'

describe('useConfirm', () => {
  beforeEach(() => {
    // Reset shared state by resolving any pending confirm
    const { visible, resolve } = useConfirm()
    if (visible.value) resolve(false)
  })

  it('confirm() shows dialog and returns a promise', () => {
    const { confirm, visible, options } = useConfirm()
    const promise = confirm('Supprimer ?', 'danger')

    expect(visible.value).toBe(true)
    expect(options.value.message).toBe('Supprimer ?')
    expect(options.value.variant).toBe('danger')
    expect(promise).toBeInstanceOf(Promise)

    // Clean up
    const { resolve } = useConfirm()
    resolve(false)
  })

  it('resolve(true) fulfills the promise with true', async () => {
    const { confirm, resolve } = useConfirm()
    const promise = confirm('Continuer ?', 'warning')

    resolve(true)

    const result = await promise
    expect(result).toBe(true)
  })

  it('resolve(false) fulfills with false and hides dialog', async () => {
    const { confirm, resolve, visible } = useConfirm()
    const promise = confirm('Annuler ?', 'info')

    expect(visible.value).toBe(true)
    resolve(false)

    const result = await promise
    expect(result).toBe(false)
    expect(visible.value).toBe(false)
  })

  it('resolve hides the dialog', async () => {
    const { confirm, resolve, visible } = useConfirm()
    confirm('Test', 'danger')
    expect(visible.value).toBe(true)

    resolve(true)
    expect(visible.value).toBe(false)
  })

  it('multiple sequential confirms work correctly', async () => {
    const { confirm, resolve } = useConfirm()

    // First confirm
    const p1 = confirm('Premier ?', 'danger')
    resolve(true)
    expect(await p1).toBe(true)

    // Second confirm
    const p2 = confirm('Deuxieme ?', 'warning')
    resolve(false)
    expect(await p2).toBe(false)

    // Third confirm
    const p3 = confirm('Troisieme ?', 'info')
    resolve(true)
    expect(await p3).toBe(true)
  })

  it('passes confirmLabel option through', () => {
    const { confirm, options, resolve } = useConfirm()
    confirm('Supprimer ?', 'danger', 'Oui, supprimer')

    expect(options.value.confirmLabel).toBe('Oui, supprimer')

    resolve(false)
  })

  it('defaults variant to danger', () => {
    const { confirm, options, resolve } = useConfirm()
    confirm('Test')

    expect(options.value.variant).toBe('danger')

    resolve(false)
  })
})
