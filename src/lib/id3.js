// Lector mínimo de etiquetas ID3v2.3/2.4 (título, artista, álbum y portada).
const synchsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3]
const be32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0

function decode(enc, bytes) {
  let label = 'utf-8'
  if (enc === 0) label = 'iso-8859-1'
  else if (enc === 2) label = 'utf-16be'
  else if (enc === 1) label = bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-16le'
  return new TextDecoder(label).decode(bytes).replace(/^﻿/, '').split('\0')[0].trim()
}

const text = (d) => decode(d[0], d.subarray(1))

function picture(d) {
  const enc = d[0]
  let i = 1
  while (i < d.length && d[i] !== 0) i++
  let mime = new TextDecoder('iso-8859-1').decode(d.subarray(1, i)).toLowerCase()
  i += 2 // terminador + tipo de imagen
  if (enc === 1 || enc === 2) {
    while (i + 1 < d.length && !(d[i] === 0 && d[i + 1] === 0)) i += 2
    i += 2
  } else {
    while (i < d.length && d[i] !== 0) i++
    i++
  }
  if (!mime.includes('/')) mime = mime === 'png' ? 'image/png' : 'image/jpeg'
  return new Blob([d.slice(i)], { type: mime })
}

export async function readTags(file) {
  const out = {}
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer())
    if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return out
    const ver = head[3]
    if (ver < 3) return out
    const size = synchsafe(head, 6)
    const buf = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer())
    let p = 0
    if (head[5] & 0x40) p = ver === 4 ? synchsafe(buf, 0) : be32(buf, 0) + 4
    while (p + 10 <= buf.length) {
      const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3])
      if (!/^[A-Z0-9]{4}$/.test(id)) break
      const len = ver === 4 ? synchsafe(buf, p + 4) : be32(buf, p + 4)
      const data = buf.subarray(p + 10, p + 10 + len)
      p += 10 + len
      if (id === 'TIT2') out.title = text(data)
      else if (id === 'TPE1') out.artist = text(data)
      else if (id === 'TALB') out.album = text(data)
      else if (id === 'APIC' && !out.cover) out.cover = picture(data)
    }
  } catch {
    // etiquetas corruptas: usamos el nombre del archivo
  }
  return out
}

export function parseFileName(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim()
  const parts = base.split(/\s+-\s+/)
  if (parts.length >= 2) return { artist: parts[0], title: parts.slice(1).join(' - ') }
  return { title: base }
}

export function getDuration(blob) {
  return new Promise((resolve) => {
    const a = new Audio()
    const url = URL.createObjectURL(blob)
    let timer
    const finish = (d) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    timer = setTimeout(() => finish(0), 8000)
    a.preload = 'metadata'
    a.onloadedmetadata = () => finish(a.duration)
    a.onerror = () => finish(0)
    a.src = url
  })
}
