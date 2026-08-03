import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
  await page.evaluate(() => document.fonts?.ready)
  const result = await page.evaluate(() => [...document.querySelectorAll('main .card')].map((card) => ({
    heading: card.querySelector('h3')?.textContent?.trim(),
    rect: card.getBoundingClientRect().toJSON(),
    html: card.innerHTML,
  })))
  console.log(name, JSON.stringify(result.slice(4)))
  await page.close()
}
await browser.close()
