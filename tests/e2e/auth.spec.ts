import { test, expect } from '@playwright/test'

/**
 * Test E2E : Parcours d'authentification
 *
 * Prerequis :
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *   npm run server:dev  (backend sur :3000)
 *   npm run dev:web     (frontend sur :5173)
 */

test.describe('Authentification', () => {

  test('affiche la page de login', async ({ page }) => {
    await page.goto('/')
    // La page devrait afficher un formulaire de connexion
    await expect(page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('refuse un login invalide', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"], input[placeholder*="email" i], input[name="email"]', 'invalide@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"], button:has-text("Connexion")')

    // Devrait afficher un message d'erreur
    await expect(page.locator('text=/erreur|invalide|incorrect/i')).toBeVisible({ timeout: 5000 })
  })

  test('connecte un enseignant et affiche le dashboard', async ({ page }) => {
    await page.goto('/')

    // Credentials du seed : voir server/db/seed.js ou tests/backend/helpers/fixtures.js
    await page.fill('input[type="email"], input[placeholder*="email" i], input[name="email"]', 'prof@cursus.school')
    await page.fill('input[type="password"]', 'prof123')
    await page.click('button[type="submit"], button:has-text("Connexion")')

    // Apres login, devrait rediriger vers le dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

})
