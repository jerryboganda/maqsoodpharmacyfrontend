import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const routes = [
  '/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth-card/login', '/auth-card/register', '/auth-card/forgot-password',
  '/dashboard', '/dashboard/analytics', '/dashboard/ecommerce', '/dashboard/crm', '/app/email', '/app/calendar', '/app/blog', '/app/blog/create', '/app/contacts', '/app/chat', '/app/chat/voice-call', '/app/chat/video-call', '/app/ecommerce/products', '/app/ecommerce/products/create', '/app/ecommerce/products/1', '/app/ecommerce/products/1/edit', '/app/ecommerce/checkout', '/app/notes', '/app/kanban', '/forms/layout', '/forms/validation', '/forms/editor', '/tables/simple', '/tables/data', '/tables/crud', '/charts/line', '/charts/area', '/charts/columns', '/charts/pie', '/charts/radar', '/charts/candlestick', '/pages/pricing', '/pages/account-settings', '/pages/gallery', '/pages/faq', '/pages/typography', '/features/rule-engine', '/features/query-builder', '/features/simulation', '/features/insights', '/features/workflow-builder', '/features/approval-engine', '/features/task-scheduler', '/features/notification-pipeline',
]

test('every migrated route renders without browser errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  for (const route of routes) {
    await page.goto(route)
    await expect(page.locator('body')).not.toBeEmpty()
  }
  expect(errors).toEqual([])
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

test('dashboard has no serious or critical axe violations', async ({ page }) => {
  await page.goto('/dashboard')
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
  expect(serious).toEqual([])
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
