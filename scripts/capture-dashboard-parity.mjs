import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
const outputRoot = path.join(process.env.TEMP || 'C:\\tmp', 'maqsood-pharma-dashboard-parity-20260803')
for (const [width, height] of [[375, 812], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]]) {
  for (const [variant, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    try {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
      await page.evaluate(() => document.fonts?.ready)
      await page.waitForTimeout(100)
      const dir = path.join(outputRoot, variant)
      await fs.mkdir(dir, { recursive: true })
      await page.screenshot({ path: path.join(dir, `dashboard-${width}x${height}.png`), fullPage: false })
    } finally { await page.close() }
  }
}
await browser.close()
console.log(outputRoot)
