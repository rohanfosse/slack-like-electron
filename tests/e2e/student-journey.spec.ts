import { test, expect } from '@playwright/test'
import { STUDENT, provisionStudent, loginAndWaitDashboard } from './helpers'

test.describe('Parcours etudiant complet', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await provisionStudent()
  })

  test('login etudiant et acces au dashboard', async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)
    await expect(page.locator('main, [data-testid="dashboard"], .dashboard, .dashboard-shell').first()).toBeVisible({ timeout: 10_000 })
  })

  test('naviguer vers messages et voir le canal general', async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)

    await page.click('a[href*="messages"], [data-testid="nav-messages"], nav >> text=/messages/i')
    await expect(page).toHaveURL(/messages/, { timeout: 10_000 })

    await page.click('text=/general/i', { timeout: 5_000 })
    await expect(
      page.locator('[class*="message"], [data-testid="message-list"], .messages').first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('envoyer un message dans general', async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)

    await page.click('a[href*="messages"], nav >> text=/messages/i')
    await expect(page).toHaveURL(/messages/, { timeout: 10_000 })
    await page.click('text=/general/i', { timeout: 5_000 })

    const messageContent = `E2E test ${Date.now()}`
    const input = page.locator('textarea, [contenteditable="true"], input[placeholder*="message" i]').first()
    await expect(input).toBeVisible({ timeout: 5_000 })
    await input.fill(messageContent)
    await input.press('Enter')

    await expect(page.locator(`text=${messageContent}`)).toBeVisible({ timeout: 5_000 })
  })

  test('naviguer vers devoirs', async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)

    await page.click('a[href*="devoirs"], nav >> text=/devoirs/i')
    await expect(page).toHaveURL(/devoirs/, { timeout: 10_000 })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5_000 })
  })

  test('naviguer vers documents', async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)

    await page.click('a[href*="documents"], nav >> text=/documents/i')
    await expect(page).toHaveURL(/documents/, { timeout: 10_000 })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 5_000 })
  })

  test('le dashboard affiche le nom de la promo', async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)
    await expect(page.locator('text=/CPI|promo/i').first()).toBeVisible({ timeout: 5_000 })
  })
})
