/**
 * Tests de la grammaire CFG (server/services/demoGrammar.js).
 *
 * Verifie qu'aucune intention ne produit de phrase vide / cassee, que
 * tous les placeholders sont resolus (pas de {SLOT} qui traine), et
 * que la duplication du contenu lexical avec src/landing/grammar.js
 * reste en sync (test de drift).
 */
process.env.NODE_ENV = 'test'

const grammar = require('../../../server/services/demoGrammar')
const fs = require('fs')
const path = require('path')

describe('demoGrammar: generateMessage', () => {
  it('produit une phrase non-vide pour chaque intention', () => {
    const intents = Object.keys(grammar.TEMPLATES)
    expect(intents.length).toBeGreaterThanOrEqual(5)
    for (const intent of intents) {
      const msg = grammar.generateMessage({ intent })
      expect(msg).toBeTruthy()
      expect(msg.length).toBeGreaterThan(2)
      // Aucun placeholder non resolu
      expect(msg).not.toMatch(/\{[A-Z_]+\}/)
    }
  })

  it('finit toujours par une ponctuation (.|!|?)', () => {
    for (let i = 0; i < 40; i++) {
      const msg = grammar.generateMessage()
      expect(msg).toMatch(/[.!?]$/)
    }
  })

  it('REPLY avec replyTo force le @mention sur le prenom donne', () => {
    for (let i = 0; i < 20; i++) {
      const msg = grammar.generateMessage({ intent: 'REPLY', replyTo: 'Emma' })
      expect(msg).toMatch(/@Emma\b/)
    }
  })

  it('produit des phrases majuscules en debut', () => {
    for (let i = 0; i < 20; i++) {
      const msg = grammar.generateMessage()
      // Le 1er char lettre doit etre en uppercase. On utilise \p{L} (Unicode
      // letter) plutot que [a-zA-Z] : sinon une phrase commencant par "À ..."
      // matche la 2e lettre minuscule et fait flake (cf. cleanup() qui ne
      // capitalise QUE charAt(0), incluant les accents).
      const firstAlpha = msg.match(/\p{L}/u)
      if (firstAlpha) {
        expect(firstAlpha[0]).toBe(firstAlpha[0].toLocaleUpperCase('fr-FR'))
      }
    }
  })

  it('rng custom rend la generation deterministe', () => {
    let i = 0
    const rng = () => {
      // Sequence pseudo deterministe pour les tests
      i = (i + 0.123) % 1
      return i
    }
    i = 0
    const a = grammar.generateMessage({ intent: 'STATUS', rng })
    i = 0
    const b = grammar.generateMessage({ intent: 'STATUS', rng })
    expect(a).toBe(b)
  })
})

describe('demoGrammar: generateConversation', () => {
  it('produit n messages d\'intentions variees', () => {
    const conv = grammar.generateConversation(20)
    expect(conv).toHaveLength(20)
    for (const msg of conv) {
      expect(msg).toBeTruthy()
      expect(msg).not.toMatch(/\{[A-Z_]+\}/)
    }
    // La diversite : sur 20 messages, on doit voir au moins 3 templates
    // distincts (sinon la combinatoire est cassee). Heuristique : prefixes
    // differents.
    const prefixes = new Set(conv.map(m => m.slice(0, 8)))
    expect(prefixes.size).toBeGreaterThanOrEqual(3)
  })
})

describe('demoGrammar: vocabulaire et templates', () => {
  it('le VOCAB a tous les slots referenced par les TEMPLATES', () => {
    const referencedSlots = new Set()
    for (const intent of Object.keys(grammar.TEMPLATES)) {
      for (const tpl of grammar.TEMPLATES[intent]) {
        const matches = tpl.match(/\{([A-Z_|]+)\}/g) || []
        for (const m of matches) {
          // Strip braces puis split sur | pour les unions {A|B}
          m.slice(1, -1).split('|').forEach(s => referencedSlots.add(s))
        }
      }
    }
    for (const slot of referencedSlots) {
      expect(grammar.VOCAB[slot]).toBeDefined()
      expect(Array.isArray(grammar.VOCAB[slot])).toBe(true)
      expect(grammar.VOCAB[slot].length).toBeGreaterThan(0)
    }
  })
})

describe('demoGrammar: anti-drift avec src/landing/grammar.js', () => {
  it('VOCAB et TEMPLATES sont identiques entre serveur et landing', () => {
    // On parse la version landing et on verifie que les listes matchent.
    // Si jamais quelqu'un edite l'un sans l'autre, le test echoue.
    const landingPath = path.resolve(__dirname, '../../../src/landing/grammar.js')
    const landingSrc = fs.readFileSync(landingPath, 'utf8')

    // Extrait VOCAB et TEMPLATES du landing en evaluant le source dans
    // un contexte fake-window.
    const fakeWindow = {}
    // eslint-disable-next-line no-new-func
    const fn = new Function('window', landingSrc)
    fn(fakeWindow)
    const landingGrammar = fakeWindow.CursusGrammar
    expect(landingGrammar).toBeDefined()

    // Compare cle a cle des VOCAB
    const serverKeys = Object.keys(grammar.VOCAB).sort()
    const landingKeys = Object.keys(landingGrammar.VOCAB).sort()
    expect(landingKeys).toEqual(serverKeys)
    for (const k of serverKeys) {
      expect(landingGrammar.VOCAB[k]).toEqual(grammar.VOCAB[k])
    }

    // Compare les TEMPLATES
    const serverIntents = Object.keys(grammar.TEMPLATES).sort()
    const landingIntents = Object.keys(landingGrammar.TEMPLATES).sort()
    expect(landingIntents).toEqual(serverIntents)
    for (const intent of serverIntents) {
      expect(landingGrammar.TEMPLATES[intent]).toEqual(grammar.TEMPLATES[intent])
    }
  })
})
