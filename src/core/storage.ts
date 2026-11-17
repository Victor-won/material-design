import type { Project } from './types'

const DB_NAME = 'paperform-studio'
const DB_VERSION = 1
const STORE = 'projects'
const CURRENT_KEY = 'current'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
  return dbPromise
}

export async function saveProjectToDb(project: Project): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(structuredClone(project), CURRENT_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('保存失败'))
    tx.onabort = () => reject(tx.error ?? new Error('保存被中止'))
  })
}

export async function loadProjectFromDb(): Promise<Project | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(CURRENT_KEY)
    request.onsuccess = () => resolve((request.result as Project | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error('读取失败'))
  })
}

export async function clearProjectDb(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(CURRENT_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('清除失败'))
  })
}
