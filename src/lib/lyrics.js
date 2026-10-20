// Letras desde LRCLIB (https://lrclib.net): gratis, sin clave y con letras sincronizadas (LRC).
// Una vez descargada, la letra se guarda con la canción en IndexedDB y funciona sin conexión.
const API = 'https://lrclib.net/api'
const UNKNOWN_ARTIST = 'Artista desconocido'

const normalize = (x) => ({
  id: x.id,
  title: x.trackName || x.name || '',
  artist: x.artistName || '',
  album: x.albumName || '',
  duration: x.duration || 0,
  synced: x.syncedLyrics || null,
  plain: x.plainLyrics || null,
  instrumental: !!x.instrumental,
})

export async function searchLyrics(query) {
  const r = await fetch(`${API}/search?q=${encodeURIComponent(query)}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const list = await r.json()
  return list.map(normalize).filter((x) => x.synced || x.plain || x.instrumental)
}

// Busca la mejor letra para una canción. Devuelve null si no hay ninguna.
export async function findLyrics(track) {
  const hasArtist = track.artist && track.artist !== UNKNOWN_ARTIST
  if (hasArtist) {
    const p = new URLSearchParams({ track_name: track.title, artist_name: track.artist })
    if (track.duration) p.set('duration', String(Math.round(track.duration)))
    const r = await fetch(`${API}/get?${p}`)
    if (r.ok) {
      const hit = normalize(await r.json())
      if (hit.synced || hit.plain || hit.instrumental) return hit
    } else if (r.status !== 404) {
      throw new Error(`HTTP ${r.status}`)
    }
  }
  const results = await searchLyrics(hasArtist ? `${track.artist} ${track.title}` : track.title)
  if (!results.length) return null
  // prioriza duración parecida y letra sincronizada
  const score = (x) =>
    (track.duration && x.duration ? Math.min(Math.abs(x.duration - track.duration), 30) : 15) - (x.synced ? 10 : 0)
  return results.sort((a, b) => score(a) - score(b))[0]
}

// Convierte un resultado (o texto pegado) en lo que se guarda con la canción
export function toStoredLyrics(hit, source = 'lrclib') {
  return {
    synced: hit.synced || null,
    plain: hit.plain || (hit.synced ? stripLrc(hit.synced) : null),
    instrumental: !!hit.instrumental,
    offset: 0,
    source,
  }
}

const TIME = /\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g

export const looksLikeLrc = (text) => /\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/.test(text)

export function stripLrc(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(TIME, '').trim())
    .filter((l) => l && !/^\[[a-z]+:.*\]$/i.test(l))
    .join('\n')
}

// "[01:23.45] texto" → [{ time: 83.45, text }] (admite varias marcas por línea y [offset:])
export function parseLrc(text) {
  const lines = []
  let offset = 0
  for (const raw of text.split(/\r?\n/)) {
    const off = raw.match(/^\[offset:\s*([+-]?\d+)\]/i)
    if (off) {
      offset = Number(off[1]) / 1000
      continue
    }
    const stamps = [...raw.matchAll(TIME)]
    if (!stamps.length) continue
    const content = raw.replace(TIME, '').trim()
    for (const m of stamps) {
      const time = Number(m[1]) * 60 + Number(m[2].replace(':', '.'))
      lines.push({ time, text: content })
    }
  }
  return lines.map((l) => ({ ...l, time: Math.max(0, l.time - offset) })).sort((a, b) => a.time - b.time)
}
