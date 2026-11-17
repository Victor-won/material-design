# PAPERFORM 纸盒设计器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, browser-based paper-box studio with a live SVG dieline, draggable 3D preview, per-face artwork design, and print-ready exports.

**Architecture:** A Vue 3 single-page app with one Pinia project store feeding three renderers: SVG net, Canvas artwork compositor, and Three.js box scene. A pure box-model generator owns all mm geometry; exporters reuse the same project and net data. UI is split into a fixed header plus three independently scrolling panels.

**Tech Stack:** Vue 3, Vite 8, TypeScript 5.9, Pinia, Three.js, jsPDF, lucide-vue-next, @fontsource-variable fonts, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-paper-box-designer-design.md`

## Global Constraints

- All physical values are millimetres; UI shows `mm` explicitly.
- Box dimensions are clamped to 30–600mm; paper thickness 0.3–3.0mm; bleed and safe area 0–5mm (default 3mm).
- Only three box types: `tuck`, `mailer`, `lidbase`.
- Design surfaces: tuck 6 faces, mailer 9 faces, lidbase 10 faces, exactly as listed in the spec.
- Artwork inheritance rule: `useGlobal === true` or no record → global artwork; otherwise the face artwork.
- Local fonts only. No runtime Google Fonts requests.
- Desktop-first; no horizontal overflow at 1440×900 or 1280×800.
- Images uploaded from disk are compressed to max 2000px longest edge.
- Every icon-only button has `aria-label`; every input has a label.
- Respect `prefers-reduced-motion`.
- Do not use `innerHTML` with untrusted user text outside escaped SVG generation.
- Commit after each task once the task’s tests pass.

---

### Task 1: Scaffold, tokens, and app shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.ts`, `src/App.vue`, `src/env.d.ts`
- Create: `src/styles/tokens.css`, `src/styles/base.css`
- Create: `src/components/AppHeader.vue`
- Create: `src/components/PlaceholderPanel.vue`
- Test: `src/__tests__/App.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: app shell with header and three named slots (`net`, `stage`, `properties`) sized by CSS grid.

- [ ] **Step 1: Initialize project and dependencies**

```bash
git init
pnpm add vue pinia three jspdf lucide-vue-next @fontsource-variable/manrope @fontsource-variable/newsreader
pnpm add -D vite @vitejs/plugin-vue typescript@^5.9.3 vue-tsc vitest @vue/test-utils jsdom @types/three
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Write the failing shell test**

```ts
import { mount } from '@vue/test-utils'
import App from '../App.vue'

it('renders brand, dieline panel and 3d stage', () => {
  const wrapper = mount(App)
  expect(wrapper.text()).toContain('PAPERFORM')
  expect(wrapper.find('[data-test="net-panel"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="stage-panel"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="property-panel"]').exists()).toBe(true)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/App.spec.ts`
Expected: FAIL because `App.vue` does not exist.

- [ ] **Step 4: Implement tokens and shell**

Design tokens must include:

```css
:root {
  --ink: #121210;
  --paper: #f4f0e6;
  --panel: #fbf8f1;
  --line: #d9d2c3;
  --muted: #746e62;
  --accent: #ff4d1f;
  --fold: #2b4cff;
  --stage: #151713;
  --stage-2: #38382f;
  --success: #2e7d5b;
  --font-ui: 'Manrope Variable', 'PingFang SC', sans-serif;
  --font-display: 'Newsreader Variable', 'Songti SC', serif;
}
```

Shell requirements:

- Header height 64px, ink background, folded-paper logomark, `PAPERFORM` wordmark, project name, save status, undo/redo, orange `导出` button.
- Body grid: `grid-template-columns: var(--left) minmax(460px, 1fr) var(--right)`.
- ≥1440px: `--left: 400px; --right: 388px`.
- 1280–1439px: `--left: 360px; --right: 360px`.
- 1024–1279px: left panel collapses to a drawer toggle; center/right remain.
- Import fontsource CSS in `main.ts`.
- Panels have `data-test` attributes from the test.

- [ ] **Step 5: Run test and build**

