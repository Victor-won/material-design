<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Rotate3d, RotateCcw, Maximize, Box } from '@lucide/vue'
import { useDesignerStore } from '@/stores/designer'
import { getFaceTexture } from '@/core/textureCache'
import { getFinish, getMaterial, FACE_LABELS } from '@/core/materials'
import type { FaceId } from '@/core/types'

type ViewName = 'front' | 'back' | 'left' | 'right' | 'top' | 'iso'

interface FaceMesh {
  mesh: THREE.Mesh
  faceId: FaceId
  width: number
  height: number
  material: THREE.MeshStandardMaterial
  selectedLine: THREE.LineSegments
  hoverLine: THREE.LineSegments
}

const store = useDesignerStore()
const container = ref<HTMLDivElement | null>(null)
const canvasHost = ref<HTMLDivElement | null>(null)
const errorMessage = ref('')
const hoveredFace = ref<FaceId | null>(null)
const tooltip = ref({ x: 0, y: 0, visible: false })
const autoRotate = ref(false)
const ready = ref(false)

const boxModel = computed(() => store.boxModel)
const viewLabels: { id: ViewName; label: string }[] = [
  { id: 'front', label: '前' },
  { id: 'back', label: '后' },
  { id: 'left', label: '左' },
  { id: 'right', label: '右' },
  { id: 'top', label: '顶' },
  { id: 'iso', label: 'ISO' },
]

const dimensionLabel = computed(
  () =>
    `${store.project.dimensions.length} × ${store.project.dimensions.width} × ${store.project.dimensions.height} mm`,
)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let modelGroup: THREE.Group | null = null
let lidGroup: THREE.Group | null = null
let lidGroupBaseY = 0
let ground: THREE.Mesh | null = null
let ring: THREE.Mesh | null = null
let grid: THREE.GridHelper | null = null
let keyLight: THREE.DirectionalLight | null = null
let raycaster: THREE.Raycaster | null = null
let faceMeshes: FaceMesh[] = []
let resizeObserver: ResizeObserver | null = null
let raf = 0
let disposed = false
let hasBuilt = false
let pointerDown: { x: number; y: number } | null = null
let cameraTween: {
  from: THREE.Vector3
  to: THREE.Vector3
  start: number
  duration: number
} | null = null
let textureRefreshTimer: ReturnType<typeof setTimeout> | null = null

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function disposeObject(object: THREE.Object3D) {
  object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach(material => {
        const standard = material as THREE.MeshStandardMaterial
        standard.map?.dispose()
        material.dispose()
      })
    }
    if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach(material => material.dispose())
    }
  })
}

function createFaceTexture(faceId: FaceId, width: number, height: number): THREE.CanvasTexture {
  const canvas = getFaceTexture(
    faceId,
    width,
    height,
    store.project,
    store.designRevision,
    1300,
  )
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
  texture.needsUpdate = true
  return texture
}

function materialRoughness(): number {
  return getFinish(store.project.finish).roughness
}

function clearModel() {
  if (!scene || !modelGroup) return
  scene.remove(modelGroup)
  disposeObject(modelGroup)
  modelGroup = null
  lidGroup = null
  faceMeshes = []
}

function addSeam(group: THREE.Group) {
  if (store.project.boxType !== 'tuck') return
  const { length: L, width: W, height: H } = store.project.dimensions
  const points = [
    new THREE.Vector3(-L / 2, H / 2 + 0.25, W / 2 - 3),
    new THREE.Vector3(L / 2, H / 2 + 0.25, W / 2 - 3),
  ]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x3b2e20,
    transparent: true,
    opacity: 0.32,
  })
  group.add(new THREE.Line(geometry, material))
}

