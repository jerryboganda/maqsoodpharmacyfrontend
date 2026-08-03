import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
  await page.evaluate(() => document.fonts?.ready)
  const result = await page.evaluate(() => [...document.querySelectorAll('main .card')].slice(6, 8).flatMap((card) => [...card.querySelectorAll('p, span')]).slice(0, 30).map((node) => {
    const rect = node.getBoundingClientRect(); const style = getComputedStyle(node)
    return { tag: node.tagName, text: node.textContent?.trim(), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, className: node.className, font: { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, line: style.lineHeight, color: style.color, letter: style.letterSpacing, word: style.wordSpacing, kerning: style.fontKerning, rendering: style.textRendering, smoothing: style.webkitFontSmoothing, feature: style.fontFeatureSettings, variation: style.fontVariationSettings } }
  }))
  console.log(name, JSON.stringify(result))
  await page.close()
}
await browser.close()