Run: `pnpm test -- src/__tests__/App.spec.ts && pnpm build`
Expected: test PASS and production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold PAPERFORM studio shell"
```

---

### Task 2: Project model, store, inheritance, history, storage

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/materials.ts`
- Create: `src/core/defaultProject.ts`
- Create: `src/core/artwork.ts` (pure helpers only in this task)
- Create: `src/core/validation.ts`
- Create: `src/core/history.ts`
- Create: `src/core/storage.ts`
- Create: `src/stores/designer.ts`
- Test: `src/__tests__/project.spec.ts`

**Interfaces:**
- Consumes: `Project`/`Artwork` types from spec.
- Produces:
  - `createDefaultProject(): Project`
  - `resolveArtwork(project: Project, faceId: FaceId): Artwork`
  - `withArtworkFor(project: Project, faceId: FaceId | 'global', updater: (a: Artwork) => Artwork): Project`
  - `enableFaceOverride(project: Project, faceId: FaceId): Project`
  - `syncFaceToGlobal(project: Project, faceId: FaceId): Project`
  - `validateProject(input: unknown): Project`
  - `useDesignerStore()` with `project`, `ui`, `designRevision`, `selectedFace`, `setSelectedFace`, `commit(mutator)`, `undo`, `redo`, `newProject`, `loadProject`.
  - `saveProjectToDb(project): Promise<void>`, `loadProjectFromDb(): Promise<Project | null>`.

- [ ] **Step 1: Write failing inheritance and validation tests**

```ts
import { createDefaultProject, enableFaceOverride, resolveArtwork, syncFaceToGlobal } from '../core/defaultProject'
import { withArtworkFor } from '../core/artwork'
import { validateProject } from '../core/validation'

it('inherits global artwork until an override is enabled', () => {
  let p = createDefaultProject()
  p = withArtworkFor(p, 'global', a => ({ ...a, color: '#112233' }))
  expect(resolveArtwork(p, 'front').color).toBe('#112233')
  p = enableFaceOverride(p, 'front')
  expect(resolveArtwork(p, 'front').useGlobal).toBe(false)
  p = withArtworkFor(p, 'front', a => ({ ...a, color: '#ff0000' }))
  expect(resolveArtwork(p, 'front').color).toBe('#ff0000')
  expect(resolveArtwork(p, 'back').color).toBe('#112233')
})

it('syncs the current face to every face', () => {
  let p = createDefaultProject()
  p = enableFaceOverride(p, 'front')
  p = withArtworkFor(p, 'front', a => ({ ...a, color: '#abcdef' }))
  p = syncFaceToGlobal(p, 'front')
  expect(p.globalDesign.color).toBe('#abcdef')
  expect(resolveArtwork(p, 'back').color).toBe('#abcdef')
})

it('rejects malformed project data', () => {
  expect(() => validateProject({ schemaVersion: 99 })).toThrow(/schemaVersion/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/project.spec.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement types, materials, defaults, store**

Required materials table:

| id | label | baseColor | roughness | texture |
|---|---|---|---|---|
| white-card | 白卡 350g | `#f2eee4` | 0.86 | none |
| kraft | 牛皮卡 300g | `#c99d68` | 0.92 | fiber |
| corrugated | 瓦楞 E 楞 | `#c7a878` | 0.95 | flute |
| black-card | 黑卡 350g | `#1f1e1b` | 0.88 | none |
| recycled | 再生纸 300g | `#d8d3c5` | 0.94 | linen |

Default project: tuck, 180×90×60mm, kraft, matte, 0.6mm, global design with base `#d8b98a`, Newsreader `PAPERFORM` at 10mm and Manrope `OBJECTS FOR EVERYDAY` at 3.2mm. The artwork must not include remote assets.

History implementation:

```ts
export function pushHistory(stack: Project[], next: Project, limit = 30): Project[] {
  const copy = [...stack, structuredClone(next)]
  return copy.slice(Math.max(0, copy.length - limit))
}
```

Store requirements:

