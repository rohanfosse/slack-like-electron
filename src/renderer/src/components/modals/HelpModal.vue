/** HelpModal — aide contextuelle pour la saisie de messages. */
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  X, HelpCircle, Search, Keyboard, Wand2, Hash, AtSign, Slash,
  BookOpen, FileText, Bell, Megaphone, BarChart2 as BarChart2Icon,
  Table, Code2, Calendar, Minus,
} from 'lucide-vue-next'
import { SLASH_COMMANDS, COMMAND_CATEGORIES } from '@/composables/useMsgAutocomplete'

interface Props { modelValue: boolean }

defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const search = ref('')

// Icone par nom (memes mappings que MessageInput)
const CMD_ICONS: Record<string, object> = {
  BookOpen, FileText, Bell, Megaphone, BarChart2: BarChart2Icon, Table, Code2, HelpCircle, Calendar, Minus,
}

interface CmdByCategory { title: string; items: typeof SLASH_COMMANDS }

const groupedCommands = computed<CmdByCategory[]>(() => {
  const q = search.value.trim().toLowerCase()
  const filter = (c: { name: string; description: string }) =>
    !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  const byCat: Record<string, typeof SLASH_COMMANDS> = {}
  for (const cmd of SLASH_COMMANDS) {
    if (!filter(cmd)) continue
    if (!byCat[cmd.category]) byCat[cmd.category] = []
    byCat[cmd.category].push(cmd)
  }
  return Object.entries(byCat).map(([cat, items]) => ({
    title: COMMAND_CATEGORIES[cat] ?? cat,
    items,
  }))
})

interface ShortcutRow { keys: string[]; label: string }
const shortcuts: ShortcutRow[] = [
  { keys: ['Ctrl', '1'], label: 'Ouvrir le tableau de bord' },
  { keys: ['Ctrl', '2'], label: 'Ouvrir les messages' },
  { keys: ['Ctrl', '3'], label: 'Ouvrir les devoirs' },
  { keys: ['Ctrl', '4'], label: 'Ouvrir les documents' },
  { keys: ['Ctrl', 'N'], label: 'Palette de commandes' },
  { keys: ['Entree'], label: 'Envoyer le message' },
  { keys: ['Maj', 'Entree'], label: 'Saut de ligne' },
  { keys: ['Echap'], label: 'Fermer l\'autocompletion' },
]

interface MarkdownRow { syntax: string; label: string; example?: string }
const markdownRows: MarkdownRow[] = [
  { syntax: '**gras**',          label: 'Texte en gras',         example: 'important' },
  { syntax: '*italique*',        label: 'Texte en italique',     example: 'emphase' },
  { syntax: '~~barre~~',         label: 'Texte barre',           example: 'obsolete' },
  { syntax: '`code`',            label: 'Code inline',           example: 'npm install' },
  { syntax: '```js\\n...\\n```', label: 'Bloc de code colore' },
  { syntax: '> citation',        label: 'Citation' },
  { syntax: '- liste',           label: 'Liste a puces' },
  { syntax: '1. liste',          label: 'Liste numerotee' },
  { syntax: '[texte](url)',      label: 'Lien hypertexte' },
  { syntax: '---',               label: 'Separateur horizontal' },
]

interface TriggerRow { key: string; icon: object; label: string }
const triggers: TriggerRow[] = [
  { key: '@nom',    icon: AtSign,  label: 'Mentionner un utilisateur (notification)' },
  { key: '#canal',  icon: Hash,    label: 'Referencer un canal' },
  { key: '/cmd',    icon: Slash,   label: 'Ouvrir le menu des commandes' },
  { key: '\\titre', icon: BookOpen, label: 'Referencer un devoir' },
]

