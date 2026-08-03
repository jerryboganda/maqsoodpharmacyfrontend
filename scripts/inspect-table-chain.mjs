import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/tables/data`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(250)
  const result = await page.evaluate(() => {
    const table = document.querySelector('table')
    const chain = []
    let node = table
    while (node) {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      chain.push({ tag: node.tagName.toLowerCase(), className: typeof node.className === 'string' ? node.className : '', rect: { x: rect.x, width: rect.width, right: rect.right }, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: style.overflowX, overflow: style.overflow, position: style.position })
      node = node.parentElement
    }
    return { scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, chain }
  })
  console.log(name, JSON.stringify(result))
  await page.close()
}
await browser.close()