- `commit(mutator)` clones project, applies mutation, sets `updatedAt`, increments `designRevision`, pushes previous to undo, clears redo, schedules autosave.
- Continuous edits merge when within 300ms and same mutation key.
- `undo`/`redo` swap project snapshots.
- `setSelectedFace` is UI-only.
- Autosave is debounced 700ms and catches IndexedDB errors, setting `ui.saveState = 'session-only'`.
- Initial load calls `loadProjectFromDb()` then `validateProject`; failure loads default and shows an error toast.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test -- src/__tests__/project.spec.ts && pnpm exec vue-tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core src/stores src/__tests__
git commit -m "feat: add project model, inheritance and persistence"
```

---

### Task 3: Box geometry generator and three dielines

**Files:**
- Create: `src/core/boxes/types.ts`
- Create: `src/core/boxes/helpers.ts`
- Create: `src/core/boxes/tuck.ts`
- Create: `src/core/boxes/mailer.ts`
- Create: `src/core/boxes/lidbase.ts`
- Create: `src/core/boxes/index.ts`
- Test: `src/__tests__/boxes.spec.ts`

**Interfaces:**
- Consumes: `Project` box type, dimensions, lid height/gap.
- Produces:

```ts
export interface Point { x: number; y: number }

export interface NetPanel {
  id: string
  faceId?: FaceId
  points: Point[]
  artRect: { x: number; y: number; w: number; h: number }
  kind: 'panel' | 'flap' | 'glue'
  label?: string
}

export interface NetModel {
  width: number
  height: number
  panels: NetPanel[]
  folds: { x1: number; y1: number; x2: number; y2: number }[]
  dimensions: { x1: number; y1: number; x2: number; y2: number; label: string }[]
  labels: { x: number; y: number; text: string; size?: number }[]
  sections: { x: number; y: number; label: string }[]
}

export interface SceneFace {
  id: string
  faceId: FaceId
  width: number
  height: number
  position: [number, number, number]
  rotation: [number, number, number]
  group?: 'lid'
}

export interface SceneGroup {
  id: 'lid'
  position: [number, number, number]
  pivot: [number, number, number]
}

export interface BoxModel {
  type: BoxType
  name: string
  nameEn: string
  net: NetModel
  faces: SceneFace[]
  groups: SceneGroup[]
  bodyHeight: number
  lidHeight: number
  lidGap: number
  faceInfo: { id: FaceId; label: string }[]
}

export function buildBoxModel(project: Project): BoxModel
export function getFaceInfo(type: BoxType): { id: FaceId; label: string }[]
```

- [ ] **Step 1: Write failing geometry tests**

```ts
import { buildBoxModel } from '../core/boxes'
import { createDefaultProject } from '../core/defaultProject'

it.each(['tuck', 'mailer', 'lidbase'] as const)('builds a complete net for %s', type => {
  const p = { ...createDefaultProject(), boxType: type }
  const model = buildBoxModel(p)
  expect(model.net.width).toBeGreaterThan(100)
  expect(model.net.height).toBeGreaterThan(100)
  expect(model.net.panels.length).toBeGreaterThan(4)
  expect(model.net.folds.length).toBeGreaterThan(3)
  expect(model.net.panels.some(panel => panel.kind === 'glue')).toBe(true)
  expect(model.faces.length).toBeGreaterThanOrEqual(6)
})

