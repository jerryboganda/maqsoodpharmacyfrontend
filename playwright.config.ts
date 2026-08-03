import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = process.env.ADMINEX_TEST_BASE_URL
const baseURL = externalBaseURL ?? 'http://127.0.0.1:4173'

// Local Windows dev can point at a system Chrome via PLAYWRIGHT_CHROME_PATH; unset (the default,
// and always the case in CI) falls back to Playwright's own managed Chromium binary (`npx
// playwright install --with-deps chromium`), which is the only thing guaranteed to exist on a
// GitHub Actions Linux runner -- the previous hardcoded Windows path made this config impossible
// to run in CI at all.
const chromePath = process.env.PLAYWRIGHT_CHROME_PATH

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/playwright',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    ...(chromePath ? { launchOptions: { executablePath: chromePath } } : {}),
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseURL ? undefined : {
    // Plain `npm` (not `npm.cmd`) -- Playwright spawns webServer commands through a shell, which
    // resolves the platform-correct executable on both Windows (via PATHEXT) and Linux.
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
