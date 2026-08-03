import { chromium } from '@playwright/test'

const route = process.env.PARITY_ROUTE || '/tables/data'
const width = Number(process.env.PARITY_WIDTH || 375)
const height = Number(process.env.PARITY_HEIGHT || 812)
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })

async function inspect(baseUrl) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 })
    await page.evaluate(() => document.fonts?.ready)
    await page.waitForTimeout(250)
    return await page.evaluate(() => {
      const describe = (node) => {
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        return {
          tag: node.tagName.toLowerCase(),
          text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70),
          className: typeof node.className === 'string' ? node.className : '',
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
          scroll: { scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight },
          position: style.position,
          overflowX: style.overflowX,
          transform: style.transform,
          display: style.display,
        }
      }
      const top = [...document.body.children].map(describe)
      const candidates = [...document.querySelectorAll('*')]
        .map((node) => ({ node, rect: node.getBoundingClientRect(), style: getComputedStyle(node) }))
        .filter(({ node, rect }) => rect.width > 0 && (rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1))
        .sort((a, b) => Math.max(b.rect.right, b.node.scrollWidth) - Math.max(a.rect.right, a.node.scrollWidth))
        .slice(0, 50)
        .map(({ node }) => describe(node))
      return {
        viewport: { innerWidth, innerHeight },
        html: describe(document.documentElement),
        body: describe(document.body),
        top,
        candidates,
      }
    })
  } finally {
    await page.close()
  }
}

for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  console.log(name, JSON.stringify(await inspect(baseUrl)))
}
await browser.close()
