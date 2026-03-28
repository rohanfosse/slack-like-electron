import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node server/index.js',
      port: 3000,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'npm run dev:web',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
