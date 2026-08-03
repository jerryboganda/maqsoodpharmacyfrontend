import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
const viewports = [[375, 812], [1366, 768]]
const targets = [
  ['landing', '/', ['header', '#top', '#top h1', '#top p', '#top a[href="/dashboard"]', '#top a[href="/auth/login"]', '#top .animate-fade-in', '#top .animate-orbit']],
  ['dashboard', '/dashboard', ['.layout-header', '.layout-sidebar', 'main', 'main .animate-fade-in', 'main h1', 'main .card', 'main canvas']],
  ['feature', '/features/rule-engine', ['.layout-header', '.layout-sidebar', 'main', 'main h1', 'main .card', 'main button']],
]

async function inspect(page, baseUrl, route, selectors) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit' })
  await page.waitForFunction(() => document.body.innerText.trim().length > 0)
  await page.evaluate(() => document.fonts?.ready)
  return page.evaluate((wanted) => {
    const result = {}
    for (const selector of wanted) {
      const nodes = [...document.querySelectorAll(selector)]
      result[selector] = nodes.slice(0, 3).map((node) => {
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        return { text: node.textContent?.trim().slice(0, 80), rect: { x: Math.round(rect.x * 10) / 10, y: Math.round(rect.y * 10) / 10, width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 }, style: { borderRadius: style.borderRadius, boxShadow: style.boxShadow, animationName: style.animationName, animationDuration: style.animationDuration, transition: style.transition, fontSize: style.fontSize, lineHeight: style.lineHeight, padding: style.padding, backgroundColor: style.backgroundColor } }
      })
    }
    return result
  }, selectors)
}

for (const [name, route, selectors] of targets) {
  for (const [width, height] of viewports) {
    const react = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    const svelte = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    try {
      const [reactResult, svelteResult] = await Promise.all([
        inspect(react, 'http://127.0.0.1:4174', route, selectors),
        inspect(svelte, 'http://127.0.0.1:5173', route, selectors),
      ])
      console.log(JSON.stringify({ name, viewport: `${width}x${height}`, react: reactResult, svelte: svelteResult }))
    } finally {
      await react.close()
      await svelte.close()
    }
  }
}

await browser.close()
