import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
const outputRoot = process.env.FEATURE_PARITY_DIR || path.join(process.env.TEMP || 'C:\\tmp', 'maqsood-pharma-feature-parity-20260803')
const targets = [
  ['query-builder', '/features/query-builder'],
  ['simulation', '/features/simulation'],
  ['insights', '/features/insights'],
  ['workflow-builder', '/features/workflow-builder'],
  ['approval-engine', '/features/approval-engine'],
  ['task-scheduler', '/features/task-scheduler'],
  ['notification-pipeline', '/features/notification-pipeline'],
]
const viewports = [[375, 812], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]]
const disableMotion = `*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}`

for (const [name, route] of targets) {
  for (const [width, height] of viewports) {
    for (const [variant, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
      try {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
        await page.addStyleTag({ content: disableMotion })
        await page.evaluate(() => document.fonts?.ready)
        await page.waitForTimeout(100)
        const dir = path.join(outputRoot, variant)
        await fs.mkdir(dir, { recursive: true })
        await page.screenshot({ path: path.join(dir, `${name}-${width}x${height}.png`), fullPage: false })
      } finally {
        await page.close()
      }
    }
  }
}
await browser.close()
console.log(outputRoot)
