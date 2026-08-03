import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const route = process.env.PARITY_ROUTE || '/pages/pricing'
const name = process.env.PARITY_NAME || route.split('/').filter(Boolean).join('-') || 'root'
const outputDir = process.env.PARITY_OUTPUT_DIR || path.join(process.env.TEMP || 'C:\\tmp', 'maqsood-pharma-one-parity-20260803')
const width = Number(process.env.PARITY_WIDTH || 1366)
const height = Number(process.env.PARITY_HEIGHT || 768)
const settleMs = Number(process.env.PARITY_WAIT_MS || 250)
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
const disableMotion = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}'

async function capture(variant, baseUrl) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  try {
    await page.addInitScript((content) => {
      const style = document.createElement('style')
      style.setAttribute('data-parity-motion-reset', 'true')
      style.textContent = content
      ;(document.head || document.documentElement).appendChild(style)
    }, disableMotion)
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 30_000 })
    if (route === '/charts') await page.waitForURL((url) => url.pathname !== '/charts', { timeout: 30_000 })
    await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 30_000 })
    await page.waitForFunction(() => [...document.querySelectorAll('canvas')].every((canvas) => canvas.width > 0 && canvas.height > 0), null, { timeout: 30_000 })
    await page.evaluate(() => document.fonts?.ready)
    await page.addStyleTag({ content: disableMotion })
    await page.waitForTimeout(settleMs)
    const outputPath = path.join(outputDir, variant, `${name}-${width}x${height}.png`)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await page.screenshot({ path: outputPath, fullPage: true })
    console.log(outputPath)
  } finally {
    await page.close()
  }
}

await capture('react', 'http://127.0.0.1:4174')
await capture('svelte', 'http://127.0.0.1:5173')
await browser.close()