function close() { emit('update:modelValue', false) }
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="help-modal" role="dialog" aria-modal="true" aria-label="Aide">

          <div class="help-header">
            <HelpCircle :size="18" class="help-header-icon" />
            <div>
              <h2 class="help-title">Aide Cursus</h2>
              <p class="help-sub">Syntaxe, commandes et raccourcis clavier</p>
            </div>
            <button class="btn-icon help-close" aria-label="Fermer" @click="close"><X :size="16" /></button>
          </div>

          <!-- Barre de recherche -->
          <div class="help-search">
            <Search :size="14" class="help-search-icon" />
            <input
              v-model="search"
              class="help-search-input"
              type="text"
              placeholder="Rechercher une commande..."
              aria-label="Rechercher dans l'aide"
              @keydown.escape="close"
            />
          </div>

          <div class="help-body">

            <!-- Declencheurs rapides -->
            <section class="help-section">
              <h3 class="help-section-title"><Wand2 :size="13" /> Declencheurs rapides</h3>
              <ul class="help-list">
                <li v-for="t in triggers" :key="t.key" class="help-row">
                  <span class="help-kbd help-kbd--trigger">
                    <component :is="t.icon" :size="11" />
                    {{ t.key }}
                  </span>
                  <span class="help-row-label">{{ t.label }}</span>
                </li>
              </ul>
            </section>

            <!-- Slash commands -->
            <section v-for="group in groupedCommands" :key="group.title" class="help-section">
              <h3 class="help-section-title"><Slash :size="13" /> {{ group.title }}</h3>
              <ul class="help-list">
                <li v-for="cmd in group.items" :key="cmd.name" class="help-row help-row--cmd">
                  <span class="help-cmd-pill" :style="{ color: cmd.color, borderColor: cmd.color }">
                    <component :is="CMD_ICONS[cmd.icon] || HelpCircle" :size="11" />
                    /{{ cmd.name }}
                  </span>
                  <span class="help-row-label">{{ cmd.description }}</span>
                </li>
              </ul>
            </section>

            <!-- Markdown -->
            <section v-if="!search" class="help-section">
              <h3 class="help-section-title"><FileText :size="13" /> Formatage markdown</h3>
              <ul class="help-list">
                <li v-for="row in markdownRows" :key="row.syntax" class="help-row">
                  <code class="help-kbd help-kbd--md">{{ row.syntax }}</code>
                  <span class="help-row-label">{{ row.label }}</span>
                </li>
              </ul>
            </section>

            <!-- Raccourcis clavier -->
            <section v-if="!search" class="help-section">
              <h3 class="help-section-title"><Keyboard :size="13" /> Raccourcis clavier</h3>
              <ul class="help-list">
                <li v-for="sc in shortcuts" :key="sc.label" class="help-row">
                  <span class="help-kbd-group">
                    <kbd v-for="(k, i) in sc.keys" :key="k" class="help-kbd">
                      {{ k }}<span v-if="i < sc.keys.length - 1" class="help-kbd-plus">+</span>
                    </kbd>
                  </span>
                  <span class="help-row-label">{{ sc.label }}</span>
                </li>
              </ul>
            </section>

            <p v-if="groupedCommands.length === 0 && search" class="help-empty">
              Aucune commande ne correspond a "{{ search }}".
            </p>

          </div>

          <div class="help-footer">
            <span class="help-footer-hint">
              Astuce : tapez <kbd class="help-kbd">/</kbd> dans la zone de message pour ouvrir ce menu contextuel.
            </span>
            <button class="btn-primary" @click="close">Fermer</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity var(--motion-fast) var(--ease-out); }
.modal-fade-enter-from,  .modal-fade-leave-to      { opacity: 0; }

.help-modal {
  width: 100%; max-width: 580px;
  background: var(--bg-modal);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 56px rgba(0,0,0,.65);
  display: flex; flex-direction: column; overflow: hidden;
  max-height: 86vh;
}

.help-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
.help-header-icon { color: var(--accent); flex-shrink: 0; }
.help-title { font-size: 15px; font-weight: 800; color: var(--text-primary); }
.help-sub   { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }
.help-close { margin-left: auto; color: var(--text-muted); flex-shrink: 0; }
.help-close:hover { color: var(--text-primary); }

.help-search {
  position: relative;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elevated);
}
.help-search-icon {
  position: absolute; left: 30px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none;
}
.help-search-input {
  width: 100%;
  background: var(--bg-main);
  border: 1.5px solid var(--border-input);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font); font-size: 13px;
  padding: 8px 12px 8px 32px;
  outline: none;
  transition: border-color .15s;
}
.help-search-input:focus { border-color: var(--accent); }

.help-body {
  padding: 8px 18px 18px;
  overflow-y: auto; flex: 1;
}

.help-section { margin-top: 16px; }
.help-section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 800; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .06em;
  margin: 0 0 8px 0;
}
.help-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.help-row {
  display: grid; grid-template-columns: auto 1fr; gap: 12px;
  align-items: center;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
}
.help-row:hover { background: var(--bg-hover); }

.help-row-label { font-size: 12.5px; color: var(--text-primary); line-height: 1.35; }

.help-kbd {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px; font-weight: 600;
  padding: 2px 7px; border-radius: 5px;
  background: var(--bg-hover);
  border: 1px solid var(--border-input);
  color: var(--text-primary);
  white-space: nowrap;
}
.help-kbd--md { font-family: ui-monospace, Menlo, Consolas, monospace; }
.help-kbd--trigger {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, var(--border-input));
  color: var(--accent);
}
.help-kbd-group { display: inline-flex; align-items: center; gap: 3px; }
.help-kbd-plus { opacity: .5; margin: 0 2px; }

.help-cmd-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 11.5px; font-weight: 700;
  padding: 3px 8px; border-radius: 999px;
  background: transparent;
  border: 1.5px solid currentColor;
  white-space: nowrap;
}

.help-empty {
  text-align: center; color: var(--text-muted);
  font-size: 13px; padding: 24px 0;
}

.help-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}
.help-footer-hint {
  font-size: 11.5px; color: var(--text-muted); flex: 1; line-height: 1.4;
}
</style>
