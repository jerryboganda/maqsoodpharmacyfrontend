import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
  await page.evaluate(() => document.fonts?.ready)
  const result = await page.evaluate(() => [...document.querySelectorAll('main .card svg')].map((svg) => {
    const style = getComputedStyle(svg)
    const rect = svg.getBoundingClientRect()
    return { outer: svg.outerHTML, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, style: { display: style.display, position: style.position, verticalAlign: style.verticalAlign, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color, fill: style.fill, stroke: style.stroke, transform: style.transform, overflow: style.overflow } }
  }))
  console.log(name, JSON.stringify(result))
  await page.close()
}
await browser.close()
