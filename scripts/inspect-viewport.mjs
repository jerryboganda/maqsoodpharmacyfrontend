import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const baseUrl of ['http://127.0.0.1:4174', 'http://127.0.0.1:5173']) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
  await page.evaluate(() => document.fonts?.ready)
  const result = await page.evaluate(() => {
    const read = (selector) => [...document.querySelectorAll(selector)].slice(0, 3).map((node) => ({ text: node.textContent?.trim().slice(0, 80), rect: node.getBoundingClientRect().toJSON(), className: node.className }))
    return { h1: read('#top h1'), paragraph: read('#top > div.relative.z-10 p'), buttons: read('#top a'), stats: read('#top .mt-20') }
  })
  console.log(baseUrl, JSON.stringify(result))
  await page.close()
}
await browser.close()
