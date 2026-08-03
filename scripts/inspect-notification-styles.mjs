import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/features/notification-pipeline`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(300)
  const result = await page.evaluate(() => [0, 17, 22, 24].map((index) => {
    const svg = document.querySelectorAll('main svg')[index]
    const style = svg ? getComputedStyle(svg) : null
    const path = svg?.querySelector('path')
    const pathStyle = path ? getComputedStyle(path) : null
    return { index, svg: style && { display: style.display, position: style.position, verticalAlign: style.verticalAlign, lineHeight: style.lineHeight, color: style.color, fill: style.fill, overflow: style.overflow, transform: style.transform }, path: pathStyle && { fill: pathStyle.fill, stroke: pathStyle.stroke, strokeWidth: pathStyle.strokeWidth } }
  }))
  console.log(name, JSON.stringify(result))
  await page.close()
}
await browser.close()
