import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5174',
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
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev:web',
      port: 5174,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
