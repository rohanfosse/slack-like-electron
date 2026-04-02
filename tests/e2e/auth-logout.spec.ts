import { test, expect } from '@playwright/test'
import { TEACHER, SEL, loginAndWaitDashboard } from './helpers'

/**
 * Logout flow — not covered by auth.spec.ts (which only tests login).
 * Flow : login as teacher → open Settings modal via avatar → click
 * "Se deconnecter" → verify the login form re-appears.
 */
test.describe('Déconnexion', () => {

  test('déconnecte un enseignant et retourne sur la page de login', async ({ page }) => {
    await loginAndWaitDashboard(page, TEACHER.email, TEACHER.password)

    // Ouvrir le modal Paramètres via l'avatar (bas du rail de navigation)
    await page.click('#nav-user-avatar, button[aria-label="Paramètres du compte"]')

    // Cliquer sur "Se deconnecter" dans la nav latérale du modal (SettingsModal.vue)
    // Note : le texte est intentionnellement sans accent dans le template Vue
    const logoutBtn = page.locator('button:has-text("Se deconnecter")')
    await expect(logoutBtn).toBeVisible({ timeout: 5_000 })
    await logoutBtn.click()

    // L'overlay de login doit réapparaître (appStore.currentUser === null)
    await expect(page.locator(SEL.emailInput).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator(SEL.passwordInput).first()).toBeVisible({ timeout: 5_000 })
  })

})
