/**
 * Grammaire context-free pour la generation de messages dans la demo.
 *
 * Vocabulaire centre sur le projet web E4 + algorithmique + workflow
 * dev (CI, PR, deploy) — colle au seed CESI Licence Informatique L3.
 *
 * 6 intentions phrastiques :
 *   - ANNOUNCE  : annonce prof / rappel deadline ("Le livrable est a...")
 *   - QUESTION  : pose une question technique ("Comment X ?", "Quelqu'un a Y ?")
 *   - STATUS    : update de progression ("J'ai push X", "Tests CI passent")
 *   - HELP      : demande d'aide bloquante ("Je bloque sur X", "Y plante")
 *   - ACK       : ack court ("ok", "noté", "+1", "merci")
 *   - REPLY     : reponse a un autre ("@X {ack|response}")
 *
 * Chaque intention est une liste de templates avec placeholders {SLOT}.
 * Les SLOT sont des cles dans VOCAB qui pointent vers des arrays de
 * substitutions. Le generator pioche un template, puis remplit chaque
 * placeholder par tirage aleatoire.
 *
 * Reutilise dans :
 *   - server/services/demoBots.js (bots qui postent dans le tenant demo)
 *   - src/landing/grammar.js (chat de la landing — duplication assumee
 *     car c'est du browser JS pur, pas de require possible)
 *
 * IMPORTANT : tout changement ici DOIT etre repercute dans
 * `src/landing/grammar.js`. Un test compare les 2 fichiers en CI pour
 * eviter le drift.
 */

// ── Vocabulaire ─────────────────────────────────────────────────────
const VOCAB = {
  // ── Acteurs / mentions ──────────────────────────────────────────
  // Prenoms du seed CESI L3 (Licence Informatique)
  NAME: ['Emma', 'Lucas', 'Sara', 'Jean', 'Alice', 'Mehdi', 'Hugo', 'Lea', 'Ines', 'Theo'],

  // ── Artefacts du projet ─────────────────────────────────────────
  ARTIFACT: [
    'le projet web E4', 'le TP4 AVL', 'la PR auth', 'le rapport de stage',
    'le sujet du TP', 'la maquette Figma', 'le repo GitHub', 'le devis sprint',
    'le livrable final', 'la doc technique', 'le memoire', 'le quiz Spark',
  ],
  ARTIFACT_TECH: [
    'la branche main', 'la PR auth', 'la pipeline CI', 'le module de routing',
    'le composant Login', 'le service auth', 'le hook useAuth', 'le store user',
    'le middleware JWT', 'la config Docker', 'le workflow GitHub Actions',
  ],
  ARTIFACT_DOC: [
    'la doc API', 'le README', 'le cahier des charges', 'les tests E2E',
    'le diagramme d archi', 'le schema BDD', 'la spec OpenAPI',
  ],

  // ── Sujets de cours / topics techniques ─────────────────────────
  TOPIC: [
    'la rotation double AVL', 'la complexite du tri fusion', 'CORS avec credentials',
    'argon2 vs bcrypt', 'le pattern Repository', 'JWT refresh token',
    'la migration Prisma', 'les hooks React', 'la composition Vue',
    'les promises chained', 'le balanceFactor', 'la recursivite terminale',
    'le memoization', 'l invariant AVL', 'le hashing collision',
  ],

  // ── Verbes d action ─────────────────────────────────────────────
  VERB_ACTION: [
    'implementer', 'tester', 'deployer', 'refactor', 'debugger',
    'documenter', 'review', 'merger', 'rollback', 'optimiser',
  ],
  VERB_PAST: [
    'push', 'merged', 'deploy', 'fix', 'tested', 'reviewed', 'reverted',
    'rebased', 'updated', 'rebuild',
  ],
  // Verbe present + objet pour les status updates ("J ai X Y")
  VERB_DONE: [
    'fini', 'merge', 'pushe', 'deploy', 'fix', 'teste', 'review',
    'documente', 'refactor', 'rebase',
  ],

  // ── Etats / niveau d'avancement ─────────────────────────────────
  STATUS: [
    'pret pour review', 'en cours', 'bloque', 'a corriger', 'a tester',
    'merge sur main', 'en preview', 'a deployer',
  ],

  // ── Erreurs / problemes ─────────────────────────────────────────
  ERROR: [
    'le build plante en npm install', 'les tests CI cassent en local',
    'le loader infini sur Safari', '404 sur le push', 'CORS rejette les credentials',
    'le watcher Vite ne refresh plus', 'la migration Prisma echoue',
    'docker-compose up timeout', 'JWT expire trop tot', 'le bundle est trop gros',
  ],

  // ── Echeances temporelles ───────────────────────────────────────
  DAY: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'demain', 'apres-demain'],
  TIME: ['9h', '10h', '14h', '15h30', '17h', 'midi', '18h pile'],

  // ── Lieux / salles ──────────────────────────────────────────────
  ROOM: ['B204', 'B305', 'A102', 'amphi', 'salle TP info', 'salle 2.13'],

  // ── Outils / techno ─────────────────────────────────────────────
  TOOL: [
    'GitHub Actions', 'Vite', 'Vitest', 'Docker', 'Prisma',
    'Tailwind', 'Vue 3', 'React', 'Express', 'PostgreSQL',
  ],

  // ── Acks et expressions courtes ─────────────────────────────────
  ACK_SHORT: ['ok', 'noté', 'merci', '+1', 'go', 'compris', 'top', 'parfait', 'recu'],
  ACK_LONG: [
    'ok pour moi',     'ca marche',        'merci beaucoup',
    'top, je teste',   'note, on en parle',  'compris, je regarde',
  ],

  // ── Connecteurs / fillers ───────────────────────────────────────
  FILLER: ['du coup', 'au passage', 'vite fait', 'rapidement', 'en passant'],
  TIME_REL: ['ce soir', 'demain matin', 'aujourd hui', 'cette semaine', 'apres le cours'],
}

