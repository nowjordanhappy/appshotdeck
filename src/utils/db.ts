const DB_NAME = 'appshotdeck'
const STORE_NAME = 'screenshots'

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

export async function saveScreenshot(key: string, dataUrl: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readwrite')
    t.objectStore(STORE_NAME).put(dataUrl, key)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function getScreenshot(key: string): Promise<string | null> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteScreenshot(key: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readwrite')
    t.objectStore(STORE_NAME).delete(key)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function copyScreenshot(fromKey: string, toKey: string): Promise<void> {
  const dataUrl = await getScreenshot(fromKey)
  if (dataUrl) await saveScreenshot(toKey, dataUrl)
}

export async function deleteProjectScreenshots(projectId: string): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_NAME, 'readwrite')
    const store = t.objectStore(STORE_NAME)
    const req = store.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      if (String(cursor.key).startsWith(`${projectId}/`)) cursor.delete()
      cursor.continue()
    }
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}
