import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useMsgFormatting } from '@/composables/useMsgFormatting'

function createTextarea(value = '', selectionStart = 0, selectionEnd = 0) {
  const el = {
    value,
    selectionStart,
    selectionEnd,
    focus: vi.fn(),
  } as unknown as HTMLTextAreaElement
  return el
}

describe('useMsgFormatting', () => {
  const autoResize = vi.fn()

  // ── fmtWrap ─────────────────────────────────────────────────────────────
  describe('fmtWrap', () => {
    it('wraps selected text with bold markers', () => {
      const content = ref('Hello world')
      const el = createTextarea('Hello world', 6, 11)
      const inputEl = ref(el)
      const { fmtWrap } = useMsgFormatting(content, inputEl, autoResize)

      fmtWrap('**', '**')

      expect(el.value).toBe('Hello **world**')
      expect(content.value).toBe('Hello **world**')
      expect(el.selectionStart).toBe(8)
      expect(el.selectionEnd).toBe(13)
    })

    it('inserts placeholder when nothing selected', () => {
      const content = ref('Hello ')
      const el = createTextarea('Hello ', 6, 6)
      const inputEl = ref(el)
      const { fmtWrap } = useMsgFormatting(content, inputEl, autoResize)

      fmtWrap('*', '*')

      expect(el.value).toBe('Hello *texte*')
      expect(content.value).toBe('Hello *texte*')
      expect(el.selectionStart).toBe(7)
      expect(el.selectionEnd).toBe(12)
    })

    it('wraps with code backticks', () => {
      const content = ref('call func here')
      const el = createTextarea('call func here', 5, 9)
      const inputEl = ref(el)
      const { fmtWrap } = useMsgFormatting(content, inputEl, autoResize)

      fmtWrap('`', '`')

      expect(el.value).toBe('call `func` here')
    })

    it('wraps with strikethrough', () => {
      const content = ref('old text')
      const el = createTextarea('old text', 0, 3)
      const inputEl = ref(el)
      const { fmtWrap } = useMsgFormatting(content, inputEl, autoResize)

      fmtWrap('~~', '~~')

      expect(el.value).toBe('~~old~~ text')
    })

    it('does nothing if inputEl is null', () => {
      const content = ref('test')
      const inputEl = ref(null as HTMLTextAreaElement | null)
      const { fmtWrap } = useMsgFormatting(content, inputEl, autoResize)

      fmtWrap('**', '**')
      expect(content.value).toBe('test')
    })
  })

  // ── fmtLinePrefix ──────────────────────────────────────────────────────
  describe('fmtLinePrefix', () => {
    it('prefixes current line when no selection', () => {
      const content = ref('some text')
      const el = createTextarea('some text', 4, 4)
      const inputEl = ref(el)
      const { fmtLinePrefix } = useMsgFormatting(content, inputEl, autoResize)

      fmtLinePrefix('> ')

      expect(el.value).toBe('> some text')
      expect(content.value).toBe('> some text')
      expect(el.selectionStart).toBe(6)
    })

    it('prefixes multiple selected lines', () => {
      const text = 'line1\nline2\nline3'
      const content = ref(text)
      const el = createTextarea(text, 0, text.length)
      const inputEl = ref(el)
      const { fmtLinePrefix } = useMsgFormatting(content, inputEl, autoResize)

      fmtLinePrefix('- ')

      expect(el.value).toBe('- line1\n- line2\n- line3')
    })

    it('adds numbered list prefix', () => {
      const content = ref('item')
      const el = createTextarea('item', 0, 0)
      const inputEl = ref(el)
      const { fmtLinePrefix } = useMsgFormatting(content, inputEl, autoResize)

      fmtLinePrefix('1. ')

      expect(el.value).toBe('1. item')
    })

    it('does nothing if inputEl is null', () => {
      const content = ref('test')
      const inputEl = ref(null as HTMLTextAreaElement | null)
      const { fmtLinePrefix } = useMsgFormatting(content, inputEl, autoResize)

      fmtLinePrefix('> ')
      expect(content.value).toBe('test')
    })
  })

  // ── fmtInsertBlock ────────────────────────────────────────────────────
  describe('fmtInsertBlock', () => {
    it('inserts code block around selection', () => {
      const content = ref('const x = 1')
      const el = createTextarea('const x = 1', 0, 11)
      const inputEl = ref(el)
      const { fmtInsertBlock } = useMsgFormatting(content, inputEl, autoResize)

      fmtInsertBlock()

      expect(el.value).toBe('```\nconst x = 1\n```')
      expect(content.value).toBe('```\nconst x = 1\n```')
      expect(el.selectionStart).toBe(4)
      expect(el.selectionEnd).toBe(15)
    })

    it('inserts placeholder code block when nothing selected', () => {
      const content = ref('')
      const el = createTextarea('', 0, 0)
      const inputEl = ref(el)
      const { fmtInsertBlock } = useMsgFormatting(content, inputEl, autoResize)

      fmtInsertBlock()

      expect(el.value).toBe('```\ncode\n```')
      expect(el.selectionStart).toBe(4)
      expect(el.selectionEnd).toBe(8)
    })

    it('does nothing if inputEl is null', () => {
      const content = ref('test')
      const inputEl = ref(null as HTMLTextAreaElement | null)
      const { fmtInsertBlock } = useMsgFormatting(content, inputEl, autoResize)

      fmtInsertBlock()
      expect(content.value).toBe('test')
    })
  })
})
