import { test, expect } from '@playwright/test'
import { STUDENT, provisionStudent, loginAndWaitDashboard } from './helpers'

/**
 * Direct-message flow — existing tests only cover channel messages (#general).
 *
 * For a student, the DM sidebar always contains the teacher(s) because
 * useSidebarData.loadStudentSidebar() merges teachers (negative IDs) with
 * classmates. useSidebarDm.dmContactsToShow() puts teachers first, so
 * .dm-item:first-child is reliably a teacher contact without seed-data assumptions.
 */
test.describe('Messages directs (DM)', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await provisionStudent()
  })

  test("l'étudiant envoie un message direct au professeur", async ({ page }) => {
    await loginAndWaitDashboard(page, STUDENT.email, STUDENT.password)

    // Naviguer vers les messages
    await page.click('a[href*="messages"], nav >> text=/messages/i')
    await expect(page).toHaveURL(/messages/, { timeout: 10_000 })

    // La liste DM est dans SidebarDmList.vue :
    //   <button class="sidebar-item dm-item" …> pour chaque contact
    // Les enseignants (id < 0) apparaissent toujours en premier pour un étudiant
    const dmContact = page.locator('.dm-item').first()
    await expect(dmContact).toBeVisible({ timeout: 5_000 })
    await dmContact.click()

    // Le champ de saisie doit être disponible (MessageInput.vue)
    const messageInput = page.locator('textarea, [contenteditable="true"]').first()
    await expect(messageInput).toBeVisible({ timeout: 5_000 })

    // Envoyer un message horodaté pour éviter les faux positifs avec des anciens messages
    const dmMessage = `DM E2E ${Date.now()}`
    await messageInput.fill(dmMessage)
    await messageInput.press('Enter')

    // Le message doit apparaître dans la conversation
    await expect(page.locator(`text=${dmMessage}`)).toBeVisible({ timeout: 8_000 })
  })

})
