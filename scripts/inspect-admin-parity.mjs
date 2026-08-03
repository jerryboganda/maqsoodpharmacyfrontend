import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
const viewportWidth = Number(process.env.PARITY_WIDTH || 1366)
const viewportHeight = Number(process.env.PARITY_HEIGHT || 768)
const selectors = ['.layout-header', 'main', 'main .animate-fade-in', 'main h1', 'main .card', 'main canvas']
for (const route of ['/dashboard', '/features/rule-engine']) {
  for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
    const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight }, deviceScaleFactor: 1 })
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
    await page.evaluate(() => document.fonts?.ready)
    const output = await page.evaluate((wanted) => Object.fromEntries(wanted.map((selector) => [selector, [...document.querySelectorAll(selector)].slice(0, 8).map((node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return { text: node.textContent?.trim().slice(0, 120), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, className: node.className, style: { padding: style.padding, margin: style.margin, borderRadius: style.borderRadius, boxShadow: style.boxShadow, fontSize: style.fontSize, lineHeight: style.lineHeight, background: style.backgroundColor } } })])), selectors)
    console.log(JSON.stringify({ route, name, output }))
    await page.close()
  }
}
await browser.close()
