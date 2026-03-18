<script setup lang="ts">
  interface Props { inputEl: HTMLTextAreaElement | null }
  const props = defineProps<Props>()

  function wrap(pre: string, post: string) {
    const el = props.inputEl
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const sel   = el.value.slice(start, end) || 'texte'
    el.value    = el.value.slice(0, start) + pre + sel + post + el.value.slice(end)
    el.focus()
    el.selectionStart = start + pre.length
    el.selectionEnd   = start + pre.length + sel.length
    el.dispatchEvent(new Event('input'))
  }

  function insertCodeBlock() {
    const el = props.inputEl
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const sel   = el.value.slice(start, end) || 'code'
    const block = '```\n' + sel + '\n```'
    el.value = el.value.slice(0, start) + block + el.value.slice(end)
    el.focus()
    el.selectionStart = start + 4
    el.selectionEnd   = start + 4 + sel.length
    el.dispatchEvent(new Event('input'))
  }
</script>

<template>
  <div id="chat-format-toolbar" class="chat-format-toolbar">
    <button class="fmt-btn btn-icon" title="Gras" aria-label="Gras" @click="wrap('**', '**')">
      <strong>B</strong>
    </button>
    <button class="fmt-btn btn-icon" title="Italique" aria-label="Italique" @click="wrap('*', '*')">
      <em>I</em>
    </button>
    <button class="fmt-btn btn-icon" title="Code" aria-label="Code" @click="wrap('`', '`')">
      <code style="font-size:11px">{ }</code>
    </button>
    <button class="fmt-btn btn-icon" title="Bloc de code" aria-label="Bloc de code" @click="insertCodeBlock">
      <code style="font-size:10px">```</code>
    </button>
  </div>
</template>
