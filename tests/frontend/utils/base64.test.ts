/**
 * Tests pour utils/base64 — helpers base64 <-> Uint8Array / Blob / URL.
 * Introduit en v2.169 pour factoriser les decodeurs dupliques dans
 * DocumentPreviewModal et LumenPdfViewer.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import {
  base64ToUint8Array,
  base64ToArrayBuffer,
  base64ToBlob,
  base64ToBlobUrl,
  base64ToDataUrl,
  dataUrlToUint8Array,
} from '@/utils/base64'

// Polyfill URL.createObjectURL en env jsdom (non disponible par defaut)
beforeAll(() => {
  if (typeof URL.createObjectURL !== 'function') {
    let counter = 0
    URL.createObjectURL = () => `blob:test-${++counter}`
    URL.revokeObjectURL = () => { /* noop */ }
  }
})

/** "Hello" en base64 */
const HELLO_B64 = 'SGVsbG8='
const HELLO_BYTES = [0x48, 0x65, 0x6c, 0x6c, 0x6f]

/** 1x1 PNG transparent (les 8 premiers octets sont la signature PNG) */
const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII='

describe('base64ToUint8Array', () => {
  it('decode correctement une chaine ASCII', () => {
    const bytes = base64ToUint8Array(HELLO_B64)
    expect(Array.from(bytes)).toEqual(HELLO_BYTES)
  })

  it('retourne un Uint8Array (pas un Buffer Node)', () => {
    const bytes = base64ToUint8Array(HELLO_B64)
    expect(bytes).toBeInstanceOf(Uint8Array)
  })

  it('preserve la signature PNG \\x89PNG\\r\\n\\x1a\\n', () => {
    const bytes = base64ToUint8Array(PNG_1X1_B64)
    expect(bytes.length).toBeGreaterThan(8)
    expect(bytes[0]).toBe(0x89)
    expect(bytes[1]).toBe(0x50) // P
    expect(bytes[2]).toBe(0x4e) // N
    expect(bytes[3]).toBe(0x47) // G
  })

  it('retourne un tableau vide pour une chaine vide', () => {
    const bytes = base64ToUint8Array('')
    expect(bytes.length).toBe(0)
  })
})

describe('base64ToArrayBuffer', () => {
  it('retourne un ArrayBuffer avec le bon byteLength', () => {
    const buf = base64ToArrayBuffer(HELLO_B64)
    expect(buf).toBeInstanceOf(ArrayBuffer)
    expect(buf.byteLength).toBe(HELLO_BYTES.length)
  })

  it('preserve les octets quand reconverti', () => {
    const buf = base64ToArrayBuffer(HELLO_B64)
    const view = new Uint8Array(buf)
    expect(Array.from(view)).toEqual(HELLO_BYTES)
  })
})

describe('base64ToBlob', () => {
  it('cree un Blob avec le type MIME demande', () => {
    const blob = base64ToBlob(HELLO_B64, 'text/plain')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(HELLO_BYTES.length)
  })

  it('supporte les MIME binaires comme application/pdf', () => {
    const blob = base64ToBlob(PNG_1X1_B64, 'application/pdf')
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })
})

describe('base64ToBlobUrl', () => {
  it('retourne une URL commencant par blob:', () => {
    const url = base64ToBlobUrl(HELLO_B64, 'text/plain')
    expect(url).toMatch(/^blob:/)
  })

  it('appelle URL.createObjectURL (pas crypto random, pas data URL)', () => {
    const url = base64ToBlobUrl(HELLO_B64, 'text/plain')
    expect(url.startsWith('data:')).toBe(false)
    expect(url.length).toBeLessThan(200) // blob URLs sont courtes, data URLs longues
  })
})

describe('base64ToDataUrl', () => {
  it('prefix data: + MIME + ;base64,', () => {
    const url = base64ToDataUrl(HELLO_B64, 'text/plain')
    expect(url).toBe(`data:text/plain;base64,${HELLO_B64}`)
  })

  it('supporte application/pdf', () => {
    const url = base64ToDataUrl(HELLO_B64, 'application/pdf')
    expect(url).toBe(`data:application/pdf;base64,${HELLO_B64}`)
  })
})

describe('dataUrlToUint8Array', () => {
  it('roundtrip base64 -> data URL -> bytes preserve le contenu', () => {
    const dataUrl = base64ToDataUrl(HELLO_B64, 'application/pdf')
    const bytes = dataUrlToUint8Array(dataUrl)
    expect(bytes).not.toBeNull()
    expect(Array.from(bytes!)).toEqual(HELLO_BYTES)
  })

  it('retourne null si le MIME ne matche pas le expectedMime', () => {
    const dataUrl = base64ToDataUrl(HELLO_B64, 'text/plain')
    expect(dataUrlToUint8Array(dataUrl, 'application/pdf')).toBeNull()
  })

  it('retourne null pour un data URL malforme', () => {
    expect(dataUrlToUint8Array('pas-un-data-url')).toBeNull()
    expect(dataUrlToUint8Array('data:application/pdf,pas-base64')).toBeNull()
  })

  it('retourne null pour une chaine vide', () => {
    expect(dataUrlToUint8Array('')).toBeNull()
  })

  it('accepte un expectedMime different (image/png)', () => {
    const dataUrl = base64ToDataUrl(PNG_1X1_B64, 'image/png')
    const bytes = dataUrlToUint8Array(dataUrl, 'image/png')
    expect(bytes).not.toBeNull()
    expect(bytes![0]).toBe(0x89)
  })

  it('par defaut attend application/pdf', () => {
    const pdfUrl = base64ToDataUrl(HELLO_B64, 'application/pdf')
    const pngUrl = base64ToDataUrl(HELLO_B64, 'image/png')
    expect(dataUrlToUint8Array(pdfUrl)).not.toBeNull()
    expect(dataUrlToUint8Array(pngUrl)).toBeNull()
  })
})
