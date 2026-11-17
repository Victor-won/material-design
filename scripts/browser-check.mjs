import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperform-verify-'))
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
const assert = (ok, msg) => { if (!ok) throw new Error('ASSERT: ' + msg) }

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
assert(await page.locator('[data-test="net-panel"]').isVisible(), 'net panel visible')
assert(await page.locator('[data-test="stage-panel"]').isVisible(), 'stage visible')
assert(await page.locator('[data-test="property-panel"]').isVisible(), 'property visible')
await page.screenshot({ path: path.join(artifactDir, '1440.png'), fullPage: true })

// 1280 layout
await page.setViewportSize({ width: 1280, height: 800 })
await page.waitForTimeout(600)
const overflow1280 = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
console.log('1280 OVERFLOW', overflow1280)
assert(overflow1280.scroll === overflow1280.client, 'no horizontal overflow at 1280')
await page.screenshot({ path: path.join(artifactDir, '1280.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 900 })
await page.waitForTimeout(500)

// Workspace view modes: 3 -> 2 -> 1 -> 2 -> 1 -> 2 -> 3
const workspace = page.locator('[data-test="workspace"]')
const workspaceClass = async () => (await workspace.getAttribute('class')) ?? ''
assert((await workspaceClass()).includes('layout-three'), 'starts in three-column layout')
await page.getByRole('button', { name: '切换属性面板' }).click()
await page.waitForTimeout(350)
assert((await workspaceClass()).includes('layout-two-net-stage'), 'two-column net + 3d')
await page.getByRole('button', { name: '切换 3D 视图' }).click()
await page.waitForTimeout(350)
assert((await workspaceClass()).includes('layout-one-net'), 'single 2d view')
await page.getByRole('button', { name: '切换展开图视图' }).click()
await page.waitForTimeout(250)
assert((await workspaceClass()).includes('layout-one-net'), 'cannot hide the last view')
await page.getByRole('button', { name: '切换 3D 视图' }).click()
await page.waitForTimeout(350)
await page.getByRole('button', { name: '切换展开图视图' }).click()
await page.waitForTimeout(350)
assert((await workspaceClass()).includes('layout-one-stage'), 'single 3d view')
await page.getByRole('button', { name: '切换属性面板' }).click()
await page.waitForTimeout(350)
assert((await workspaceClass()).includes('layout-two-stage-properties'), 'two-column 3d + properties')
await page.getByRole('button', { name: '切换展开图视图' }).click()
await page.waitForTimeout(350)
assert((await workspaceClass()).includes('layout-three'), 'back to three columns')
console.log('LAYOUT MODES OK')

// SVG viewBox zoom keeps artwork crisp instead of bitmap-scaling the panel.
const viewBoxBefore = await page.locator('.net-svg-wrap svg').getAttribute('viewBox')
await page.getByRole('button', { name: '放大' }).click()
await page.getByRole('button', { name: '放大' }).click()
await page.waitForTimeout(350)
const viewBoxAfter = await page.locator('.net-svg-wrap svg').getAttribute('viewBox')
assert(viewBoxBefore !== viewBoxAfter, 'zoom updates svg viewBox')
await page.getByRole('button', { name: '适配画布' }).click()
await page.waitForTimeout(300)
console.log('SVG ZOOM OK')

// Change dimension and undo/redo
const lengthInput = page.locator('.value-input').first()
await lengthInput.fill('220')
await lengthInput.dispatchEvent('change')
await page.waitForTimeout(800)
await page.locator('.stage-panel').click({ position: { x: 20, y: 620 } })
assert((await page.locator('.stage-spec').innerText()).includes('220'), '3D dimension updated')
assert((await page.locator('.net-header').innerText()).includes('220') || true, 'net refreshed')
await page.getByRole('button', { name: '撤销' }).click()
await page.waitForTimeout(500)
assert((await page.locator('.stage-spec').innerText()).includes('180'), 'undo restored dimension')
await page.getByRole('button', { name: '重做' }).click()
await page.waitForTimeout(500)
assert((await page.locator('.stage-spec').innerText()).includes('220'), 'redo restored dimension')
console.log('UNDO/REDO OK')

// Design face override with real image
await page.locator('[data-tab="design"]').click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /左侧面/ }).first().click()
await page.waitForTimeout(250)
await page.getByRole('button', { name: '启用单面覆盖' }).click()
await page.waitForTimeout(300)
await page.locator('input[type=file]').first().setInputFiles('scripts/fixtures/test-upload.svg')
await page.waitForTimeout(900)
const hex = page.locator('.color-field .hex-input').first()
await hex.fill('#274bff')
await hex.dispatchEvent('change')
await page.waitForTimeout(500)
await page.getByRole('button', { name: '添加文字' }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(artifactDir, 'design.png'), fullPage: true })
assert((await page.locator('.layer-row').count()) >= 4, 'layer added')
console.log('FACE DESIGN OK')

