/**
 * Tests pour utils/mimeTypes — predicats et constants MIME.
 * Introduit en v2.169 pour eliminer les strings magiques
 * `'application/pdf'`, `'application/vnd.openxmlformats-officedocument...'`
 * dupliquees dans DocumentPreviewModal.
 */
import { describe, it, expect } from 'vitest'
import {
  MIME,
  isPdf, isImage, isVideo, isAudio, isText,
  isWord, isExcel, isPowerPoint,
  categorizeMime,
} from '@/utils/mimeTypes'

describe('MIME constants', () => {
  it('expose les MIME Office modernes (OOXML)', () => {
    expect(MIME.DOCX).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(MIME.XLSX).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(MIME.PPTX).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
  })

  it('expose les MIME Office legacy (Word 97 / Excel 97 / PowerPoint 97)', () => {
    expect(MIME.DOC).toBe('application/msword')
    expect(MIME.XLS).toBe('application/vnd.ms-excel')
    expect(MIME.PPT).toBe('application/vnd.ms-powerpoint')
  })

  it('expose PDF et les formats texte courants', () => {
    expect(MIME.PDF).toBe('application/pdf')
    expect(MIME.PLAIN_TEXT).toBe('text/plain')
    expect(MIME.MARKDOWN).toBe('text/markdown')
    expect(MIME.CSV).toBe('text/csv')
    expect(MIME.ICAL).toBe('text/calendar')
  })
})

describe('isPdf', () => {
  it('true pour application/pdf', () => {
    expect(isPdf('application/pdf')).toBe(true)
    expect(isPdf(MIME.PDF)).toBe(true)
  })
  it('false pour autres types', () => {
    expect(isPdf('application/msword')).toBe(false)
    expect(isPdf('image/png')).toBe(false)
    expect(isPdf('text/plain')).toBe(false)
  })
  it('false pour null / undefined / empty', () => {
    expect(isPdf(null)).toBe(false)
    expect(isPdf(undefined)).toBe(false)
    expect(isPdf('')).toBe(false)
  })
})

describe('isImage', () => {
  it('true pour tous les sous-types image/*', () => {
    expect(isImage('image/png')).toBe(true)
    expect(isImage('image/jpeg')).toBe(true)
    expect(isImage('image/webp')).toBe(true)
    expect(isImage('image/svg+xml')).toBe(true)
    expect(isImage('image/heic')).toBe(true)
  })
  it('false pour non-image', () => {
    expect(isImage('application/pdf')).toBe(false)
    expect(isImage('video/mp4')).toBe(false)
    expect(isImage(null)).toBe(false)
    expect(isImage('')).toBe(false)
  })
})

describe('isVideo', () => {
  it('true pour video/*', () => {
    expect(isVideo('video/mp4')).toBe(true)
    expect(isVideo('video/webm')).toBe(true)
    expect(isVideo('video/quicktime')).toBe(true)
  })
  it('false pour non-video', () => {
    expect(isVideo('audio/mpeg')).toBe(false)
    expect(isVideo('image/png')).toBe(false)
    expect(isVideo(null)).toBe(false)
  })
})

describe('isAudio', () => {
  it('true pour audio/*', () => {
    expect(isAudio('audio/mpeg')).toBe(true)
    expect(isAudio('audio/ogg')).toBe(true)
    expect(isAudio('audio/wav')).toBe(true)
  })
  it('false pour non-audio', () => {
    expect(isAudio('video/mp4')).toBe(false)
    expect(isAudio(null)).toBe(false)
  })
})

describe('isText', () => {
  it('true pour text/*', () => {
    expect(isText('text/plain')).toBe(true)
    expect(isText('text/csv')).toBe(true)
    expect(isText('text/markdown')).toBe(true)
    expect(isText('text/html')).toBe(true)
  })
  it('false pour non-text', () => {
    expect(isText('application/json')).toBe(false)
    expect(isText(null)).toBe(false)
  })
})

describe('isWord', () => {
  it('true pour docx (OOXML)', () => {
    expect(isWord(MIME.DOCX)).toBe(true)
    expect(isWord('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })
  it('true pour doc (Word 97)', () => {
    expect(isWord(MIME.DOC)).toBe(true)
    expect(isWord('application/msword')).toBe(true)
  })
  it('false pour Excel / PDF / texte', () => {
    expect(isWord(MIME.XLSX)).toBe(false)
    expect(isWord(MIME.PDF)).toBe(false)
    expect(isWord('text/plain')).toBe(false)
    expect(isWord(null)).toBe(false)
  })
})

describe('isExcel', () => {
  it('true pour xlsx (OOXML) et xls (97)', () => {
    expect(isExcel(MIME.XLSX)).toBe(true)
    expect(isExcel(MIME.XLS)).toBe(true)
  })
  it('false pour Word / PDF / CSV', () => {
    expect(isExcel(MIME.DOCX)).toBe(false)
    expect(isExcel(MIME.PDF)).toBe(false)
    expect(isExcel(MIME.CSV)).toBe(false) // CSV est text/csv, pas Excel
    expect(isExcel(null)).toBe(false)
  })
})

describe('isPowerPoint', () => {
  it('true pour pptx et ppt', () => {
    expect(isPowerPoint(MIME.PPTX)).toBe(true)
    expect(isPowerPoint(MIME.PPT)).toBe(true)
  })
  it('false pour Word / Excel', () => {
    expect(isPowerPoint(MIME.DOCX)).toBe(false)
    expect(isPowerPoint(MIME.XLSX)).toBe(false)
    expect(isPowerPoint(null)).toBe(false)
  })
})

describe('categorizeMime', () => {
  it('retourne le bucket correct pour chaque type', () => {
    expect(categorizeMime(MIME.PDF)).toBe('pdf')
    expect(categorizeMime('image/png')).toBe('image')
    expect(categorizeMime('video/mp4')).toBe('video')
    expect(categorizeMime('audio/mpeg')).toBe('audio')
    expect(categorizeMime('text/plain')).toBe('text')
    expect(categorizeMime(MIME.DOCX)).toBe('word')
    expect(categorizeMime(MIME.XLSX)).toBe('excel')
    expect(categorizeMime(MIME.PPTX)).toBe('powerpoint')
  })

  it('retourne "other" pour les types inconnus', () => {
    expect(categorizeMime('application/x-custom')).toBe('other')
    expect(categorizeMime('application/octet-stream')).toBe('other')
  })

  it('retourne "other" pour null / undefined / empty', () => {
    expect(categorizeMime(null)).toBe('other')
    expect(categorizeMime(undefined)).toBe('other')
    expect(categorizeMime('')).toBe('other')
  })

  it('prioritise image avant les autres (ordre des checks)', () => {
    // edge case : image/svg+xml contient 'xml' mais doit etre image, pas other
    expect(categorizeMime('image/svg+xml')).toBe('image')
  })
})
