import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/features/notification-pipeline`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(300)
  const result = await page.evaluate(() => [...document.querySelectorAll('main svg')].map((svg, index) => {
    const rect = svg.getBoundingClientRect()
    const parent = svg.parentElement
    return { index, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, parentClass: parent?.className, outer: svg.outerHTML.slice(0, 1200) }
  }))
  console.log(name, JSON.stringify(result))
  await page.close()
}
await browser.close()
