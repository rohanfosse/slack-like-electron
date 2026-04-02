import { test, expect } from '@playwright/test'
import { STUDENT, API_BASE, provisionStudent, getTeacherToken, loginAndWaitDashboard } from './helpers'

/**
 * Provisions a published assignment for promo 1 (the E2E student's promo).
 * A fresh title with Date.now() guarantees the student has never submitted it,
 * even across repeated test runs.
 */
async function provisionPublishedDevoir(): Promise<void> {
  const token = await getTeacherToken()

  // Récupérer le premier canal de la promo de l'étudiant test
  const channelsRes = await fetch(`${API_BASE}/api/promotions/${STUDENT.promoId}/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const channelsData = (await channelsRes.json()) as { ok: boolean; data?: Array<{ id: number }> }
  if (!channelsData.ok || !channelsData.data?.length) {
    throw new Error(`Impossible de récupérer les canaux de la promo ${STUDENT.promoId}`)
  }
  const channelId = channelsData.data[0].id

  // Créer un devoir publié avec deadline dans 48 h
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const res = await fetch(`${API_BASE}/api/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: `E2E Devoir ${Date.now()}`,
      channelId,
      type: 'livrable',
      deadline,
      published: true,
      requires_submission: 1,
    }),
  })
  const data = (await res.json()) as { ok: boolean; error?: string }
  if (!data.ok) {
    throw new Error(`Provisionnement du devoir échoué : ${data.error}`)
  }
}

/**
 * Devoirs submission flow — existing tests only navigate to /devoirs without
 * testing the actual deposit workflow (button → form → link mode → submit → confirmation).
 */
test.describe('Dépôt de devoir étudiant', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await provisionStudent()
    await provisionPublishedDevoir()
  })

  test("l'étudiant dépose un lien pour un devoir publié", async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)

    // Naviguer vers les devoirs
    await page.click('a[href*="devoirs"], nav >> text=/devoirs/i')
    await expect(page).toHaveURL(/devoirs/, { timeout: 10_000 })

    // Trouver le premier bouton "Déposer" (devoir en attente de rendu)
    // StudentDevoirCard.vue : <button class="btn-primary btn-deposit">
    const depositBtn = page.locator('button.btn-deposit').first()
    await expect(depositBtn).toBeVisible({ timeout: 8_000 })
    await depositBtn.click()

    // Basculer sur le mode Lien URL dans le formulaire de dépôt
    // StudentDepositForm.vue : <button class="deposit-toggle-btn">Lien URL</button>
    const linkToggle = page.locator('button.deposit-toggle-btn:has-text("Lien URL")')
    await expect(linkToggle).toBeVisible({ timeout: 3_000 })
    await linkToggle.click()

    // Remplir l'URL
    // StudentDepositForm.vue : <input ... placeholder="https://..." type="url">
    const linkInput = page.locator('input[placeholder="https://..."]').first()
    await expect(linkInput).toBeVisible({ timeout: 3_000 })
    await linkInput.fill('https://github.com/e2e-test-submission')

    // Soumettre via le bouton dans le formulaire
    // StudentDepositForm.vue : <button class="btn-primary btn-deposit-submit">
    const submitBtn = page.locator('button.btn-deposit-submit')
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 })
    await submitBtn.click()

    // Confirmation : la carte passe en variant "submitted" → "Rendu déposé"
    await expect(page.locator('text=Rendu déposé').first()).toBeVisible({ timeout: 8_000 })
  })

})
