// URLs de portada cacheadas por pista (las portadas viven como Blob en IndexedDB)
const cache = new Map()

export function coverUrl(track) {
  if (!track?.cover) return null
  let url = cache.get(track.id)
  if (!url) {
    url = URL.createObjectURL(track.cover)
    cache.set(track.id, url)
  }
  return url
}