function buildModel() {
  if (!scene || !renderer) return
  clearModel()
  const root = new THREE.Group()
  root.name = 'paperform-model'
  scene.add(root)
  modelGroup = root

  const groups = new Map<string, THREE.Group>()
  for (const groupDef of boxModel.value.groups) {
    const group = new THREE.Group()
    group.position.set(...groupDef.position)
    root.add(group)
    groups.set(groupDef.id, group)
    if (groupDef.id === 'lid') {
      lidGroup = group
      lidGroupBaseY = groupDef.position[1]
    }
  }

  for (const face of boxModel.value.faces) {
    const parent = face.group ? groups.get(face.group) ?? root : root
    const geometry = new THREE.PlaneGeometry(face.width, face.height)
    const texture = createFaceTexture(face.faceId, face.width, face.height)
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: materialRoughness(),
      metalness: getMaterial(store.project.material).metalness,
      envMapIntensity: 0.55,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...face.position)
    mesh.rotation.set(...face.rotation)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.faceId = face.faceId
    parent.add(mesh)

    // A plain paper liner sits just inside the printed surface so the inside of
    // an opened box never shows mirrored artwork from a double-sided material.
    const materialPreset = getMaterial(store.project.material)
    const linerColor = new THREE.Color(materialPreset.baseColor)
    if (store.project.material === 'black-card') linerColor.offsetHSL(0, 0, 0.05)
    else linerColor.offsetHSL(0, -0.02, -0.035)
    const linerGeometry = geometry.clone()
    const linerMaterial = new THREE.MeshStandardMaterial({
      color: linerColor,
      side: THREE.BackSide,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.18,
    })
    const liner = new THREE.Mesh(linerGeometry, linerMaterial)
    const normal = new THREE.Vector3(0, 0, 1)
      .applyEuler(new THREE.Euler(...face.rotation))
      .normalize()
    liner.position.set(...face.position).addScaledVector(normal, -0.28)
    liner.rotation.set(...face.rotation)
    liner.receiveShadow = true
    parent.add(liner)

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0x1f1a12,
        transparent: true,
        opacity: 0.16,
      }),
    )
    mesh.add(edges)

    const selectedLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xff4d1f,
        transparent: true,
        opacity: 0,
        depthTest: false,
      }),
    )
    selectedLine.position.z = 0.32
    selectedLine.renderOrder = 8
    mesh.add(selectedLine)

    const hoverLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthTest: false,
      }),
    )
    hoverLine.position.z = 0.28
    hoverLine.renderOrder = 7
    mesh.add(hoverLine)

    faceMeshes.push({
      mesh,
      faceId: face.faceId,
      width: face.width,
      height: face.height,
      material,
      selectedLine,
      hoverLine,
    })
  }

  addSeam(root)
  applyOutlines()
  if (!hasBuilt) {
    fitCamera(false)
    hasBuilt = true
  } else {
    fitCamera(true)
  }
  if (store.project.boxType === 'mailer' && lidGroup) {
    lidGroup.rotation.x = THREE.MathUtils.degToRad(-store.ui.lidOpen)
  }
  if (store.project.boxType === 'lidbase' && lidGroup) {
    lidGroup.position.y = lidGroupBaseY + store.ui.lidLift
  }
  ready.value = true
}

function refreshTextures() {
  if (!renderer) return
  for (const entry of faceMeshes) {
    const next = createFaceTexture(entry.faceId, entry.width, entry.height)
    entry.material.map?.dispose()
    entry.material.map = next
    entry.material.roughness = materialRoughness()
    entry.material.needsUpdate = true
  }
}

function applyOutlines() {
  for (const entry of faceMeshes) {
    const selected = entry.faceId === store.selectedFace
    const hovered = entry.faceId === hoveredFace.value && !selected
    const selectedMaterial = entry.selectedLine.material as THREE.LineBasicMaterial
    const hoverMaterial = entry.hoverLine.material as THREE.LineBasicMaterial
    selectedMaterial.opacity = selected ? 1 : 0
    hoverMaterial.opacity = hovered ? 0.72 : 0
  }
}

