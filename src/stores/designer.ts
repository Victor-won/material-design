import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  Artwork,
  BoxType,
  DesignLayer,
  Dimensions,
  EditorScope,
  FaceId,
  ImageLayer,
  MaterialId,
  Project,
  PropertyTab,
  TextLayer,
  ToastMessage,
  UIState,
} from '@/core/types'
import {
  createDefaultProject,
  createTextLayer,
  deepClone,
  enableFaceOverride,
  isFaceOverridden,
  resolveArtwork,
  setFaceFollowGlobal,
  syncFaceToGlobal,
  uid,
  withArtworkFor,
} from '@/core/project'
import { buildBoxModel } from '@/core/boxes'
import { BOX_FACE_IDS, getMaterial } from '@/core/materials'
import { clamp, validateProject } from '@/core/validation'
import { loadProjectFromDb, saveProjectToDb } from '@/core/storage'
import { preloadProjectImages } from '@/core/image'

interface CommitOptions {
  mergeKey?: string
}

function snapshot(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project
}

function nowIso(): string {
  return new Date().toISOString()
}

export const useDesignerStore = defineStore('designer', () => {
  const project = ref<Project>(createDefaultProject())
  const selectedFace = ref<FaceId>('front')
  const designRevision = ref(1)
  const undoStack = ref<Project[]>([])
  const redoStack = ref<Project[]>([])
  const initialized = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let mergeState: { key: string; at: number } | null = null

  const ui = reactive<UIState>({
    activeTab: 'structure',
    scope: 'global',
    saveState: 'saved',
    selectedLayerId: null,
    showBleed: true,
    showAnnotations: true,
    leftOpen: false,
    rightOpen: false,
    exporting: false,
    lidOpen: 12,
    lidLift: 22,
    toasts: [],
    webglAvailable: true,
  })

  const boxModel = computed(() => buildBoxModel(project.value))
  const faceInfo = computed(() => boxModel.value.faceInfo)
  const currentArtwork = computed<Artwork>(() => {
    if (ui.scope === 'global') return project.value.globalDesign
    return resolveArtwork(project.value, ui.scope)
  })
  const currentScopeInherited = computed(() =>
    ui.scope === 'global' ? false : !isFaceOverridden(project.value, ui.scope),
  )
  const currentFaceLabel = computed(() => {
    if (ui.scope === 'global') return '全局设计'
    return faceInfo.value.find(face => face.id === ui.scope)?.label ?? '当前面'
  })
  const selectedLayer = computed<DesignLayer | null>(() => {
    if (!ui.selectedLayerId) return null
    return currentArtwork.value.layers.find(layer => layer.id === ui.selectedLayerId) ?? null
  })
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const hasFaceOverride = computed(() =>
    ui.scope === 'global' ? false : isFaceOverridden(project.value, ui.scope),
  )
  const currentFaceCanOverride = computed(() => ui.scope !== 'global')

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer)
    ui.saveState = 'saving'
    saveTimer = setTimeout(async () => {
      try {
        await saveProjectToDb(snapshot(project.value))
        ui.saveState = 'saved'
      } catch {
        ui.saveState = 'session-only'
      }
    }, 700)
  }

  function trimHistory() {
    if (undoStack.value.length > 30) {
      undoStack.value = undoStack.value.slice(-30)
    }
  }

  function commit(mutator: (draft: Project) => void | Project, options: CommitOptions = {}) {
    const previous = snapshot(project.value)
    const draft = snapshot(project.value)
    const result = mutator(draft)
    const next = result ?? draft
    const beforeComparable = JSON.stringify(previous)
    const afterComparable = JSON.stringify({ ...next, updatedAt: previous.updatedAt })
    if (afterComparable === beforeComparable) {
      mergeState = null
      return
    }
    next.updatedAt = nowIso()

    const now = Date.now()
    const merge = options.mergeKey
      ? mergeState && mergeState.key === options.mergeKey && now - mergeState.at < 420
      : false
    if (!merge) {
      undoStack.value = [...undoStack.value, previous].slice(-30)
      redoStack.value = []
    }
    trimHistory()
    mergeState = options.mergeKey ? { key: options.mergeKey, at: now } : null
    project.value = next
    designRevision.value += 1
    const allowedFaces = BOX_FACE_IDS[next.boxType]
    if (ui.scope !== 'global' && !allowedFaces.includes(ui.scope)) {
      ui.scope = 'global'
      ui.selectedLayerId = null
    }
    if (!allowedFaces.includes(selectedFace.value)) selectedFace.value = allowedFaces[0] ?? 'front'
    scheduleSave()
  }

  async function init() {
    if (initialized.value) return
    initialized.value = true
    try {
      const saved = await loadProjectFromDb()
      if (saved) {
        const valid = validateProject(saved)
        await preloadProjectImages(valid)
        project.value = valid
        selectedFace.value = valid.boxType === 'lidbase' ? 'lidTop' : 'front'
        designRevision.value += 1
        ui.saveState = 'saved'
        return
      }
    } catch {
      ui.saveState = 'session-only'
    }
    scheduleSave()
  }

  function setTab(tab: PropertyTab) {
    ui.activeTab = tab
  }

  function selectFace(faceId: FaceId) {
    selectedFace.value = faceId
    ui.scope = faceId
    ui.selectedLayerId = null
  }

  function selectGlobal() {
    ui.scope = 'global'
    ui.selectedLayerId = null
  }

  function setScope(scope: EditorScope) {
    ui.scope = scope
    ui.selectedLayerId = null
  }

  function setName(name: string) {
    const trimmed = name.trim().slice(0, 40) || '未命名纸盒'
    commit(draft => {
      draft.name = trimmed
    }, { mergeKey: 'project-name' })
  }

  function setBoxType(boxType: BoxType) {
    commit(draft => {
      draft.boxType = boxType
    })
    const faces = BOX_FACE_IDS[boxType]
    if (!faces.includes(selectedFace.value)) selectedFace.value = faces[0] ?? 'front'
    if (ui.scope !== 'global' && !faces.includes(ui.scope)) ui.scope = 'global'
    ui.selectedLayerId = null
  }

  function setDimensions(partial: Partial<Dimensions>, mergeKey?: string) {
    commit(draft => {
      if (partial.length !== undefined) draft.dimensions.length = clamp(Math.round(partial.length), 30, 600)
      if (partial.width !== undefined) draft.dimensions.width = clamp(Math.round(partial.width), 30, 600)
      if (partial.height !== undefined) draft.dimensions.height = clamp(Math.round(partial.height), 30, 600)
    }, { mergeKey })
  }

  function setLidHeight(value: number, mergeKey?: string) {
    commit(draft => {
      draft.lidHeight = clamp(Math.round(value), 20, 150)
    }, { mergeKey })
  }

  function setLidGap(value: number, mergeKey?: string) {
    commit(draft => {
      draft.lidGap = clamp(Math.round(value), 1, 5)
    }, { mergeKey })
  }

  function setMaterial(material: MaterialId) {
    const preset = getMaterial(material)
    commit(draft => {
      draft.material = material
      draft.thickness = preset.thickness
      draft.globalDesign.color = preset.baseColor
      draft.globalDesign.paperTexture = preset.texture
    })
  }

  function setFinish(finish: Project['finish']) {
    commit(draft => {
      draft.finish = finish
    })
  }

  function setThickness(value: number, mergeKey?: string) {
    commit(draft => {
      draft.thickness = clamp(value, 0.3, 3)
    }, { mergeKey })
  }

  function setBleed(value: number, mergeKey?: string) {
    commit(draft => {
      draft.bleed = clamp(value, 0, 5)
    }, { mergeKey })
  }

  function setSafeArea(value: number, mergeKey?: string) {
    commit(draft => {
      draft.safeArea = clamp(value, 0, 5)
    }, { mergeKey })
  }

  function updateArtwork(updater: (artwork: Artwork) => Artwork, mergeKey?: string) {
    commit(draft => {
      const target = ui.scope
      return withArtworkFor(draft, target, updater)
    }, { mergeKey })
  }

  function enableOverride() {
    if (ui.scope === 'global') return
    const faceId = ui.scope
    commit(draft => {
      return enableFaceOverride(draft, faceId)
    })
  }

  function followGlobal(enabled: boolean) {
    if (ui.scope === 'global') return
    const faceId = ui.scope
    commit(draft => {
      return setFaceFollowGlobal(draft, faceId, enabled)
    })
    if (enabled) ui.selectedLayerId = null
  }

  function syncToAll() {
    if (ui.scope === 'global') return
    const faceId = ui.scope
    commit(draft => {
      return syncFaceToGlobal(draft, faceId)
    })
    addToast('success', '当前面设计已同步到所有面')
  }

  function addTextLayer(overrides: Partial<TextLayer> = {}) {
    const layer = createTextLayer({
      name: `文字 ${currentArtwork.value.layers.filter(l => l.type === 'text').length + 1}`,
      ...overrides,
    })
    updateArtwork(artwork => ({ ...artwork, layers: [...artwork.layers, layer] }))
    ui.selectedLayerId = layer.id
    return layer
  }

  function addImageLayer(src: string, widthPct = 34) {
    const layer: ImageLayer = {
      id: uid('image'),
      type: 'image',
      name: `Logo ${currentArtwork.value.layers.filter(l => l.type === 'image').length + 1}`,
      visible: true,
      x: 50,
      y: 50,
      rotation: 0,
      opacity: 1,
      src,
      widthPct,
    }
    updateArtwork(artwork => ({ ...artwork, layers: [...artwork.layers, layer] }))
    ui.selectedLayerId = layer.id
    return layer
  }

  function updateLayer(id: string, patch: Partial<DesignLayer>, mergeKey?: string) {
    updateArtwork(artwork => ({
      ...artwork,
      layers: artwork.layers.map(layer =>
        layer.id === id ? ({ ...layer, ...patch } as DesignLayer) : layer,
      ),
    }), mergeKey)
  }

  function selectLayer(id: string | null) {
    ui.selectedLayerId = id
  }

  function removeLayer(id: string) {
    updateArtwork(artwork => ({
      ...artwork,
      layers: artwork.layers.filter(layer => layer.id !== id),
    }))
    if (ui.selectedLayerId === id) ui.selectedLayerId = null
  }

  function duplicateLayer(id: string) {
    const source = currentArtwork.value.layers.find(layer => layer.id === id)
    if (!source) return
    const copy = deepClone(source)
    copy.id = uid(source.type)
    copy.name = `${source.name} 副本`
    copy.y = Math.min(96, copy.y + 6)
    updateArtwork(artwork => ({ ...artwork, layers: [...artwork.layers, copy] }))
    ui.selectedLayerId = copy.id
  }

  function moveLayer(id: string, direction: -1 | 1) {
    updateArtwork(artwork => {
      const layers = [...artwork.layers]
      const index = layers.findIndex(layer => layer.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= layers.length) return artwork
      const [item] = layers.splice(index, 1)
      if (item) layers.splice(target, 0, item)
      return { ...artwork, layers }
    })
  }

  function toggleLayerVisibility(id: string) {
    const layer = currentArtwork.value.layers.find(item => item.id === id)
    if (!layer) return
    updateLayer(id, { visible: !layer.visible })
  }

  function setSelectedLayer(id: string | null) {
    ui.selectedLayerId = id
  }

  function undo() {
    const previous = undoStack.value.pop()
    if (!previous) return
    redoStack.value = [...redoStack.value, snapshot(project.value)]
    project.value = previous
    designRevision.value += 1
    scheduleSave()
  }

  function redo() {
    const next = redoStack.value.pop()
    if (!next) return
    undoStack.value = [...undoStack.value, snapshot(project.value)]
    project.value = next
    designRevision.value += 1
    scheduleSave()
  }

  function newProject() {
    const fresh = createDefaultProject()
    undoStack.value = [...undoStack.value, snapshot(project.value)].slice(-30)
    redoStack.value = []
    project.value = fresh
    selectedFace.value = 'front'
    ui.scope = 'global'
    ui.activeTab = 'structure'
    ui.selectedLayerId = null
    designRevision.value += 1
    scheduleSave()
  }

  async function loadProject(input: Project) {
    const valid = validateProject(input)
    await preloadProjectImages(valid)
    undoStack.value = []
    redoStack.value = []
    project.value = valid
    selectedFace.value = BOX_FACE_IDS[valid.boxType][0] ?? 'front'
    ui.scope = 'global'
    ui.selectedLayerId = null
    designRevision.value += 1
    scheduleSave()
  }

  let toastCounter = 0
  function addToast(kind: ToastMessage['kind'], text: string) {
    const id = `toast-${Date.now()}-${toastCounter++}`
    ui.toasts.push({ id, kind, text })
    window.setTimeout(() => {
      ui.toasts = ui.toasts.filter(toast => toast.id !== id)
    }, 4200)
  }

  function removeToast(id: string) {
    ui.toasts = ui.toasts.filter(toast => toast.id !== id)
  }

  function setLidOpen(value: number) {
    ui.lidOpen = clamp(value, 0, 75)
  }

  function setLidLift(value: number) {
    ui.lidLift = clamp(value, 0, 120)
  }

  function toggleBleed() {
    ui.showBleed = !ui.showBleed
  }

  function toggleAnnotations() {
    ui.showAnnotations = !ui.showAnnotations
  }

  function setWebglAvailable(value: boolean) {
    ui.webglAvailable = value
  }

  return {
    project,
    ui,
    selectedFace,
    designRevision,
    initialized,
    boxModel,
    faceInfo,
    currentArtwork,
    currentScopeInherited,
    currentFaceLabel,
    selectedLayer,
    canUndo,
    canRedo,
    hasFaceOverride,
    currentFaceCanOverride,
    init,
    commit,
    setTab,
    selectFace,
    selectGlobal,
    setScope,
    setName,
    setBoxType,
    setDimensions,
    setLidHeight,
    setLidGap,
    setMaterial,
    setFinish,
    setThickness,
    setBleed,
    setSafeArea,
    updateArtwork,
    enableOverride,
    followGlobal,
    syncToAll,
    addTextLayer,
    addImageLayer,
    updateLayer,
    selectLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
    toggleLayerVisibility,
    setSelectedLayer,
    undo,
    redo,
    newProject,
    loadProject,
    addToast,
    removeToast,
    setLidOpen,
    setLidLift,
    toggleBleed,
    toggleAnnotations,
    setWebglAvailable,
  }
})
