import { useCallback, useEffect, useRef, useState } from 'react'
import { addTrack, deleteTrack, getAllTracks, updateTrack } from '../lib/db'
import { getDuration, parseFileName, readTags } from '../lib/id3'

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i
export const isAudio = (f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name)

export function useLibrary(notify) {
  const [tracks, setTracks] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [importing, setImporting] = useState(null) // { done, total }
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks

  useEffect(() => {
    getAllTracks()
      .then((all) => setTracks(all.sort((a, b) => a.addedAt - b.addedAt)))
      .catch(() => notify('No se pudo abrir la biblioteca local', 'error'))
      .finally(() => setLoaded(true))
    // pide al navegador que no borre los datos cuando falte espacio
    navigator.storage?.persist?.()
  }, [notify])

  const importFiles = useCallback(
    async (fileList) => {
      const files = [...fileList].filter(isAudio)
      if (!files.length) {
        notify('No se encontraron archivos de audio', 'error')
        return
      }
      setImporting({ done: 0, total: files.length })
      let added = 0
      let skipped = 0
      for (const [i, file] of files.entries()) {
        const dup = tracksRef.current.some((t) => t.fileName === file.name && t.size === file.size)
        if (dup) {
          skipped++
        } else {
          try {
            const [tags, duration] = await Promise.all([readTags(file), getDuration(file)])
            const fromName = parseFileName(file.name)
            const meta = {
              id: crypto.randomUUID(),
              title: tags.title || fromName.title,
              artist: tags.artist || fromName.artist || 'Artista desconocido',
              album: tags.album || '',
              cover: tags.cover || null,
              duration,
              size: file.size,
              type: file.type,
              fileName: file.name,
              addedAt: Date.now() + i,
              favorite: false,
            }
            await addTrack(meta, file)
            tracksRef.current = [...tracksRef.current, meta]
            setTracks(tracksRef.current)
            added++
          } catch (e) {
            const full = e?.name === 'QuotaExceededError'
            notify(full ? 'No queda espacio en el almacenamiento' : `No se pudo guardar ${file.name}`, 'error')
            if (full) break
          }
        }
        setImporting({ done: i + 1, total: files.length })
      }
      setImporting(null)
      if (added) notify(`${added} ${added === 1 ? 'canción añadida' : 'canciones añadidas'}`)
      else if (skipped) notify('Esas canciones ya estaban en tu biblioteca')
    },
    [notify],
  )

  const removeTrack = useCallback(async (id) => {
    await deleteTrack(id)
    setTracks((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const toggleFavorite = useCallback(async (id) => {
    const t = tracksRef.current.find((x) => x.id === id)
    if (!t) return
    const next = { ...t, favorite: !t.favorite }
    setTracks((ts) => ts.map((x) => (x.id === id ? next : x)))
    await updateTrack(next)
  }, [])

  return { tracks, loaded, importing, importFiles, removeTrack, toggleFavorite }
}
