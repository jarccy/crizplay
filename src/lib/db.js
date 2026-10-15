// Almacenamiento local de la música. Los archivos de audio pesan varios MB,
// así que van a IndexedDB (localStorage solo admite ~5 MB de texto).
const DB_NAME = 'crizplay'
const VERSION = 2
let dbPromise

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, VERSION)
      r.onupgradeneeded = (e) => {
        const db = r.result
        if (e.oldVersion < 1) {
          db.createObjectStore('tracks', { keyPath: 'id' }) // metadatos + portada
          db.createObjectStore('files') // blobs de audio, clave = id de pista
        }
        if (e.oldVersion < 2) db.createObjectStore('playlists', { keyPath: 'id' })
      }
      r.onsuccess = () => {
        // si otra pestaña actualiza la base de datos, cerramos esta conexión
        r.result.onversionchange = () => r.result.close()
        resolve(r.result)
      }
      r.onerror = () => reject(r.error)
    })
  }
  return dbPromise
}

export const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

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

export async function getAllPlaylists() {
  return request((await store('playlists')).getAll())
}

export async function putPlaylist(playlist) {
  return request((await store('playlists', 'readwrite')).put(playlist))
}

export async function deletePlaylist(id) {
  return request((await store('playlists', 'readwrite')).delete(id))
}

export async function deleteTrack(id) {
  const db = await open()
  const t = db.transaction(['tracks', 'files'], 'readwrite')
  t.objectStore('tracks').delete(id)
  t.objectStore('files').delete(id)
  return done(t)
}