function fitCamera(keepDirection: boolean) {
  if (!camera || !controls || !modelGroup || !scene) return
  modelGroup.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(modelGroup)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  const center = box.getCenter(new THREE.Vector3())
  const radius = Math.max(sphere.radius, 12)
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.38
  const direction = keepDirection
    ? camera.position.clone().sub(controls.target).normalize()
    : new THREE.Vector3(0.97, 0.72, 1.35).normalize()
  if (!Number.isFinite(direction.x)) direction.set(0.97, 0.72, 1.35).normalize()

  controls.target.copy(center)
  camera.position.copy(center).addScaledVector(direction, distance)
  camera.near = Math.max(0.5, distance / 240)
  camera.far = distance * 30
  camera.updateProjectionMatrix()
  controls.minDistance = distance * 0.36
  controls.maxDistance = distance * 3.2
  controls.update()

  const size = box.getSize(new THREE.Vector3())
  const floorY = box.min.y - Math.max(1.2, size.y * 0.02)
  if (ground) ground.position.y = floorY
  if (ring) {
    ring.position.y = floorY + 0.35
    ring.scale.setScalar(Math.max(size.x, size.z) * 0.74)
  }
  if (grid) grid.position.y = floorY + 0.02
  if (keyLight) {
    keyLight.position.copy(center).add(new THREE.Vector3(radius * 1.5, radius * 2.4, radius * 1.65))
    keyLight.target.position.copy(center)
    keyLight.target.updateMatrixWorld()
    const shadow = keyLight.shadow.camera
    shadow.left = -radius * 1.5
    shadow.right = radius * 1.5
    shadow.top = radius * 1.5
    shadow.bottom = -radius * 1.5
    shadow.near = 0.5
    shadow.far = radius * 8
    shadow.updateProjectionMatrix()
  }
}

function animateCamera(view: ViewName) {
  if (!camera || !controls || !modelGroup || reduceMotion) {
    if (reduceMotion) setView(view)
    return
  }
  const directions: Record<ViewName, THREE.Vector3> = {
    front: new THREE.Vector3(0, 0.1, 1),
    back: new THREE.Vector3(0, 0.1, -1),
    left: new THREE.Vector3(-1, 0.1, 0),
    right: new THREE.Vector3(1, 0.1, 0),
    top: new THREE.Vector3(0.001, 1, 0.001),
    iso: new THREE.Vector3(0.97, 0.72, 1.35),
  }
  const box = new THREE.Box3().setFromObject(modelGroup)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  const target = box.getCenter(new THREE.Vector3())
  const distance = (Math.max(sphere.radius, 12) / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.38
  const to = target.clone().addScaledVector(directions[view].normalize(), distance)
  controls.target.copy(target)
  cameraTween = {
    from: camera.position.clone(),
    to,
    start: performance.now(),
    duration: 420,
  }
}

function setView(view: ViewName) {
  if (!camera || !controls || !modelGroup) return
  const directions: Record<ViewName, THREE.Vector3> = {
    front: new THREE.Vector3(0, 0.1, 1),
    back: new THREE.Vector3(0, 0.1, -1),
    left: new THREE.Vector3(-1, 0.1, 0),
    right: new THREE.Vector3(1, 0.1, 0),
    top: new THREE.Vector3(0.001, 1, 0.001),
    iso: new THREE.Vector3(0.97, 0.72, 1.35),
  }
  const box = new THREE.Box3().setFromObject(modelGroup)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  const target = box.getCenter(new THREE.Vector3())
  const distance = (Math.max(sphere.radius, 12) / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.38
  controls.target.copy(target)
  camera.position.copy(target).addScaledVector(directions[view].normalize(), distance)
  controls.update()
}

function resetView() {
  animateCamera('iso')
}

function toggleAutoRotate() {
  autoRotate.value = !autoRotate.value
  if (controls) controls.autoRotate = autoRotate.value
}

function handleResize() {
  if (!renderer || !camera || !container.value) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  if (width < 2 || height < 2) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function normalizedPointer(event: PointerEvent): THREE.Vector2 {
  const rect = renderer?.domElement.getBoundingClientRect()
  if (!rect) return new THREE.Vector2()
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
}

function raycastFace(event: PointerEvent): FaceId | null {
  if (!raycaster || !camera) return null
  raycaster.setFromCamera(normalizedPointer(event), camera)
  const hits = raycaster.intersectObjects(
    faceMeshes.map(entry => entry.mesh),
    false,
  )
  const hit = hits[0]
  return (hit?.object.userData.faceId as FaceId | undefined) ?? null
}

function onPointerDown(event: PointerEvent) {
  pointerDown = { x: event.clientX, y: event.clientY }
  cameraTween = null
  if (controls) controls.autoRotate = false
  autoRotate.value = false
}

function onPointerUp(event: PointerEvent) {
  if (!pointerDown) return
  const dx = event.clientX - pointerDown.x
  const dy = event.clientY - pointerDown.y
  pointerDown = null
  if (Math.sqrt(dx * dx + dy * dy) > 5) return
  const face = raycastFace(event)
  if (face) store.selectFace(face)
}

function onPointerMove(event: PointerEvent) {
  if (!renderer || !container.value) return
  const face = raycastFace(event)
  hoveredFace.value = face
  applyOutlines()
  if (face) {
    const rect = container.value.getBoundingClientRect()
    tooltip.value = {
      x: event.clientX - rect.left + 16,
      y: event.clientY - rect.top + 16,
      visible: true,
    }
    renderer.domElement.style.cursor = 'pointer'
  } else {
    tooltip.value.visible = false
    renderer.domElement.style.cursor = ''
  }
}

function onPointerLeave() {
  hoveredFace.value = null
  tooltip.value.visible = false
  applyOutlines()
}

function setupLights() {
  if (!scene) return
  const hemi = new THREE.HemisphereLight(0xfff3df, 0x151711, 0.55)
  scene.add(hemi)

  keyLight = new THREE.DirectionalLight(0xfff0d6, 2.7)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.bias = -0.0002
  scene.add(keyLight)
  scene.add(keyLight.target)

  const fill = new THREE.DirectionalLight(0x8ea6ff, 0.72)
  fill.position.set(-300, 180, -220)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0xff7d48, 1.3)
  rim.position.set(-180, 130, 360)
  scene.add(rim)

  const environment = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer!)
  scene.environment = pmrem.fromScene(environment, 0.04).texture
  scene.environmentIntensity = 0.42
  pmrem.dispose()
}

function setupStage() {
  if (!scene) return
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 5000),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.26 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  grid = new THREE.GridHelper(3000, 60, 0x696553, 0x35372f)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.13
  scene.add(grid)

  ring = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.006, 96),
    new THREE.MeshBasicMaterial({
      color: 0xff6238,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  scene.add(ring)
}

function initScene() {
  if (!canvasHost.value || !container.value) return
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    })
  } catch {
    errorMessage.value = '当前浏览器无法创建 WebGL 上下文，2D 展开图与导出仍可使用。'
    store.setWebglAvailable(false)
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 0.72
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.setAttribute('aria-label', '纸盒 3D 预览，可拖拽旋转')
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  canvasHost.value.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(32, 1, 1, 5000)
  setupLights()
  setupStage()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = 0.14
  controls.maxPolarAngle = 1.52
  controls.enablePan = true
  controls.screenSpacePanning = true
  controls.autoRotateSpeed = 0.72

  raycaster = new THREE.Raycaster()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerleave', onPointerLeave)

  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(container.value)
  handleResize()
  buildModel()
  animate()
}