// ── Templates par intention ─────────────────────────────────────────
//
// Chaque template peut contenir :
//   - {SLOT}       : substitution unique (un element de VOCAB[SLOT])
//   - {SLOT|SLOT}  : substitution alternee (un des slots, choisi au hasard)
//
// Le generator etend recursivement les substitutions. Pas de cycle infini :
// on ne reference jamais une intention dans une autre, juste du VOCAB.

const TEMPLATES = {
  ANNOUNCE: [
    'Le {ARTIFACT} est a rendre {DAY} {TIME}.',
    'Rappel : {ARTIFACT} a deposer pour {DAY}.',
    'Pensez a {VERB_ACTION} {ARTIFACT_TECH} avant {DAY}.',
    'Reunion {DAY} {TIME} en {ROOM}, ordre du jour dans la doc.',
    '{ARTIFACT_DOC} est mise a jour, jetez un oeil.',
    'Pour info : on utilise {TOOL} sur ce projet.',
  ],
  QUESTION: [
    'Quelqu un a deja vu {TOPIC} ?',
    'Comment {VERB_ACTION} {ARTIFACT_TECH} ? Je vois pas.',
    'Y a une raison de partir sur {TOOL} plutot qu autre chose ?',
    'Vous prenez quoi pour {ARTIFACT_TECH} ?',
    'Question rapide : {TOPIC}, je suis perdu.',
    'Pourquoi {TOPIC} et pas l inverse ?',
    'On garde {TOOL} ou on switch ?',
    'Quelqu un est dispo pour me debugger {TOPIC} ?',
  ],
  STATUS: [
    'J ai {VERB_DONE} {ARTIFACT_TECH}.',
    '{ARTIFACT_TECH} est {STATUS}.',
    'Je {VERB_ACTION} {ARTIFACT_TECH} {TIME_REL}.',
    'Push fait sur {ARTIFACT_TECH}, attendez {TIME} pour le deploy.',
    'Tests CI passent. {ARTIFACT_TECH} est en preview.',
    'PR pretes pour review : {ARTIFACT_TECH} et {ARTIFACT_TECH}.',
    'J ai {VERB_DONE} {ARTIFACT_TECH} {FILLER}.',
  ],
  HELP: [
    'Je bloque sur {TOPIC}, qq idees ?',
    '{ERROR}, idee ?',
    'Aide : {ERROR} chez moi.',
    'Je galere avec {TOPIC} depuis ce matin.',
    'Quelqu un peut me filer un coup de main sur {ARTIFACT_TECH} ?',
    '{ERROR} en local, je sais pas pourquoi.',
  ],
  REPLY: [
    '@{NAME} {ACK_SHORT}',
    '@{NAME} {ACK_LONG}',
    '@{NAME} ouais je regarde',
    '@{NAME} bien vu',
    '@{NAME} carrement, je teste',
    '@{NAME} {FILLER}, je m en occupe',
    '@{NAME} oki, je note',
    '@{NAME} top, merci',
  ],
  // ACK pure : sans @mention, juste un fragment court
  ACK: [
    '{ACK_SHORT}',
    '{ACK_LONG}',
  ],
}

