import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addTrack,
  deletePlaylist,
  deleteTrack,
  getAllPlaylists,
  getAllTracks,
  putPlaylist,
  uid,
  updateTrack,
} from '../lib/db'
import { getDuration, parseFileName, readTags } from '../lib/id3'

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i
export const isAudio = (f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name)

export function useLibrary(notify) {
  const [tracks, setTracks] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [importing, setImporting] = useState(null) // { done, total }
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks
  const playlistsRef = useRef(playlists)
  playlistsRef.current = playlists

  useEffect(() => {
    Promise.all([getAllTracks(), getAllPlaylists()])
      .then(([ts, pls]) => {
        setTracks(ts.sort((a, b) => a.addedAt - b.addedAt))
        setPlaylists(pls.sort((a, b) => a.createdAt - b.createdAt))
      })
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
              id: uid(),
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

  const savePlaylist = useCallback(async (pl) => {
    const exists = playlistsRef.current.some((p) => p.id === pl.id)
    playlistsRef.current = exists
      ? playlistsRef.current.map((p) => (p.id === pl.id ? pl : p))
      : [...playlistsRef.current, pl]
    setPlaylists(playlistsRef.current)
    await putPlaylist(pl)
    return pl
  }, [])

  const removeTrack = useCallback(
    async (id) => {
      await deleteTrack(id)
      setTracks((ts) => ts.filter((t) => t.id !== id))
      for (const pl of playlistsRef.current) {
        if (pl.trackIds.includes(id)) await savePlaylist({ ...pl, trackIds: pl.trackIds.filter((x) => x !== id) })
      }
    },
    [savePlaylist],
  )

  const toggleFavorite = useCallback(async (id) => {
    const t = tracksRef.current.find((x) => x.id === id)
    if (!t) return
    const next = { ...t, favorite: !t.favorite }
    setTracks((ts) => ts.map((x) => (x.id === id ? next : x)))
    await updateTrack(next)
  }, [])

  const createPlaylist = useCallback(
    (name, trackIds = []) => savePlaylist({ id: uid(), name, trackIds, createdAt: Date.now() }),
    [savePlaylist],
  )

  const renamePlaylist = useCallback(
    (id, name) => {
      const pl = playlistsRef.current.find((p) => p.id === id)
      if (pl) savePlaylist({ ...pl, name })
    },
    [savePlaylist],
  )

  const setPlaylistTracks = useCallback(
    (id, trackIds) => {
      const pl = playlistsRef.current.find((p) => p.id === id)
      if (pl) savePlaylist({ ...pl, trackIds })
    },
    [savePlaylist],
  )

  const togglePlaylistTrack = useCallback(
    (id, trackId) => {
      const pl = playlistsRef.current.find((p) => p.id === id)
      if (!pl) return
      const has = pl.trackIds.includes(trackId)
      savePlaylist({ ...pl, trackIds: has ? pl.trackIds.filter((x) => x !== trackId) : [...pl.trackIds, trackId] })
      notify(has ? `Quitada de «${pl.name}»` : `Añadida a «${pl.name}»`)
    },
    [savePlaylist, notify],
  )

  const removePlaylist = useCallback(async (id) => {
    playlistsRef.current = playlistsRef.current.filter((p) => p.id !== id)
    setPlaylists(playlistsRef.current)
    await deletePlaylist(id)
  }, [])

  return {
    tracks,
    playlists,
    loaded,
    importing,
    importFiles,
    removeTrack,
    toggleFavorite,
    createPlaylist,
    renamePlaylist,
    setPlaylistTracks,
    togglePlaylistTrack,
    removePlaylist,
  }
}
