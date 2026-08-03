import { chromium } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const baseUrl = process.env.ADMINEX_BASE_URL ?? 'http://127.0.0.1:5173'
const outputDir = process.env.ADMINEX_VIEWPORT_DIR ?? path.join(os.tmpdir(), 'maqsood-pharma-svelte-viewport-20260803')
const executablePath = process.env.PLAYWRIGHT_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewports = [[375, 812], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]]
const routes = [['landing', '/'], ['dashboard', '/dashboard'], ['feature-rule-engine', '/features/rule-engine']]

mkdirSync(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })

try {
  for (const [name, route] of routes) {
    for (const [width, height] of viewports) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
      try {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 30_000 })
        await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 30_000 })
        await page.evaluate(() => document.fonts?.ready)
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
        await page.waitForTimeout(100)
        const file = path.join(outputDir, `${name}-${width}x${height}.png`)
        await page.screenshot({ path: file, fullPage: false })
        console.log(`${name} ${width}x${height} ${file}`)
      } finally {
        await page.close()
      }
    }
  }
} finally {
  await browser.close()
}
