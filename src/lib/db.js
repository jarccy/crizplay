// Almacenamiento local de la música. Los archivos de audio pesan varios MB,
// así que van a IndexedDB (localStorage solo admite ~5 MB de texto).
const DB_NAME = 'crizplay'
const VERSION = 1
let dbPromise

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, VERSION)
      r.onupgradeneeded = () => {
        const db = r.result
        db.createObjectStore('tracks', { keyPath: 'id' }) // metadatos + portada
        db.createObjectStore('files') // blobs de audio, clave = id de pista
      }
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
  }
  return dbPromise
}

const request = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

const done = (t) =>
  new Promise((resolve, reject) => {
    t.oncomplete = () => resolve()
    t.onerror = t.onabort = () => reject(t.error)
  })

async function store(name, mode = 'readonly') {
  const db = await open()
  return db.transaction(name, mode).objectStore(name)
}

export async function getAllTracks() {
  return request((await store('tracks')).getAll())
}

export async function getFile(id) {
  return request((await store('files')).get(id))
}

export async function addTrack(meta, blob) {
  const db = await open()
  const t = db.transaction(['tracks', 'files'], 'readwrite')
  t.objectStore('tracks').put(meta)
  t.objectStore('files').put(blob, meta.id)
  return done(t)
}

export async function updateTrack(meta) {
  return request((await store('tracks', 'readwrite')).put(meta))
}

export async function deleteTrack(id) {
  const db = await open()
  const t = db.transaction(['tracks', 'files'], 'readwrite')
  t.objectStore('tracks').delete(id)
  t.objectStore('files').delete(id)
  return done(t)
}
