import { chromium } from '@playwright/test'

const cases = [
  { name: 'form-validation-error', route: '/forms/validation', action: async (page) => page.getByRole('button', { name: 'Submit', exact: true }).click() },
  { name: 'modal-crud', route: '/tables/crud', action: async (page) => page.getByRole('button', { name: 'Add row' }).click() },
  { name: 'empty-blog-search', route: '/app/blog', action: async (page) => page.locator('input[placeholder*="Search posts"]').first().fill('no matching post') },
  { name: 'not-found', route: '/does-not-exist', action: async () => undefined },
]
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const item of cases) {
  for (const [variant, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
    await page.goto(`${baseUrl}${item.route}`, { waitUntil: 'commit' })
    await page.waitForFunction(() => document.body.innerText.trim().length > 0)
    await page.evaluate(() => document.fonts?.ready)
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
    await page.waitForTimeout(1200)
    await item.action(page)
    await page.waitForTimeout(150)
    const result = await page.evaluate(() => {
      const describe = (node) => {
        const rect = node.getBoundingClientRect(); const style = getComputedStyle(node)
        return { tag: node.tagName.toLowerCase(), text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 140), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, className: typeof node.className === 'string' ? node.className : '', display: style.display, visibility: style.visibility, background: style.backgroundColor, border: style.border, shadow: style.boxShadow }
      }
      const wanted = [...document.querySelectorAll('main, main > div, main .card, main form, main [role="dialog"], main [role="alert"], main .text-danger-600, main input, main textarea, main select, body > div > div > div')]
      return { url: location.href, viewport: { innerWidth, innerHeight }, bodyText: document.body.innerText.trim().replace(/\s+/g, ' ').slice(0, 1000), scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, nodes: wanted.slice(0, 80).map(describe) }
    })
    console.log(JSON.stringify({ name: item.name, variant, result }))
    await page.close()
  }
}
await browser.close()