function animate() {
  if (disposed) return
  raf = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera || !controls) return
  if (document.hidden) return
  if (lidGroup && !reduceMotion) {
    if (store.project.boxType === 'mailer') {
      const target = THREE.MathUtils.degToRad(-store.ui.lidOpen)
      lidGroup.rotation.x += (target - lidGroup.rotation.x) * 0.12
    } else if (store.project.boxType === 'lidbase') {
      const target = lidGroupBaseY + store.ui.lidLift
      lidGroup.position.y += (target - lidGroup.position.y) * 0.12
    }
  }
  if (cameraTween && camera) {
    const progress = Math.min(1, (performance.now() - cameraTween.start) / cameraTween.duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    camera.position.lerpVectors(cameraTween.from, cameraTween.to, eased)
    if (progress >= 1) cameraTween = null
  }
  controls.update()
  renderer.render(scene, camera)
}

function scheduleTextureRefresh() {
  if (textureRefreshTimer) clearTimeout(textureRefreshTimer)
  textureRefreshTimer = setTimeout(() => {
    refreshTextures()
  }, 90)
}

watch(
  () => [
    store.project.boxType,
    store.project.dimensions.length,
    store.project.dimensions.width,
    store.project.dimensions.height,
    store.project.lidHeight,
    store.project.lidGap,
    store.project.material,
  ],
  () => {
    if (renderer) buildModel()
  },
)

watch(
  () => store.designRevision,
  () => {
    if (renderer) scheduleTextureRefresh()
  },
)

watch(
  () => store.selectedFace,
  () => applyOutlines(),
)

watch(
  () => store.ui.lidOpen,
  () => {
    if (store.project.boxType === 'mailer' && lidGroup && reduceMotion) {
      lidGroup.rotation.x = THREE.MathUtils.degToRad(-store.ui.lidOpen)
    }
  },
)

