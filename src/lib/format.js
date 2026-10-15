export function formatTime(s) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function formatBytes(b) {
  if (!b) return '0 MB'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024
    i++
  }
  return `${b.toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

// Preferencias pequeñas (tema, volumen, última pista) en localStorage
export function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(`crizplay:${key}`)
    return v == null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}

export function savePref(key, value) {
  try {
    localStorage.setItem(`crizplay:${key}`, JSON.stringify(value))
  } catch {
    // almacenamiento no disponible (modo privado)
  }
}
