import { chromium } from '@playwright/test'

const route = process.env.PARITY_ROUTE || '/tables/data'
const width = Number(process.env.PARITY_WIDTH || 375)
const height = Number(process.env.PARITY_HEIGHT || 812)
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })

async function inspect(page, baseUrl) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 })
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(250)
  return page.evaluate(() => {
    const hiddenAncestor = (node) => {
      let parent = node.parentElement
      while (parent) {
        const style = getComputedStyle(parent)
        if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'hidden' || style.overflow === 'hidden') return { tag: parent.tagName.toLowerCase(), className: typeof parent.className === 'string' ? parent.className : '', overflowX: style.overflowX }
        parent = parent.parentElement
      }
      return null
    }
    const items = [...document.querySelectorAll('body *')].map((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return { node, rect, style, parent: hiddenAncestor(node) }
    }).filter(({ rect, style, parent }) => rect.right > window.innerWidth + 1 && rect.width > 0 && style.position !== 'fixed' && !parent)
      .sort((a, b) => b.rect.right - a.rect.right)
      .slice(0, 30)
      .map(({ node, rect, style }) => ({ tag: node.tagName.toLowerCase(), text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80), className: typeof node.className === 'string' ? node.className : '', rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right }, overflowX: style.overflowX, position: style.position }))
    return { viewport: window.innerWidth, bodyScrollWidth: document.body.scrollWidth, documentScrollWidth: document.documentElement.scrollWidth, items }
  })
}

for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  try { console.log(JSON.stringify({ name, output: await inspect(page, baseUrl) })) } finally { await page.close() }
}
await browser.close()
