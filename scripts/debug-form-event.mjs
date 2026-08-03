import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
for (const [name, baseUrl] of [['react', 'http://127.0.0.1:4174'], ['svelte', 'http://127.0.0.1:5173']]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/forms/validation`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const before = await page.locator('.text-danger-600').count()
  const validity = await page.locator('form').evaluate((form) => ({ valid: form.checkValidity(), onsubmit: String(form.onsubmit) }))
  await page.locator('button[type="submit"]').click()
  await page.waitForTimeout(100)
  const afterClick = await page.locator('.text-danger-600').count()
  const dispatched = await page.locator('form').evaluate((form) => form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true })))
  await page.waitForTimeout(100)
  const afterDispatch = await page.locator('.text-danger-600').count()
  console.log(name, JSON.stringify({ before, validity, button: await page.locator('button[type="submit"]').first().evaluate((button) => ({ text: button.textContent, outer: button.outerHTML, rect: button.getBoundingClientRect().toJSON() })), formState: await page.locator('form').getAttribute('data-validation-state'), dispatched, afterClick, afterDispatch, errors: await page.locator('.text-danger-600').allTextContents() }))
  await page.close()
}
await browser.close()