// ── Generator ───────────────────────────────────────────────────────

function pickFrom(arr, rng = Math.random) {
  if (!arr || !arr.length) return ''
  return arr[Math.floor(rng() * arr.length)]
}

/**
 * Etend les placeholders dans un template. Limite la profondeur pour
 * eviter les cycles si jamais un slot reference un autre template.
 */
function expand(template, vocab, rng = Math.random, depth = 0) {
  if (depth > 10) return template // garde-fou
  return template.replace(/\{([A-Z_|]+)\}/g, (_, slotExpr) => {
    // Support de l'union "{A|B}" : on choisit un des slots
    const slots = slotExpr.split('|')
    const slotName = slots[Math.floor(rng() * slots.length)]
    const choices = vocab[slotName]
    if (!choices) return `{${slotName}}` // visible si placeholder invalide
    return pickFrom(choices, rng)
  })
}

/**
 * Capitalise et nettoie une phrase : majuscule sur la 1re lettre Unicode
 * (saute les caracteres non-lettres en debut, ex: "404 sur le push" devient
 * "404 Sur le push"), point final si absent (pour les questions on garde "?").
 */
function cleanup(text) {
  if (!text) return ''
  let t = text.trim().replace(/\s+/g, ' ')
  // Capitalise la 1re lettre rencontree (saute chiffres, ponctuation, @, etc.)
  t = t.replace(/^([^\p{L}]*)(\p{L})/u, (_m, before, letter) => before + letter.toLocaleUpperCase('fr-FR'))
  if (!/[.!?]$/.test(t)) t += '.'
  return t
}

/**
 * Genere un message selon une intention donnee (ou aleatoire si null).
 *
 * @param {Object} opts
 * @param {string} [opts.intent] - 'ANNOUNCE'|'QUESTION'|'STATUS'|'HELP'|'ACK'|'REPLY'
 * @param {string} [opts.replyTo] - prenom a mentionner si intent === 'REPLY'
 * @param {Object} [opts.extraVocab] - vocab supplementaire pour overrides
 * @param {Function} [opts.rng] - PRNG custom (default Math.random)
 * @returns {string} message genere et nettoye
 */
function generateMessage(opts = {}) {
  const rng = opts.rng || Math.random
  const intents = Object.keys(TEMPLATES)
  const intent = opts.intent && TEMPLATES[opts.intent]
    ? opts.intent
    : intents[Math.floor(rng() * intents.length)]

  const templates = TEMPLATES[intent]
  let template = pickFrom(templates, rng)

  // Vocabulaire effectif : on overrride NAME si replyTo pour le forcer
  let vocab = VOCAB
  if (intent === 'REPLY' && opts.replyTo) {
    vocab = { ...VOCAB, NAME: [opts.replyTo] }
  }
  if (opts.extraVocab) {
    vocab = { ...vocab, ...opts.extraVocab }
  }

  return cleanup(expand(template, vocab, rng))
}

/**
 * Genere plusieurs messages d'intentions variees pour amorcer une
 * conversation. Utile pour seeder le chat ou debugger la grammaire.
 */
function generateConversation(n = 5, opts = {}) {
  const rng = opts.rng || Math.random
  const out = []
  // Distribution d'intentions plus realiste : moins d'announces, plus
  // de status/question/ack
  const weights = { ANNOUNCE: 1, QUESTION: 3, STATUS: 4, HELP: 2, ACK: 3, REPLY: 2 }
  const flat = []
  for (const [k, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) flat.push(k)
  }
  for (let i = 0; i < n; i++) {
    const intent = flat[Math.floor(rng() * flat.length)]
    out.push(generateMessage({ ...opts, intent }))
  }
  return out
}

module.exports = {
  generateMessage,
  generateConversation,
  VOCAB,
  TEMPLATES,
  expand,
  cleanup,
}
