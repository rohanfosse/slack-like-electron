import { describe, it, expect } from 'vitest'
import { validateUrl } from '@/utils/urlValidation'

describe('validateUrl — URLs valides', () => {
  it('accepte une URL https complète', () => {
    const r = validateUrl('https://example.com/path')
    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('https://example.com/path')
  })

  it('accepte une URL http', () => {
    const r = validateUrl('http://example.com')
    expect(r.valid).toBe(true)
  })

  it('accepte mailto:', () => {
    const r = validateUrl('mailto:prof@cesi.fr')
    expect(r.valid).toBe(true)
  })

  it('trim les espaces autour', () => {
    const r = validateUrl('  https://example.com  ')
    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('https://example.com/')
  })

  it('auto-préfixe https:// si domaine sans scheme', () => {
    const r = validateUrl('example.com/path')
    expect(r.valid).toBe(true)
    expect(r.normalized).toContain('https://example.com')
  })

  it('auto-préfixe pour un sous-domaine avec point', () => {
    const r = validateUrl('github.com/rohanfosse/cursus')
    expect(r.valid).toBe(true)
    expect(r.normalized).toContain('https://github.com/')
  })
})

describe('validateUrl — URLs invalides', () => {
  it('refuse une URL vide', () => {
    const r = validateUrl('')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/vide/i)
  })

  it('refuse seulement des espaces', () => {
    expect(validateUrl('   ').valid).toBe(false)
  })

  it('refuse javascript:', () => {
    const r = validateUrl('javascript:alert(1)')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/protocole/i)
  })

  it('refuse data:', () => {
    expect(validateUrl('data:text/html,<script>').valid).toBe(false)
  })

  it('refuse file://', () => {
    expect(validateUrl('file:///etc/passwd').valid).toBe(false)
  })

  it('refuse une chaîne sans point (ressemble pas à une URL)', () => {
    expect(validateUrl('notaurl').valid).toBe(false)
  })

  it('refuse une URL > 2048 caractères', () => {
    const long = 'https://example.com/' + 'a'.repeat(2100)
    expect(validateUrl(long).valid).toBe(false)
  })

  it('refuse une URL mal formée malgré un scheme', () => {
    expect(validateUrl('http://').valid).toBe(false)
  })
})
