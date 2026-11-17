import { chromium } from 'playwright-core'
import fs from 'node:fs'

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const errors = []
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', error => errors.push(error.message))

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
await page.screenshot({ path: 'docs/screenshots/final-1440.png', fullPage: true })

await page.setViewportSize({ width: 1280, height: 800 })
await page.waitForTimeout(500)
await page.screenshot({ path: 'docs/screenshots/final-1280.png', fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.waitForTimeout(400)

await page.locator('[data-tab="design"]').click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'docs/screenshots/final-design.png', fullPage: true })

await page.locator('[data-tab="structure"]').click()
await page.getByRole('button', { name: /飞机盒/ }).first().click()
await page.waitForTimeout(900)
await page.locator('.structure-slider input').first().evaluate(element => {
  element.value = '48'
  element.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForTimeout(800)
await page.screenshot({ path: 'docs/screenshots/final-mailer.png', fullPage: true })

await page.getByRole('button', { name: /天地盖/ }).first().click()
await page.waitForTimeout(1000)
await page.screenshot({ path: 'docs/screenshots/final-lidbase.png', fullPage: true })

await page.locator('[data-tab="export"]').click()
await page.waitForTimeout(500)
await page.screenshot({ path: 'docs/screenshots/final-export.png', fullPage: true })

async function download(name, trigger) {
  const waiting = page.waitForEvent('download', { timeout: 180000 })
  await trigger()
  const download = await waiting
  const target = `docs/samples/${name}`
  await download.saveAs(target)
  return target
}

// Return to the default tuck box for clean sample exports.
await page.locator('[data-tab="structure"]').click()
await page.getByRole('button', { name: /插口折叠盒/ }).first().click()
await page.waitForTimeout(700)
await page.locator('[data-tab="export"]').click()
await page.waitForTimeout(300)

const pdf = await download('paperform-sample-print.pdf', () => page.getByRole('button', { name: /印刷 PDF/ }).click())
const png = await download('paperform-sample-dieline.png', () => page.getByRole('button', { name: /高清 PNG/ }).click())
const svg = await download('paperform-sample-dieline.svg', () => page.getByRole('button', { name: /SVG 刀模/ }).click())
const json = await download('paperform-sample-project.json', () => page.getByRole('button', { name: /工程文件/ }).click())
for (const file of [pdf, png, svg, json]) {
  console.log(file, fs.statSync(file).size)
}
console.log('CONSOLE ERRORS', errors)
await browser.close()
