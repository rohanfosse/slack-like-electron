import { test, expect, type Page } from '@playwright/test'

/**
 * Test E2E : Isolation cross-promo
 *
 * Prerequis :
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *   npm run server:dev  (backend sur :3001)
 *   npm run dev:web     (frontend sur :5174)
 *   Base seedee avec 2 promos et au moins 1 etudiant par promo
 *
 * Scenario :
 *   2 etudiants de promos differentes ne voient pas les donnees de l'autre.
 *   - Promo 1 : CPI A2 Informatique (canaux: general, systemes-embarques, etc.)
 *   - Promo 2 : FISA Informatique A4 (canaux: general, big-data, iot, etc.)
 */

// Selecteurs reutilisables
const SEL = {
  emailInput: 'input[type="email"], input[placeholder*="email" i], input[name="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn: 'button[type="submit"], button:has-text("Connexion")',
}

// Credentials des etudiants de chaque promo
// En environnement de test, ces comptes doivent etre crees dans le seed
const STUDENT_A = {
  email: 'etudiant-a@cursus.school',
  password: 'etudiant123',
  promo: 'CPI A2 Informatique',
  // Canaux specifiques a la promo 1 (absents de la promo 2)
  exclusiveChannels: ['systemes-embarques', 'conception-programmation-objet', 'reseaux-systeme', 'developpement-web'],
}

const STUDENT_B = {
  email: 'etudiant-b@cursus.school',
  password: 'etudiant123',
  promo: 'FISA Informatique A4',
  // Canaux specifiques a la promo 2 (absents de la promo 1)
  exclusiveChannels: ['big-data', 'iot', 'intelligence-artificielle', 'anglais'],
}

/** Helper : connecter un utilisateur */
async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/')
  await page.fill(SEL.emailInput, email)
  await page.fill(SEL.passwordInput, password)
  await page.click(SEL.submitBtn)
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
}

/** Helper : deconnecter l'utilisateur courant */
async function logout(page: Page): Promise<void> {
  const avatarMenu = page.locator(
    '[data-testid="user-menu"], [data-testid="avatar"], .avatar-button, button[aria-label*="profil" i]',
  ).first()

  if (await avatarMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await avatarMenu.click()
  }

  const logoutBtn = page.locator(
    'button:has-text("Déconnexion"), button:has-text("Deconnexion"), [data-testid="logout"], button[aria-label*="déconnexion" i], button[aria-label*="logout" i]',
  ).first()
  await logoutBtn.click({ timeout: 5_000 })
  await expect(page.locator(SEL.emailInput)).toBeVisible({ timeout: 10_000 })
}