watch(
  () => store.ui.lidLift,
  () => {
    if (store.project.boxType === 'lidbase' && lidGroup && reduceMotion) {
      lidGroup.position.y = lidGroupBaseY + store.ui.lidLift
    }
  },
)

onMounted(() => {
  initScene()
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(raf)
  if (textureRefreshTimer) clearTimeout(textureRefreshTimer)
  resizeObserver?.disconnect()
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
    clearModel()
    controls?.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
})
</script>

<template>
  <div ref="container" class="box-viewer">
    <div ref="canvasHost" class="canvas-host" />

    <div class="stage-top-left">
      <span class="stage-eyebrow">03 / Live object</span>
      <h2>{{ boxModel.nameEn }}</h2>
      <div class="stage-spec">
        <span>{{ boxModel.name }}</span>
        <i />
        <strong>{{ dimensionLabel }}</strong>
      </div>
    </div>

    <div class="stage-top-right">
      <button
        class="stage-pill"
        :class="{ 'is-active': autoRotate }"
        aria-label="切换自动旋转"
        @click="toggleAutoRotate"
      >
        <Rotate3d :size="13" />
        AUTO
      </button>
      <span class="webgl-status">
        <i :class="{ 'is-error': errorMessage }" />
        {{ errorMessage ? '2D FALLBACK' : 'WEBGL LIVE' }}
      </span>
    </div>

    <span class="stage-watermark" aria-hidden="true">FORM 01</span>

    <div v-if="errorMessage" class="stage-fallback">
      <Box :size="34" :stroke-width="1.2" />
      <h3>3D 视角暂不可用</h3>
      <p>{{ errorMessage }}</p>
    </div>

    <div
      v-if="tooltip.visible && hoveredFace"
      class="face-tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <span class="tooltip-dot" />
      <strong>{{ FACE_LABELS[hoveredFace].zh }}</strong>
      <small>{{ FACE_LABELS[hoveredFace].en }}</small>
    </div>

    <div v-if="!errorMessage" class="stage-controls-wrap">
      <div v-if="store.project.boxType === 'mailer'" class="structure-slider">
        <span>盒盖开合</span>
        <input
          type="range"
          :value="store.ui.lidOpen"
          min="0"
          max="75"
          step="1"
          aria-label="盒盖开合角度"
          @input="store.setLidOpen(Number(($event.target as HTMLInputElement).value))"
        />
        <strong>{{ Math.round(store.ui.lidOpen) }}°</strong>
      </div>
      <div v-if="store.project.boxType === 'lidbase'" class="structure-slider">
        <span>盒盖升起</span>
        <input
          type="range"
          :value="store.ui.lidLift"
          min="0"
          max="120"
          step="1"
          aria-label="盒盖升起高度"
          @input="store.setLidLift(Number(($event.target as HTMLInputElement).value))"
        />
        <strong>{{ Math.round(store.ui.lidLift) }}mm</strong>
      </div>

      <div class="view-dock">
        <div class="view-buttons">
          <button
            v-for="view in viewLabels"
            :key="view.id"
            class="view-button"
            :class="{ 'is-iso': view.id === 'iso' }"
            @click="animateCamera(view.id)"
          >
            {{ view.label }}
          </button>
        </div>
        <span class="dock-divider" />
        <button class="dock-button" title="重置视角" aria-label="重置视角" @click="resetView">
          <RotateCcw :size="13" />
        </button>
        <button
          class="dock-button"
          :class="{ 'is-active': autoRotate }"
          title="自动旋转"
          aria-label="自动旋转"
          @click="toggleAutoRotate"
        >
          <Rotate3d :size="13" />
        </button>
      </div>
    </div>

    <div class="stage-footer">
      <span><Maximize :size="11" /> 拖拽旋转 · 滚轮缩放 · 点击选面</span>
      <span class="face-count">{{ boxModel.faces.length }} SURFACES / PBR PAPER</span>
    </div>
  </div>
</template>

<style scoped>
.box-viewer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.canvas-host {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.canvas-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  animation: stage-in 900ms var(--ease-out) both;
}

@keyframes stage-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
}

.stage-top-left {
  position: absolute;
  top: 24px;
  left: 26px;
  z-index: 2;
  pointer-events: none;
}

