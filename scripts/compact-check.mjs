import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 900, height: 760 } })
const errors = []
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', error => errors.push(error.message))
const assert = (condition, message) => {
  if (!condition) throw new Error(`ASSERT: ${message}`)
}
const workspaceClass = async () =>
  (await page.locator('[data-test="workspace"]').getAttribute('class')) ?? ''

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
const overflow = await page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
}))
assert(overflow.scroll === overflow.client, 'no horizontal overflow at 900px')
assert((await workspaceClass()).includes('layout-one-stage'), 'compact starts with stage only')
await page.screenshot({ path: 'docs/screenshots/final-compact.png', fullPage: true })

await page.getByRole('button', { name: '切换展开图视图' }).click()
await page.waitForTimeout(500)
assert((await workspaceClass()).includes('layout-one-net'), 'compact switches to 2d only')

await page.getByRole('button', { name: '切换属性面板' }).click()
await page.waitForTimeout(500)
assert((await workspaceClass()).includes('layout-one-properties'), 'compact switches to properties only')
assert(errors.length === 0, 'no console errors')
console.log('COMPACT LAYOUT OK', overflow)
await browser.close()
