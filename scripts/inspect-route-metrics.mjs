import { chromium } from '@playwright/test'

const route = process.env.PARITY_ROUTE || '/features/notification-pipeline'
const width = Number(process.env.PARITY_WIDTH || 1366)
const height = Number(process.env.PARITY_HEIGHT || 768)
const selectors = (process.env.PARITY_SELECTORS || 'main,main > div,main .animate-fade-in,.notification-dashboard,.notification-dashboard > *, .dashboard-content,.dashboard-overview,.stats-grid,.stat-card,.quick-actions,.channels-status,.channels-grid,.channel-status-card,.recent-notifications,.rules-overview,.dashboard-tabs,.dashboard-tabs .tab').split(',').map((value) => value.trim()).filter(Boolean)
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })

async function inspect(page, baseUrl) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit' })
  if (route === '/charts') {
    await page.waitForURL((url) => url.pathname !== '/charts', { timeout: 30_000 })
  }
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
  await page.waitForFunction(() => [...document.querySelectorAll('canvas')].every((canvas) => canvas.width > 0 && canvas.height > 0))
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(250)
  return page.evaluate((wanted) => {
    const nodeInfo = (node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return {
        tag: node.tagName.toLowerCase(),
        text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 90),
        rect: { x: Math.round(rect.x * 10) / 10, y: Math.round(rect.y * 10) / 10, width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 },
        className: typeof node.className === 'string' ? node.className : '',
        style: { display: style.display, padding: style.padding, margin: style.margin, gap: style.gap, minHeight: style.minHeight, maxWidth: style.maxWidth, borderRadius: style.borderRadius, fontSize: style.fontSize, lineHeight: style.lineHeight, overflowX: style.overflowX }
      }
    }
    const result = {}
    for (const selector of wanted) result[selector] = [...document.querySelectorAll(selector)].slice(0, 30).map(nodeInfo)
    result.__viewport = { innerWidth: window.innerWidth, innerHeight: window.innerHeight, bodyScrollWidth: document.body.scrollWidth, bodyScrollHeight: document.body.scrollHeight, documentScrollWidth: document.documentElement.scrollWidth, documentScrollHeight: document.documentElement.scrollHeight }
    return result
  }, selectors)
}

for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  try {
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' })
    console.log(JSON.stringify({ name, route, viewport: `${width}x${height}`, output: await inspect(page, baseUrl) }))
  } finally {
    await page.close()
  }
}
await browser.close()
