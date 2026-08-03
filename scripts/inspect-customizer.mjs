import { chromium } from '@playwright/test'

const route = process.env.PARITY_ROUTE || '/tables/data'
const targets = [
  { name: 'react', baseUrl: process.env.REACT_BASE_URL || 'http://127.0.0.1:4174' },
  { name: 'svelte', baseUrl: process.env.SVELTE_BASE_URL || 'http://127.0.0.1:5173' },
]

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
    await page.goto(`${target.baseUrl}${route}`, { waitUntil: 'commit' })
    await page.waitForFunction(() => document.body?.innerText?.trim().length > 0)
    await page.waitForTimeout(350)
    const result = await page.evaluate(() => {
      const panels = [...document.querySelectorAll('[class~="w-80"][class~="fixed"]')]
      const buttons = [...document.querySelectorAll('button[aria-label]')]
        .filter((element) => /customizer/i.test(element.getAttribute('aria-label') || ''))
      const describe = (element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const parent = element.parentElement
        const parentStyle = parent ? getComputedStyle(parent) : null
        return {
          text: element.innerText.slice(0, 40),
          className: element.className,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right },
          position: style.position,
          transform: style.transform,
          overflowX: style.overflowX,
          contain: style.contain,
          parentTag: parent?.tagName,
          parentClass: parent?.className,
          parentOverflowX: parentStyle?.overflowX,
          parentTransform: parentStyle?.transform,
        }
      }
      return {
        url: location.href,
        viewport: { width: innerWidth, height: innerHeight },
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        themeTextCount: [...document.querySelectorAll('*')].filter((element) => element.textContent?.trim() === 'Theme Settings').length,
        customizerButtonCount: buttons.length,
        panelCount: panels.length,
        panels: panels.map(describe),
        htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
      }
    })
    console.log(`${target.name} ${route} ${JSON.stringify(result)}`)
    await page.close()
  }
} finally {
  await browser.close()
}