/** Helper : recuperer les noms de canaux visibles */
async function getVisibleChannelNames(page: Page): Promise<string[]> {
  // Naviguer vers la section messages pour voir la liste des canaux
  await page.click('a[href*="messages"], [data-testid="nav-messages"], nav >> text=/messages/i')
  await expect(page).toHaveURL(/messages/, { timeout: 10_000 })

  // Attendre que la liste de canaux soit chargee
  await page.waitForTimeout(2_000)

  // Recuperer tous les noms de canaux affiches dans la sidebar
  const channelElements = page.locator(
    '[data-testid="channel-item"], .channel-name, [class*="channel"] >> text=/\\w+/, aside li, nav li',
  )
  const texts = await channelElements.allTextContents()
  return texts.map((t) => t.trim().toLowerCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// Les tests ci-dessous necessitent un serveur demarre et une base seedee
// avec 2 promos distinctes et au moins 1 etudiant par promo.
// Ils sont marques test.skip pour ne pas echouer en CI sans infrastructure.
// Pour les executer localement : retirer le skip et lancer le serveur + seed.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Isolation cross-promo', () => {
  test.describe.configure({ mode: 'serial' })

  // SKIP : ces tests necessitent un serveur demarre avec seed data et 2 etudiants de promos differentes.
  // Retirer le skip pour execution locale avec : npx playwright test cross-promo-isolation
  test.skip(true, 'Necessite un serveur demarre avec 2 promos seedees et 1 etudiant par promo')

  let channelsStudentA: string[] = []
  let channelsStudentB: string[] = []

  test('etudiant A (promo 1) voit ses canaux', async ({ page }) => {
    await login(page, STUDENT_A.email, STUDENT_A.password)

    channelsStudentA = await getVisibleChannelNames(page)

    // L'etudiant A devrait voir au moins le canal "general"
    expect(channelsStudentA.some((c) => c.includes('general'))).toBe(true)

    // L'etudiant A devrait voir les canaux specifiques a sa promo
    for (const channel of STUDENT_A.exclusiveChannels) {
      const found = channelsStudentA.some((c) => c.includes(channel))
      expect(found, `Canal "${channel}" devrait etre visible pour l'etudiant A (promo 1)`).toBe(true)
    }
  })

  test('etudiant A se deconnecte', async ({ page }) => {
    await login(page, STUDENT_A.email, STUDENT_A.password)
    await logout(page)
  })

  test('etudiant B (promo 2) voit des canaux differents', async ({ page }) => {
    await login(page, STUDENT_B.email, STUDENT_B.password)

    channelsStudentB = await getVisibleChannelNames(page)

    // L'etudiant B devrait voir au moins le canal "general"
    expect(channelsStudentB.some((c) => c.includes('general'))).toBe(true)

    // L'etudiant B devrait voir les canaux specifiques a sa promo
    for (const channel of STUDENT_B.exclusiveChannels) {
      const found = channelsStudentB.some((c) => c.includes(channel))
      expect(found, `Canal "${channel}" devrait etre visible pour l'etudiant B (promo 2)`).toBe(true)
    }

    // L'etudiant B ne devrait PAS voir les canaux exclusifs de la promo 1
    for (const channel of STUDENT_A.exclusiveChannels) {
      const found = channelsStudentB.some((c) => c.includes(channel))
      expect(found, `Canal "${channel}" ne devrait PAS etre visible pour l'etudiant B (promo 2)`).toBe(false)
    }
  })

  test('etudiant B ne peut pas acceder aux canaux de la promo 1 par URL directe', async ({ page }) => {
    await login(page, STUDENT_B.email, STUDENT_B.password)

    // Tenter d'acceder a un canal de la promo 1 via l'URL
    // Les canaux sont identifies par ID ; on tente d'acceder au canal id=3 (systemes-embarques, promo 1)
    await page.goto('/#/messages?channel=3')
    await page.waitForTimeout(2_000)

    // Verifier que le contenu du canal n'est pas accessible
    // Soit une redirection, soit un message d'erreur, soit les messages ne s'affichent pas
    const hasError = await page.locator('text=/accès|interdit|erreur|non autorisé/i').isVisible({ timeout: 3_000 }).catch(() => false)
    const wasRedirected = !page.url().includes('channel=3')
    const noMessages = await page.locator('[data-testid="message-list"], .messages').count() === 0

    // Au moins un des mecanismes d'isolation doit fonctionner
    expect(
      hasError || wasRedirected || noMessages,
      'L\'etudiant B ne devrait pas pouvoir lire les messages d\'un canal de la promo 1',
    ).toBe(true)
  })

  test('les devoirs sont isoles par promo', async ({ page }) => {
    await login(page, STUDENT_B.email, STUDENT_B.password)

    // Naviguer vers les devoirs
    await page.click('a[href*="devoirs"], [data-testid="nav-devoirs"], nav >> text=/devoirs/i')
    await expect(page).toHaveURL(/devoirs/, { timeout: 10_000 })

    // L'etudiant B (FISA A4) ne devrait PAS voir les devoirs de la promo 1
    // Les devoirs de promo 1 contiennent des titres comme "Architectures informatiques", "Notions de POO"
    const promo1Assignments = [
      'Architectures informatiques',
      'Notions de POO',
      'Commutation / Ethernet',
      'Administration Apache',
    ]

    for (const title of promo1Assignments) {
      await expect(
        page.locator(`text=${title}`),
        `Le devoir "${title}" (promo 1) ne devrait pas etre visible pour l'etudiant B (promo 2)`,
      ).not.toBeVisible({ timeout: 2_000 })
    }
  })

  test('les devoirs de la promo 2 sont bien visibles pour l\'etudiant B', async ({ page }) => {
    await login(page, STUDENT_B.email, STUDENT_B.password)

    // Naviguer vers les devoirs
    await page.click('a[href*="devoirs"], [data-testid="nav-devoirs"], nav >> text=/devoirs/i')
    await expect(page).toHaveURL(/devoirs/, { timeout: 10_000 })

    // L'etudiant B (FISA A4) devrait voir ses propres devoirs
    // Les devoirs de promo 2 contiennent des titres comme "Architecture et infrastructure Big data"
    const promo2Assignments = [
      'Big data',
      'IoT',
      'Intelligence Artificielle',
    ]

    // Au moins une categorie de devoirs promo 2 devrait etre visible
    let foundAtLeastOne = false
    for (const keyword of promo2Assignments) {
      const visible = await page.locator(`text=/${keyword}/i`).first().isVisible({ timeout: 2_000 }).catch(() => false)
      if (visible) {
        foundAtLeastOne = true
        break
      }
    }

    expect(
      foundAtLeastOne,
      'L\'etudiant B devrait voir au moins un devoir de sa promo (FISA A4)',
    ).toBe(true)
  })
})