.stage-eyebrow {
  color: rgba(255, 255, 255, 0.36);
  font-family: var(--font-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.stage-top-left h2 {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: clamp(25px, 2.4vw, 38px);
  font-weight: 420;
  letter-spacing: -0.025em;
  line-height: 0.95;
}

.stage-spec {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 8px;
  letter-spacing: 0.03em;
}

.stage-spec i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--accent);
}

.stage-spec strong {
  color: rgba(255, 255, 255, 0.72);
  font-family: var(--font-mono);
  font-size: 7px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.stage-top-right {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-pill {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--font-mono);
  font-size: 6px;
  letter-spacing: 0.1em;
  backdrop-filter: blur(10px);
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.stage-pill:hover,
.stage-pill.is-active {
  border-color: rgba(255, 77, 31, 0.5);
  background: rgba(255, 77, 31, 0.16);
  color: #ffb39d;
}

.webgl-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(255, 255, 255, 0.33);
  font-family: var(--font-mono);
  font-size: 6px;
  letter-spacing: 0.08em;
}

.webgl-status i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #58daa5;
  box-shadow: 0 0 8px rgba(88, 218, 165, 0.65);
}

.webgl-status i.is-error {
  background: var(--accent);
}

.stage-watermark {
  position: absolute;
  top: 14%;
  left: 50%;
  z-index: 0;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.022);
  font-family: var(--font-display);
  font-size: clamp(120px, 18vw, 280px);
  font-style: italic;
  font-weight: 300;
  letter-spacing: -0.07em;
  line-height: 0.8;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.face-tooltip {
  position: absolute;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 5px;
  background: rgba(18, 18, 16, 0.84);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.22);
  color: var(--white);
  font-size: 9px;
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.tooltip-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}

.face-tooltip strong {
  font-weight: 650;
}

.face-tooltip small {
  color: rgba(255, 255, 255, 0.36);
  font-family: var(--font-mono);
  font-size: 6px;
  text-transform: uppercase;
}

.stage-controls-wrap {
  position: absolute;
  bottom: 54px;
  left: 50%;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transform: translateX(-50%);
}

.structure-slider {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(18, 18, 16, 0.55);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.58);
  font-size: 8px;
  backdrop-filter: blur(18px);
}

.structure-slider input {
  width: 98px;
  height: 12px;
  accent-color: var(--accent);
}

.structure-slider strong {
  width: 34px;
  color: var(--white);
  font-family: var(--font-mono);
  font-size: 7px;
  font-weight: 500;
  text-align: right;
}

.view-dock {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(22, 23, 19, 0.64);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);
}

.view-buttons {
  display: flex;
  gap: 1px;
}

.view-button {
  width: 31px;
  height: 29px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.46);
  font-size: 8px;
  font-weight: 620;
  transition:
    color 140ms ease,
    background 140ms ease;
}

.view-button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--white);
}

.view-button.is-iso {
  color: rgba(255, 255, 255, 0.76);
  font-family: var(--font-mono);
  font-size: 7px;
}

.dock-divider {
  width: 1px;
  height: 18px;
  margin: 0 3px;
  background: rgba(255, 255, 255, 0.12);
}

.dock-button {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.48);
}

.dock-button:hover,
.dock-button.is-active {
  background: rgba(255, 255, 255, 0.09);
  color: var(--white);
}

.stage-footer {
  position: absolute;
  right: 24px;
  bottom: 18px;
  left: 26px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.28);
  font-family: var(--font-mono);
  font-size: 6px;
  letter-spacing: 0.04em;
  pointer-events: none;
}

.stage-footer span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.face-count {
  letter-spacing: 0.08em;
}

.stage-fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: flex;
  width: min(340px, 80%);
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
}

.stage-fallback h3 {
  margin: 12px 0 4px;
  color: var(--white);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 450;
}

.stage-fallback p {
  margin: 0;
  font-size: 10px;
  line-height: 1.6;
}

@media (max-width: 1023px) {
  .stage-top-left {
    top: 18px;
    left: 18px;
  }

  .stage-top-right {
    top: 18px;
    right: 16px;
  }

  .stage-footer {
    right: 16px;
    left: 18px;
  }

  .face-count {
    display: none !important;
  }

  .view-button {
    width: 27px;
  }
}
</style>