it('keeps face ids valid for each box type', () => {
  const tuck = buildBoxModel({ ...createDefaultProject(), boxType: 'tuck' })
  expect(new Set(tuck.faces.map(f => f.faceId))).toEqual(
    new Set(['front', 'back', 'left', 'right', 'top', 'bottom'])
  )
  const lidbase = buildBoxModel({ ...createDefaultProject(), boxType: 'lidbase' })
  expect(lidbase.faceInfo.map(f => f.id)).toContain('lidTop')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/boxes.spec.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement helpers and tuck**

Helpers: `rectPanel`, `polygonPanel`, `foldLine`, `dimensionLine`, `panelArtRect`, `glueTab`, `dustFlap`, `tuckFlap`.

Tuck layout:

- Horizontal: glue 12mm, back L, right W, front L, left W.
- Body top `tuckDepth + 4`, bottom `bodyTop + H`.
- Top front tuck depth `0.85W`, side dust depth `0.55W`.
- Bottom back tuck depth `0.85W`, side dust depth `0.55W`.
- Glue tab attached to back at x=12; chamfered 8mm.
- All top/bottom flaps use `faceId: 'top'/'bottom'` and art rect of their bounding box.
- Fold coordinates listed for all vertical and horizontal hinges.

- [ ] **Step 4: Implement mailer and lidbase**

Mailer:

- `bodyH = round(H * 0.56)`, `lidSideH = H - bodyH`.
- Net base at `(bodyH + margin, lidSideH + W + lidSideH + margin)`.
- Base bottom, four walls; back connects lid top; lid connects front skirt and two side wings.
- Groups: one `lid` group with pivot at back top edge.
- Scene faces for base and lid as spec.

Lidbase:

- Build base cross and lid cross, side-by-side with 48mm gap.
- Base cross: center L×W plus four H-deep walls, with 12mm corner glue tabs.
- Lid cross uses `Ll = L + 2*gap`, `Wl = W + 2*gap`, `lidHeight`.
- Scene faces: base 5 faces, lid 5 faces (`lidTop`, `lidFront`, `lidLeft`, `lidRight`, `lidBack`).
- Default lid lift is UI state; scene group at closed position.

- [ ] **Step 5: Run tests and build**

Run: `pnpm test -- src/__tests__/boxes.spec.ts && pnpm build`
Expected: PASS and build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/core/boxes src/__tests__/boxes.spec.ts
git commit -m "feat: generate three accurate box nets and 3d face models"
```

---

### Task 4: Artwork compositor and texture cache

**Files:**
- Create: `src/core/artworkCanvas.ts`
- Create: `src/core/textureCache.ts`
- Create: `src/core/image.ts`
- Test: `src/__tests__/artwork.spec.ts`

**Interfaces:**
- Consumes: resolved `Artwork`, physical width/height mm, revision.
- Produces:

```ts
export interface RenderOptions {
  maxPx?: number
  dpi?: number
  background?: 'transparent' | 'paper'
  includeGuides?: boolean
}

export async function compressImageFile(file: File): Promise<{ src: string; width: number; height: number }>
export function renderArtworkCanvas(widthMm: number, heightMm: number, art: Artwork, opts?: RenderOptions): HTMLCanvasElement
export function textureCacheKey(faceId: FaceId, w: number, h: number, revision: number): string
export function getFaceTexture(faceId: FaceId, w: number, h: number, project: Project, revision: number): HTMLCanvasElement
export function clearTextureCache(): void
```

- [ ] **Step 1: Write failing pure-helper tests**

```ts
import { hexToRgb, patternTileMm, textureCacheKey } from '../core/artworkCanvas'

it('parses hex colors', () => {
  expect(hexToRgb('#ff4d1f')).toEqual({ r: 255, g: 77, b: 31 })
})

it('uses stable pattern physical sizes', () => {
  expect(patternTileMm('grid')).toBe(10)
  expect(patternTileMm('dots')).toBe(8)
})

it('builds a deterministic texture cache key', () => {
  expect(textureCacheKey('front', 180, 60, 4)).toBe('front:180x60:4')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/artwork.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement canvas compositor**

Implementation order:

1. Canvas size: `pxPerMm = min(maxPx / max(widthMm, heightMm), dpi / 25.4)`; min 64px on each axis.
2. Base fill.
3. Paper texture: deterministic seeded noise (mulberry32); fiber = short random strokes; linen = 1px cross lines; flute = vertical arcs every 6mm; noise = low-opacity random dots.
4. Pattern with mm-based tile sizes and 35% opacity.
5. Background image: load from cache map, `cover` or `contain`, apply scale/offset centered, rotation.
6. Layers, bottom-to-top: images preserve aspect and keep center point; text supports `\n`, letterSpacing (Canvas `letterSpacing` with fallback), weights, align, opacity.
7. No `document.fonts.ready` dependency; call `ctx.font = '...'` with local stacks.

`compressImageFile`:

- Validate MIME and 8MB max.
- Decode with `createImageBitmap`.
- Scale longest edge to ≤2000.
- Export PNG if source includes alpha, JPEG quality 0.86 otherwise.
- Return data URL and dimensions.

Texture cache: `Map<string, { canvas, usedAt }>` max 40, delete oldest on overflow. `getFaceTexture` uses `resolveArtwork` and `buildBoxModel(project).faceInfo` canonical dimensions, not net art rect. For net panels, draw the same texture into artRect with `preserveAspectRatio` crop.

- [ ] **Step 4: Run tests and build**

Run: `pnpm test -- src/__tests__/artwork.spec.ts && pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/artworkCanvas.ts src/core/textureCache.ts src/core/image.ts src/__tests__/artwork.spec.ts
git commit -m "feat: compose mm-accurate artwork textures"
```

---

### Task 5: SVG net viewer with zoom, pan and face selection

**Files:**
- Create: `src/core/netSvg.ts`
- Create: `src/components/NetViewer.vue`
- Create: `src/components/net/NetLegend.vue`
- Modify: `src/App.vue`
- Test: `src/__tests__/netSvg.spec.ts`

**Interfaces:**
- Consumes: `BoxModel`, `Project`, `designRevision`, `selectedFace`.
- Produces:
  - `buildNetSvg(model, project, revision, options): string`
  - `NetViewer` emits `select-face`; props use store directly for selected face.
  - SVG faces carry `data-face="<FaceId>"`; selected face has `data-selected="true"`; glue uses hatch pattern.

- [ ] **Step 1: Write failing SVG test**

```ts
import { buildNetSvg } from '../core/netSvg'
import { buildBoxModel } from '../core/boxes'
import { createDefaultProject } from '../core/defaultProject'

it('emits dieline, folds and face hit targets', () => {
  const project = createDefaultProject()
  const model = buildBoxModel(project)
  const svg = buildNetSvg(model, project, 1, { selectedFace: 'front', showBleed: true })
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg).toContain('data-face="front"')
  expect(svg).toContain('data-fold="true"')
  expect(svg).toContain('stroke-dasharray')
  expect(svg).toContain('data-bleed="true"')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/netSvg.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement SVG serializer**

Requirements:

- Root `viewBox="0 0 width height"` with 28mm padding added.
- Defs: hatch pattern for glue, per-face clip paths, drop shadow filter off.
- Bleed layer: each panel path stroked at `bleed * 2` with `#efe8d8`, linejoin round, `data-bleed`.
- Artwork layer: `<image href="data:...">` using the face texture canvas `toDataURL('image/jpeg', 0.9)`, positioned at artRect, clipped to panel polygon, `preserveAspectRatio="xMidYMid slice"`. Cache data URLs per texture key during one render.
- A paper-white underlay fill for panels before image.
- Fold lines: `#2b4cff`, `stroke-width=0.5`, dasharray `3 2`, `data-fold="true"`.
- Cut lines: `#17150f`, `stroke-width=0.8`, fill none.
- Labels: face names in uppercase 4px; selected face label in accent.
- Dimensions: arrowed lines outside net with mm labels.
- Selected panel: overlay polygon stroke `#ff4d1f`, stroke-width 1.6, fill rgba(255,77,31,.08); other faces unchanged.
- Escape all text with `escapeXml`.
- No external URLs except `data:` images.

- [ ] **Step 4: Implement NetViewer**

- Render string via `v-html` (generated by our trusted serializer).
- CSS transform pan/zoom: zoom 0.2–4; wheel zoom around pointer; blank-area drag pans; click `closest('[data-face]')` selects.
- Suppress click after >4px movement.
- Fit button computes scale from container clientWidth/Height, resets pan.
- Controls: fit, zoom in, zoom out, bleed toggle, annotation toggle.
- Header: eyebrow `01 / DIELINE`, title `展开图`, net size; show `BASE`/`LID` section labels.
- Footer: legend + selected face label.
- Responsive: at <1280 the left column can collapse; add a compact reopen button in the stage.

- [ ] **Step 5: Wire into App and verify**

Run: `pnpm test -- src/__tests__/netSvg.spec.ts && pnpm build`
Manual: dev server shows default kraft box net; clicking a face changes selection style.

- [ ] **Step 6: Commit**

```bash
git add src/core/netSvg.ts src/components/NetViewer.vue src/components/net src/App.vue
git commit -m "feat: add interactive svg dieline viewer"
```

---

### Task 6: Three.js stage with face picking and camera controls

**Files:**
- Create: `src/components/BoxViewer.vue`
- Create: `src/components/stage/StageControls.vue`
- Create: `src/components/stage/FaceTooltip.vue`
- Modify: `src/App.vue`
- Test: manual browser check + `pnpm build`

**Interfaces:**
- Consumes: `BoxModel`, `Project`, `designRevision`, selectedFace, box open/lift UI.
- Produces:
  - `select-face` emitted on click.
  - Camera presets: `front`, `back`, `left`, `right`, `top`, `iso`.
  - `setView(name)`, `resetView()`, `toggleAutoRotate()`.
  - Group animation: mailer lid rotation (`-openAngle`), lidbase lid Y offset.

- [ ] **Step 1: Build renderer lifecycle**

- `onMounted` creates `WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })`, DPR cap 2, ACES tone mapping, `outputColorSpace = SRGBColorSpace`, shadows PCFSoft.
- Camera fov 32, near 1, far 5000. Scene transparent; CSS supplies dark radial stage.
- PMREM `RoomEnvironment` environment intensity 0.55.
- Lights: warm key directional (2.2), cool fill (0.7), hemisphere (0.35).
- Ground: large plane with `ShadowMaterial({ opacity: 0.22 })` at `y = -H/2 - 1`.
- ResizeObserver updates renderer and camera aspect.
- RAF loop pauses when `document.hidden`; dispose all on unmount.

- [ ] **Step 2: Build face meshes**

- `PlaneGeometry(width, height)`; `MeshStandardMaterial` with map from texture cache, roughness/list from material, side DoubleSide, metalness 0.
- Faces with `group: 'lid'` become children of a `lid` Group at group position.
- Add subtle edge lines using `EdgesGeometry` for every face, color `#000`, opacity 0.12.
- Selected outline uses a separate `LineLoop` at +0.3 offset, accent color; hover uses white 0.45.
- Add internal corner shadow strips? Not required.
- Add a simple seam line across tuck top to suggest closure.

- [ ] **Step 3: Add controls and picking**

- OrbitControls: enableDamping, dampingFactor 0.08, minPolarAngle 0.12, maxPolarAngle 1.52; enablePan true; screenSpacePanning true.
- Auto rotate speed 0.7.
- Fit camera from `Box3` sphere: distance = radius / sin(fov/2) * 1.35.
- Pointer down/up distance < 4px → raycast face meshes (walk groups, store `userData.faceId`).
- On hover, raycast and set tooltip position from pointer.
- Click selects; clicking empty space does not clear selection.
- Camera preset animation over 420ms using easeInOutCubic; cancel on user drag.
- "重置视角" returns iso.
- Respect prefers-reduced-motion (instant camera).

- [ ] **Step 4: Build stage UI**

- Top-left overlaid: `03 / LIVE OBJECT`, structure English name, live `L × W × H mm`.
- Top-right: auto-rotate pill and `WebGL` status dot.
- Bottom center: glass control dock with view buttons and icons.
- Mailer: floating `开合` slider 0–75°; lidbase: `升盖` slider 0–120mm.
- Canvas has `aria-label="纸盒 3D 预览，可拖拽旋转"`.
- Show fallback message if WebGL context creation fails.

- [ ] **Step 5: Verify**

Run: `pnpm build`; then in browser rotate, select each face, switch view presets, change lid controls. No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/BoxViewer.vue src/components/stage src/App.vue
git commit -m "feat: add interactive three.js box stage"
```

---

### Task 7: Structure, design and export panels

**Files:**
- Create: `src/components/PropertyPanel.vue`
- Create: `src/components/property/StructurePanel.vue`
- Create: `src/components/property/DesignPanel.vue`
- Create: `src/components/property/ExportPanel.vue`
- Create: `src/components/ui/SegmentedControl.vue`
- Create: `src/components/ui/RangeField.vue`
- Create: `src/components/ui/ColorField.vue`
- Create: `src/components/ui/SectionCard.vue`
- Create: `src/components/ui/ToastStack.vue`
- Create: `src/core/presets.ts`
- Modify: `src/App.vue`
- Test: `src/__tests__/panels.spec.ts`

**Interfaces:**
- Consumes: store, `materials`, `getFaceInfo`.
- Produces:
  - Property tabs `structure | design | export`.
  - Structure: three box cards; dimension fields; lid controls only for lidbase; material cards; thickness; finish.
  - Design: scope control; override switch; background controls; image upload; pattern grid; layers list; layer inspector; template presets.
  - Export: bleed/safe; PDF/PNG/SVG/JSON actions; filename; loading/error states.

- [ ] **Step 1: Write failing panel tests**

```ts
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PropertyPanel from '../components/PropertyPanel.vue'

beforeEach(() => setActivePinia(createPinia()))

it('switches between structure and design tabs', async () => {
  const wrapper = mount(PropertyPanel)
  expect(wrapper.text()).toContain('盒型')
  await wrapper.find('[data-tab="design"]').trigger('click')
  expect(wrapper.text()).toContain('印刷设计')
  await wrapper.find('[data-tab="export"]').trigger('click')
  expect(wrapper.text()).toContain('输出')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/panels.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement shared controls and structure panel**

- RangeField: label, value, unit, min/max/step, numeric input, range input; both call `update`.
- ColorField: swatch button, native color input, hex text; validate `/^#[0-9a-f]{6}$/i`.
- SegmentedControl: accessible radiogroup.
- SectionCard: index number, title, optional action, collapsible.
- Structure cards use inline SVG mini-nets for each box type.
- Dimension changes commit on change, preview while sliding via local ref and `requestAnimationFrame` throttle.
- Default 4 size presets: XS 120×70×40, S 150×80×50, M 180×90×60, L 240×120×80.
- Material selection sets `material` and changes global base color only if the user has not manually edited global color this session? Simpler: material change sets `globalDesign.paperTexture` and `globalDesign.color` to material base; note in UI that it resets base color.
- Thickness slider and finish segmented.

- [ ] **Step 4: Implement design panel**

- Scope segmented `全局 | 当前面`; current face label.
- If current face inherits global, show dimmed preview and accent "启用单面覆盖" button.
- Background section: color, paper texture, pattern, pattern color, image upload zone with clear button, fit segmented, scale/offset/rotation, opacity.
- Image upload calls `compressImageFile`; errors surface toast.
- Templates: `craft-minimal`, `cobalt-editorial`, `orange-display`, `mono-grid`; each returns a complete `Artwork`; applying updates global or current face according to scope.
- Layers: list sorted top-first; actions move up/down/delete/visibility; add text and add logo; click selects.
- Layer inspector:
  - Text: textarea, font family select, font size, weight, color, letterSpacing, lineHeight, align, rotation, opacity, x/y, duplicate.
  - Image: widthPct, rotation, opacity, x/y, replace, delete.
- Use `<input type=file>` hidden behind upload buttons; accept `image/png,image/jpeg,image/webp,image/svg+xml`.
- Add empty state when no layers.
- All updates use store `commit`; text typing uses 300ms merge key.

- [ ] **Step 5: Implement export panel and exporters**

Files to create:

- `src/core/exporters/pdf.ts`
- `src/core/exporters/png.ts`
- `src/core/exporters/svg.ts`
- `src/core/exporters/json.ts`
- `src/core/exporters/rasterizeNet.ts`

Implementation details:

- `rasterizeNet(model, project, revision, scale, withBleed)`: render all panels (bleed halo, textures), fold/cut/dim overlays onto one canvas; max longest side 6000 for PDF and 8000 for PNG; return canvas.
- `exportPdf`: jsPDF with custom mm page. Page 1 raster + vector overlays; page 2 vector-only dieline + info. Use English labels only.
- `exportPng`: canvas to blob, download.
- `exportSvg`: `buildNetSvg` with embedded images, sanitized metadata, download.
- `exportJson`: pretty JSON blob, download.
- `importJson`: file text → `validateProject` → store.loadProject; errors toast.
- Filename slug: lowercase, spaces/hyphens, strip unsafe chars, fallback `carton`.
- Loading state in store UI; failure toast with retry suggestion.
- Add export buttons and current file summary.

- [ ] **Step 6: Wire panel into App and run tests/build**

Run: `pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/PropertyPanel.vue src/components/property src/components/ui src/core/presets.ts src/core/exporters src/core/exporters/rasterizeNet.ts src/__tests__/panels.spec.ts src/App.vue
git commit -m "feat: add structure, artwork and export panels"
```

---

### Task 8: Polish, responsive states, verification and final QA

**Files:**
- Modify: `src/App.vue`, `src/components/*.vue`, `src/styles/*.css`
- Create: `src/components/ToastStack.vue` (if not already)
- Create: `src/core/shortcuts.ts`
- Create: `README.md`
- Create: `docs/verification.md`
- Test: `src/__tests__/shortcuts.spec.ts`, browser checklist

**Interfaces:**
- Consumes: everything.
- Produces: final product, documented run instructions, screenshots, verification evidence.

- [ ] **Step 1: Add shortcuts and accessibility polish**

```ts
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
```

- Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo, Cmd/Ctrl+E export, Cmd/Ctrl+S JSON export.
- Focus rings on all controls.
- Escape closes mobile drawers.
- Toast stack with `aria-live="polite"`.
- `prefers-reduced-motion` CSS and JS behavior.
- Ensure all SVG control icons have accessible names.

- [ ] **Step 2: Responsive and visual polish**

- At 1440: verify no horizontal scroll, panel widths, 3D canvas fills center.
- At 1280: same.
- At ≤1180: left dieline drawer overlay with scrim, close button, and stage-level "展开图" trigger.
- At ≤900: right panel becomes a bottom sheet with tabs; stage controls remain usable.
- Add large editorial numerals and stage watermark `FORM 01` at low opacity.
- Add subtle paper grain to panels via CSS gradients only.
- Add selected-face accent line animation and toast animations.
- Add empty/loading/error states for 3D and exports.

- [ ] **Step 3: Write README and verification notes**

`README.md` must include:

- Product summary and three box types.
- Commands: `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`.
- Feature list and export notes.
- Limitations: printer must verify dielines; large formats may downscale; local-only storage.

`docs/verification.md` must list exact commands run, browser viewport, export file sizes, and any known issues.

- [ ] **Step 4: Run full automated checks**

Run:

```bash
pnpm test
pnpm exec vue-tsc --noEmit
pnpm build
```

Expected: all pass.

- [ ] **Step 5: Browser verification with a local dev server**

Run: `pnpm dev` in a background job, capture its URL, then use a headless Chrome/Playwright script to:

1. Open page at 1440×900 and 1280×800, assert no horizontal overflow.
2. Confirm header/three panels visible.
3. Screenshot initial state.
4. Switch to mailer and lidbase, screenshot each.
5. Change dimensions, assert SVG dimension text and 3D info update.
6. Drag on 3D canvas, assert camera changed.
7. Click a face in the net and confirm property panel face label updates.
8. Enable face override, change color, assert only that face changed (3D screenshot).
9. Upload a generated PNG via `setInputFiles`, add a text layer, screenshot.
10. Trigger PDF/PNG/SVG/JSON downloads, assert files exist and are non-zero; parse JSON; inspect PDF header `%PDF`.
11. Reload page and confirm project restored from IndexedDB.
12. Check console for errors.

- [ ] **Step 6: Fix issues and re-run**

Fix every issue found. Re-run full checks and browser flow. Save screenshots in `docs/screenshots/` and reference them from README or verification notes.

- [ ] **Step 7: Commit final**

```bash
git add .
git commit -m "feat: polish paper box designer and verify production exports"
```

---

## Self-Review Notes

- Spec coverage: visual system, layout, 2D/3D synchronization, all box types, inheritance, materials, layers, exports, persistence, undo/redo, accessibility, responsive behavior, and verification are mapped to tasks.
- Type consistency: `Project`, `Artwork`, `FaceId`, `BoxModel`, `NetPanel`, and `SceneFace` definitions are introduced once and reused.
- Known intentional simplification: 3D is a print-visualization model, not a physical simulation; the spec and README both state that dielines require printer verification.
