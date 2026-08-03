import { chromium } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'
import { mkdirSync } from 'node:fs'

const baseUrl = process.env.ADMINEX_BASE_URL ?? 'http://127.0.0.1:5173'
const outputDir = process.env.ADMINEX_SCREENSHOT_DIR ?? path.join(os.tmpdir(), 'maqsood-pharma-svelte-final-screens')
const executablePath = process.env.PLAYWRIGHT_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const settleMs = Number(process.env.VISUAL_AUDIT_SETTLE_MS || 1200)
const viewports = [[375, 812], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]]
const allRoutes = [
  ['landing', '/'], ['auth-login', '/auth/login'], ['auth-register', '/auth/register'], ['auth-forgot', '/auth/forgot-password'],
  ['auth-card-login', '/auth-card/login'], ['auth-card-register', '/auth-card/register'], ['auth-card-forgot', '/auth-card/forgot-password'],
  ['dashboard', '/dashboard'], ['dashboard-analytics', '/dashboard/analytics'], ['dashboard-ecommerce', '/dashboard/ecommerce'], ['dashboard-crm', '/dashboard/crm'],
  ['email', '/app/email'], ['calendar', '/app/calendar'], ['blog', '/app/blog'], ['blog-create', '/app/blog/create'], ['blog-detail', '/app/blog/post-1'],
  ['contacts', '/app/contacts'], ['chat', '/app/chat'], ['voice-call', '/app/chat/voice-call'], ['video-call', '/app/chat/video-call'],
  ['products', '/app/ecommerce/products'], ['product-create', '/app/ecommerce/products/create'], ['product-detail', '/app/ecommerce/products/1'], ['product-edit', '/app/ecommerce/products/1/edit'], ['checkout', '/app/ecommerce/checkout'], ['notes', '/app/notes'], ['kanban', '/app/kanban'],
  ['forms-layout', '/forms/layout'], ['forms-validation', '/forms/validation'], ['forms-editor', '/forms/editor'], ['tables-simple', '/tables/simple'], ['tables-data', '/tables/data'], ['tables-crud', '/tables/crud'],
  ['charts-redirect', '/charts'], ['charts-line', '/charts/line'], ['charts-area', '/charts/area'], ['charts-columns', '/charts/columns'], ['charts-pie', '/charts/pie'], ['charts-radar', '/charts/radar'], ['charts-candlestick', '/charts/candlestick'],
  ['pricing', '/pages/pricing'], ['account-settings', '/pages/account-settings'], ['gallery', '/pages/gallery'], ['faq', '/pages/faq'], ['typography', '/pages/typography'],
  ['feature-rule-engine', '/features/rule-engine'], ['feature-query-builder', '/features/query-builder'], ['feature-simulation', '/features/simulation'], ['feature-insights', '/features/insights'], ['feature-workflow-builder', '/features/workflow-builder'], ['feature-approval-engine', '/features/approval-engine'], ['feature-task-scheduler', '/features/task-scheduler'], ['feature-notification-pipeline', '/features/notification-pipeline'],
]
const representativeRoutes = [
  ['landing', '/'], ['dashboard', '/dashboard'], ['auth-login', '/auth/login'], ['email', '/app/email'], ['calendar', '/app/calendar'], ['blog', '/app/blog'], ['products', '/app/ecommerce/products'], ['forms-validation', '/forms/validation'], ['tables-data', '/tables/data'], ['charts-line', '/charts/line'], ['charts-candlestick', '/charts/candlestick'], ['pricing', '/pages/pricing'], ['account-settings', '/pages/account-settings'], ['gallery', '/pages/gallery'], ['faq', '/pages/faq'], ['feature-rule-engine', '/features/rule-engine'], ['feature-notification-pipeline', '/features/notification-pipeline'],
]

mkdirSync(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const motionReset = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'

async function prepare(page, route) {
  await page.addInitScript((content) => {
    const injectMotionReset = () => {
      const style = document.createElement('style')
      style.setAttribute('data-visual-audit-motion-reset', 'true')
      style.textContent = content
      ;(document.head || document.documentElement).appendChild(style)
    }
    if (document.head || document.documentElement) injectMotionReset()
    else document.addEventListener('DOMContentLoaded', injectMotionReset, { once: true })
  }, motionReset)
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 30_000 })
  if (route === '/charts') await page.waitForURL((url) => url.pathname !== '/charts', { timeout: 30_000 })
  await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, { timeout: 30_000 })
  await page.waitForFunction(() => [...document.querySelectorAll('canvas')].every((canvas) => canvas.width > 0 && canvas.height > 0), null, { timeout: 30_000 })
  await page.evaluate(() => document.fonts?.ready)
  await page.addStyleTag({ content: motionReset })
  // Chart.js uses its own animation timeline, so wait for its default 1s
  // entrance animation after disabling CSS motion before taking a baseline.
  await page.waitForTimeout(settleMs)
}

async function capture(name, route, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  try {
    await prepare(page, route)
    const file = path.join(outputDir, `${name}-${width}x${height}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`${name} ${width}x${height} ${file}`)
  } catch (error) {
    console.error(`ERROR ${name} ${width}x${height}: ${error.message}`)
  } finally {
    await page.close()
  }
}

try {
  for (const [name, route] of allRoutes) await capture(name, route, 1366, 768)
  for (const [name, route] of representativeRoutes) {
    for (const [width, height] of viewports) await capture(name, route, width, height)
  }

  const states = [
    ['dashboard-dark-rtl-collapsed', '/dashboard', { mode: 'dark', color: 'purple', direction: 'rtl', sidebarLayout: 'vertical', sidebarCollapsed: true, container: 'full', cardStyle: 'shadow' }],
    ['dashboard-horizontal', '/dashboard', { mode: 'light', color: 'blue', direction: 'ltr', sidebarLayout: 'horizontal', sidebarCollapsed: false, container: 'full', cardStyle: 'shadow' }],
  ]
  for (const [name, route, config] of states) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
    try {
      await page.addInitScript((value) => localStorage.setItem('adminex-theme', value), JSON.stringify(config))
      await prepare(page, route)
      const file = path.join(outputDir, `${name}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(`state ${name} ${file}`)
    } catch (error) { console.error(`ERROR state ${name}: ${error.message}`) }
    finally { await page.close() }
  }

  const stateCases = [
    ['mobile-menu', '/dashboard', 375, 812, async (page) => { await page.getByRole('button', { name: /mobile menu/i }).click() }],
    ['modal-crud', '/tables/crud', 1366, 768, async (page) => { await page.getByRole('button', { name: 'Add row' }).click() }],
    ['form-validation-error', '/forms/validation', 1366, 768, async (page) => { await page.getByRole('button', { name: 'Submit', exact: true }).click() }],
    ['chart-candlestick', '/charts/candlestick', 1366, 768, async () => undefined],
    ['table-data', '/tables/data', 1366, 768, async () => undefined],
    ['empty-blog-search', '/app/blog', 1366, 768, async (page) => { await page.locator('input[placeholder*="Search posts"]').first().fill('no matching post') }],
    ['not-found', '/does-not-exist', 1366, 768, async () => undefined],
  ]
  for (const [name, route, width, height, action] of stateCases) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    try {
      await prepare(page, route)
      await action(page)
      await page.waitForTimeout(150)
      const file = path.join(outputDir, `${name}.png`)
      await page.screenshot({ path: file, fullPage: true })
      console.log(`state ${name} ${file}`)
    } catch (error) { console.error(`ERROR state ${name}: ${error.message}`) }
    finally { await page.close() }
  }
} finally {
  await browser.close()
}
