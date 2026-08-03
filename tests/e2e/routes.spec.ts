import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const appOrigin = process.env.ADMINEX_TEST_BASE_URL ?? 'http://127.0.0.1:4173'

const routes = [
  '/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth-card/login', '/auth-card/register', '/auth-card/forgot-password',
  '/dashboard', '/dashboard/analytics', '/dashboard/ecommerce', '/dashboard/crm', '/app/email', '/app/calendar', '/app/blog', '/app/blog/create', '/app/blog/post-1', '/app/contacts', '/app/chat', '/app/chat/voice-call', '/app/chat/video-call', '/app/ecommerce/products', '/app/ecommerce/products/create', '/app/ecommerce/products/1', '/app/ecommerce/products/1/edit', '/app/ecommerce/checkout', '/app/notes', '/app/kanban', '/forms/layout', '/forms/validation', '/forms/editor', '/tables/simple', '/tables/data', '/tables/crud', '/charts/line', '/charts/area', '/charts/columns', '/charts/pie', '/charts/radar', '/charts/candlestick', '/pages/pricing', '/pages/account-settings', '/pages/gallery', '/pages/faq', '/pages/typography', '/features/rule-engine', '/features/query-builder', '/features/simulation', '/features/insights', '/features/workflow-builder', '/features/approval-engine', '/features/task-scheduler', '/features/notification-pipeline',
]

test('every migrated route renders without browser errors', async ({ page }) => {
  const errors: string[] = []
  const failedResponses: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', (response) => {
    if (response.url().startsWith(appOrigin) && response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`)
    }
  })
  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page).toHaveTitle('Adminex - Premium Admin Dashboard')
  }
  expect(errors).toEqual([])
  expect(failedResponses).toEqual([])
})

test('charts redirect and theme/sidebar interactions persist', async ({ page }) => {
  await page.goto('/charts')
  await expect(page).toHaveURL(/\/charts\/line$/)
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Open theme customizer' }).click()
  await page.getByRole('button', { name: /Dark/ }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'RTL' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('button', { name: 'Close customizer' }).click()
})

test('every migrated route has no serious or critical non-contrast axe violations', async ({ page }) => {
  test.setTimeout(300_000)
  const serious: { route: string; id: string; impact: string | null; nodes: number }[] = []
  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('body')).not.toBeEmpty()
    await page.evaluate(async () => {
      await document.fonts.ready
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    })
    const results = await new AxeBuilder({ page }).analyze()
    serious.push(...results.violations
      // Adminex's source palette has known WCAG contrast findings. Those are
      // audited separately against React so this migration gate can detect
      // structural accessibility regressions without changing source colors.
      .filter((violation) => violation.id !== 'color-contrast' && (violation.impact === 'serious' || violation.impact === 'critical'))
      .map((violation) => ({ route, id: violation.id, impact: violation.impact ?? null, nodes: violation.nodes.length })))
  }
  expect(serious).toEqual([])
})

test('unknown nested routes use the not-found page', async ({ page }) => {
  for (const route of ['/auth/unknown', '/app/blog/nested/slug', '/app/ecommerce/products/1/extra', '/forms/unknown', '/tables/unknown', '/charts/unknown', '/pages/unknown', '/features/unknown']) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Adminex - Premium Admin Dashboard')
  }
})

test('source-visible copy and symbols remain identical', async ({ page }) => {
  await page.goto('/app/email')
  await expect(page.locator('body')).toContainText('Select an email to read')
  await expect(page.locator('body')).toContainText('Choose from your folders on the left')

  await page.goto('/app/contacts')
  await expect(page.locator('body')).toContainText('Manage your team members and contacts')
  await expect(page.getByRole('button', { name: 'Add Contact', exact: true })).toBeVisible()

  await page.goto('/app/ecommerce/products')
  await expect(page.locator('body')).toContainText('Manage your product catalog')
  await expect(page.getByRole('link', { name: 'Add Product', exact: true })).toBeVisible()

  await page.goto('/app/ecommerce/products/1')
  await expect(page.locator('body')).toContainText('$299.99')
  await expect(page.locator('body')).toContainText('•')

  await page.goto('/app/notes')
  await expect(page.locator('body')).toContainText('8 notes')

  await page.goto('/tables/simple')
  await expect(page.getByRole('heading', { name: 'Simple Table', exact: true })).toBeVisible()
  await expect(page.locator('body')).toContainText('A basic table with simple columns and status badges.')

  await page.goto('/tables/data')
  await expect(page.locator('body')).toContainText('Showing {{start}} to {{end}} of 12 results')
  await expect(page.locator('body')).toContainText('Page 1 of {{total}}')
})

test('all ten locales switch immediately and persist with RTL direction', async ({ page }) => {
  test.setTimeout(120_000)
  const locales = [
    ['en', 'Overview'], ['fr', 'Vue d’ensemble'], ['hi-IN', 'ओवरव्यू'], ['zh-CN', '概览'], ['ja', '概要'],
    ['ur', 'جائزہ'], ['pt', 'Visão geral'], ['ru', 'Обзор'], ['es', 'Resumen'], ['ar', 'نظرة عامة'],
  ] as const

  await page.goto('/dashboard')
  for (let index = 0; index < locales.length; index += 1) {
    const [locale, overview] = locales[index]
    await page.locator('[data-language-switcher] > button').click()
    await page.getByRole('menuitem').nth(index).click()
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ur' || locale === 'ar' ? 'rtl' : 'ltr')
    await expect(page.getByRole('link', { name: overview, exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('adminex-locale'))).toBe(locale)
    await page.reload()
    await expect(page.getByRole('link', { name: overview, exact: true })).toBeVisible()
  }
})

test('editor, gallery lightbox, dynamic blog, and call interactions work', async ({ page }) => {
  await page.goto('/forms/editor')
  await expect(page.getByRole('heading', { name: 'Rich Text Editor' })).toBeVisible()
  const editor = page.locator('[contenteditable="true"]').first()
  await editor.click()
  await page.keyboard.type('A local draft')
  await expect(editor).toContainText('A local draft')

  await page.goto('/pages/gallery')
  await page.getByRole('button', { name: /^Open / }).first().click()
  await expect(page.getByRole('dialog', { name: 'Gallery lightbox' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('img', { name: 'Gallery image 2' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Gallery lightbox' })).toBeHidden()

  await page.goto('/app/blog/getting-started-with-react-19')
  await expect(page.getByRole('heading', { name: 'Getting Started with React 19: A Comprehensive Guide' })).toBeVisible()

  await page.goto('/app/chat/video-call')
  await expect(page.getByRole('application', { name: 'Video call' })).toBeVisible()
  await page.getByRole('button', { name: 'Turn off camera' }).click()
  await expect(page.getByText('Camera off')).toBeVisible()
  await page.getByRole('button', { name: 'End call' }).click()
  await expect(page).toHaveURL(/\/app\/chat$/)

  await page.goto('/app/ecommerce/products/1/edit')
  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible()
  await page.getByRole('button', { name: 'Update product' }).click()
  await expect(page).toHaveURL(/\/app\/ecommerce\/products$/)
})
