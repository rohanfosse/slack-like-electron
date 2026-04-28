/**
 * Cursus Landing - grammaire CFG pour la generation de messages.
 *
 * Version browser (IIFE) de `server/services/demoGrammar.js`. Le contenu
 * lexical (VOCAB, TEMPLATES) DOIT etre maintenu identique aux deux
 * endroits — un test CI compare les hashes pour eviter le drift.
 *
 * Expose `window.CursusGrammar` avec :
 *   - generateMessage(opts) : produit une phrase selon l'intention
 *   - generateConversation(n, opts) : produit n phrases d'intentions variees
 *   - VOCAB, TEMPLATES : pour debug
 */
;(function () {
  const VOCAB = {
    NAME: ['Emma', 'Lucas', 'Sara', 'Jean', 'Alice', 'Mehdi', 'Hugo', 'Lea', 'Ines', 'Theo'],

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

    TOPIC: [
      'la rotation double AVL', 'la complexite du tri fusion', 'CORS avec credentials',
      'argon2 vs bcrypt', 'le pattern Repository', 'JWT refresh token',
      'la migration Prisma', 'les hooks React', 'la composition Vue',
      'les promises chained', 'le balanceFactor', 'la recursivite terminale',
      'le memoization', 'l invariant AVL', 'le hashing collision',
    ],

    VERB_ACTION: [
      'implementer', 'tester', 'deployer', 'refactor', 'debugger',
      'documenter', 'review', 'merger', 'rollback', 'optimiser',
    ],
    VERB_PAST: [
      'push', 'merged', 'deploy', 'fix', 'tested', 'reviewed', 'reverted',
      'rebased', 'updated', 'rebuild',
    ],
    VERB_DONE: [
      'fini', 'merge', 'pushe', 'deploy', 'fix', 'teste', 'review',
      'documente', 'refactor', 'rebase',
    ],

    STATUS: [
      'pret pour review', 'en cours', 'bloque', 'a corriger', 'a tester',
      'merge sur main', 'en preview', 'a deployer',
    ],

    ERROR: [
      'le build plante en npm install', 'les tests CI cassent en local',
      'le loader infini sur Safari', '404 sur le push', 'CORS rejette les credentials',
      'le watcher Vite ne refresh plus', 'la migration Prisma echoue',
      'docker-compose up timeout', 'JWT expire trop tot', 'le bundle est trop gros',
    ],

    DAY: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'demain', 'apres-demain'],
    TIME: ['9h', '10h', '14h', '15h30', '17h', 'midi', '18h pile'],

    ROOM: ['B204', 'B305', 'A102', 'amphi', 'salle TP info', 'salle 2.13'],

    TOOL: [
      'GitHub Actions', 'Vite', 'Vitest', 'Docker', 'Prisma',
      'Tailwind', 'Vue 3', 'React', 'Express', 'PostgreSQL',
    ],

    ACK_SHORT: ['ok', 'noté', 'merci', '+1', 'go', 'compris', 'top', 'parfait', 'recu'],
    ACK_LONG: [
      'ok pour moi',     'ca marche',        'merci beaucoup',
      'top, je teste',   'note, on en parle',  'compris, je regarde',
    ],

    FILLER: ['du coup', 'au passage', 'vite fait', 'rapidement', 'en passant'],
    TIME_REL: ['ce soir', 'demain matin', 'aujourd hui', 'cette semaine', 'apres le cours'],
  }

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
    ACK: [
      '{ACK_SHORT}',
      '{ACK_LONG}',
    ],
  }

  function pickFrom(arr, rng) {
    if (!arr || !arr.length) return ''
    return arr[Math.floor(rng() * arr.length)]
  }

  function expand(template, vocab, rng, depth) {
    depth = depth || 0
    if (depth > 10) return template
    return template.replace(/\{([A-Z_|]+)\}/g, function (_, slotExpr) {
      const slots = slotExpr.split('|')
      const slotName = slots[Math.floor(rng() * slots.length)]
      const choices = vocab[slotName]
      if (!choices) return '{' + slotName + '}'
      return pickFrom(choices, rng)
    })
  }

  function cleanup(text) {
    if (!text) return ''
    let t = text.trim().replace(/\s+/g, ' ')
    t = t.charAt(0).toUpperCase() + t.slice(1)
    if (!/[.!?]$/.test(t)) t += '.'
    return t
  }

  function generateMessage(opts) {
    opts = opts || {}
    const rng = opts.rng || Math.random
    const intents = Object.keys(TEMPLATES)
    const intent = opts.intent && TEMPLATES[opts.intent]
      ? opts.intent
      : intents[Math.floor(rng() * intents.length)]
    const template = pickFrom(TEMPLATES[intent], rng)
    let vocab = VOCAB
    if (intent === 'REPLY' && opts.replyTo) {
      vocab = Object.assign({}, VOCAB, { NAME: [opts.replyTo] })
    }
    if (opts.extraVocab) vocab = Object.assign({}, vocab, opts.extraVocab)
    return cleanup(expand(template, vocab, rng))
  }

  function generateConversation(n, opts) {
    n = n || 5
    opts = opts || {}
    const rng = opts.rng || Math.random
    const out = []
    const weights = { ANNOUNCE: 1, QUESTION: 3, STATUS: 4, HELP: 2, ACK: 3, REPLY: 2 }
    const flat = []
    for (const k in weights) {
      for (let i = 0; i < weights[k]; i++) flat.push(k)
    }
    for (let i = 0; i < n; i++) {
      const intent = flat[Math.floor(rng() * flat.length)]
      out.push(generateMessage(Object.assign({}, opts, { intent: intent })))
    }
    return out
  }

  // Expose sur window pour utilisation par app.js
  window.CursusGrammar = {
    generateMessage: generateMessage,
    generateConversation: generateConversation,
    VOCAB: VOCAB,
    TEMPLATES: TEMPLATES,
  }
})()
