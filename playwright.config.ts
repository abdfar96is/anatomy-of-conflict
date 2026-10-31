import { defineConfig } from '@playwright/test';

// Smoke tests against the production build. Locally they use the installed Edge; CI uses Playwright's Chromium.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173', channel: process.env.CI ? undefined : 'msedge' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