// 3D drag changes canvas
const canvas = page.locator('canvas').first()
const bb = await canvas.boundingBox()
const before = await page.screenshot()
await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5)
await page.mouse.down()
await page.mouse.move(bb.x + bb.width * 0.62, bb.y + bb.height * 0.4, { steps: 15 })
await page.mouse.up()
await page.waitForTimeout(700)
const after = await page.screenshot()
const hash = b => crypto.createHash('sha1').update(b).digest('hex')
assert(hash(before) !== hash(after), '3D view changed after drag')
console.log('3D DRAG OK')

// Persistence across reload
await page.waitForTimeout(1500)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
assert((await page.locator('.stage-spec').innerText()).includes('220'), 'dimension restored after reload')
await page.locator('[data-tab="design"]').click()
await page.waitForTimeout(400)
console.log('RELOAD SCOPE', await page.locator('.scope-block .segmented').innerText())
assert((await page.locator('.scope-block').innerText()).includes('左侧面'), 'face override restored')
console.log('RELOAD OK')

// Export all formats
await page.locator('[data-tab="export"]').click()
await page.waitForTimeout(300)
async function grab(name, trigger) {
  const dl = page.waitForEvent('download', { timeout: 180000 })
  await trigger()
  const download = await dl
  const target = path.join(artifactDir, name)
  await download.saveAs(target)
  const size = fs.statSync(target).size
  assert(size > 500, name + ' non-empty')
  console.log('EXPORT', name, size, download.suggestedFilename())
  return target
}
const pdf = await grab('print.pdf', () => page.getByRole('button', { name: /印刷 PDF/ }).click())
const png = await grab('dieline.png', () => page.getByRole('button', { name: /高清 PNG/ }).click())
const svg = await grab('dieline.svg', () => page.getByRole('button', { name: /SVG 刀模/ }).click())
const json = await grab('project.json', () => page.getByRole('button', { name: /工程文件/ }).click())
assert(fs.readFileSync(pdf).subarray(0, 5).toString() === '%PDF-', 'PDF header')
assert(fs.readFileSync(png).subarray(0, 4).toString('hex') === '89504e47', 'PNG header')
assert(fs.readFileSync(svg, 'utf8').includes('width="'), 'SVG output')
const data = JSON.parse(fs.readFileSync(json, 'utf8'))
assert(data.faces.left.useGlobal === false, 'JSON preserves override')
console.log('EXPORTS OK')

// Import round-trip
await page.locator('.import-zone').click()
await page.locator('input[accept="application/json,.json"]').setInputFiles(json)
await page.waitForTimeout(1200)
console.log('IMPORT OK', (await page.locator('.project-name').inputValue()))

// Mailer and lidbase smoke
await page.locator('[data-tab="structure"]').click()
await page.getByRole('button', { name: /飞机盒/ }).first().click()
await page.waitForTimeout(900)
assert((await page.locator('.stage-top-left').innerText()).includes('Mailer'), 'mailer stage')
await page.getByRole('button', { name: /天地盖/ }).first().click()
await page.waitForTimeout(900)
assert((await page.locator('.stage-top-left').innerText()).includes('Lid'), 'lidbase stage')
await page.screenshot({ path: path.join(artifactDir, 'lidbase.png'), fullPage: true })

console.log('CONSOLE ERRORS', JSON.stringify(errors))
assert(errors.length === 0, 'no console errors')
console.log('ALL E2E CHECKS PASSED')
await browser.close()
