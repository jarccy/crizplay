import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getFile } from '../lib/db'
import { loadPref, savePref } from '../lib/format'
import { coverUrl } from '../lib/covers'

const PlayerCtx = createContext(null)

export function PlayerProvider({ tracks, children }) {
  const [audio] = useState(() => new Audio())
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => loadPref('volume', 0.8))
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(() => loadPref('shuffle', false))
  const [repeat, setRepeat] = useState(() => loadPref('repeat', 'off')) // off | all | one
  const [visualizer, setVisualizer] = useState(() => loadPref('visualizer', true))
  const [analyser, setAnalyser] = useState(null)

  const currentId = queue[index]
  const current = tracks.find((t) => t.id === currentId) || null

  // Los manejadores de eventos leen siempre el estado más reciente
  const state = useRef({})
  state.current = { queue, index, shuffle, repeat, visualizer }
  const urlRef = useRef(null)
  const loadSeq = useRef(0)
  const graph = useRef(null)

  // Web Audio solo se crea si el visualizador está activo y tras un gesto del usuario
  const ensureGraph = useCallback(() => {
    if (!state.current.visualizer) return
    if (!graph.current) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      const ctx = new AC()
      const src = ctx.createMediaElementSource(audio)
      const an = ctx.createAnalyser()
      an.fftSize = 256
      an.smoothingTimeConstant = 0.82
      src.connect(an)
      an.connect(ctx.destination)
      graph.current = { ctx, an }
      setAnalyser(an)
    }
    if (graph.current.ctx.state === 'suspended') graph.current.ctx.resume()
  }, [audio])

  const load = useCallback(
    async (id, autoplay = true) => {
      const seq = ++loadSeq.current
      if (autoplay) ensureGraph()
      const blob = await getFile(id)
      if (seq !== loadSeq.current || !blob) return
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(blob)
      audio.src = urlRef.current
      savePref('last', id)
      if (autoplay) audio.play().catch(() => {})
    },
    [audio, ensureGraph],
  )

  const playQueue = useCallback(
    (ids, startId) => {
      const i = Math.max(0, ids.indexOf(startId))
      setQueue(ids)
      setIndex(i)
      load(ids[i])
    },
    [load],
  )

  const next = useCallback(
    (auto = false) => {
      const { queue, index, shuffle, repeat } = state.current
      if (!queue.length) return
      if (auto && repeat === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      let ni = index + 1
      if (shuffle && queue.length > 1) {
        do ni = Math.floor(Math.random() * queue.length)
        while (ni === index)
      }
      if (ni >= queue.length) {
        if (auto && repeat === 'off') {
          audio.pause()
          audio.currentTime = 0
          return
        }
        ni = 0
      }
      setIndex(ni)
      load(queue[ni])
    },
    [audio, load],
  )

  // force = cambiar de canción aunque ya lleve más de 3 s sonando (gesto de deslizar)
  const prev = useCallback((force = false) => {
    const { queue, index } = state.current
    if (!queue.length) return
    if (!force && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const ni = index - 1 < 0 ? queue.length - 1 : index - 1
    setIndex(ni)
    load(queue[ni])
  }, [audio, load])

  const toggle = useCallback(() => {
    if (!audio.src) {
      const { queue } = state.current
      if (queue.length) {
        setIndex(0)
        load(queue[0])
      }
      return
    }
    if (audio.paused) {
      ensureGraph()
      audio.play().catch(() => {})
    } else audio.pause()
  }, [audio, load, ensureGraph])

  const seek = useCallback(
    (t) => {
      if (Number.isFinite(t)) audio.currentTime = t
    },
    [audio],
  )

  // Cuando se borra una pista, la quitamos de la cola
  const forget = useCallback(
    (id) => {
      const { queue, index } = state.current
      const at = queue.indexOf(id)
      if (at === -1) return
      const nq = queue.filter((x) => x !== id)
      if (at === index) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        setTime(0)
        setDuration(0)
        setQueue(nq)
        setIndex(-1)
      } else {
        setQueue(nq)
        setIndex(at < index ? index - 1 : index)
      }
    },
    [audio],
  )

  // Eventos del elemento <audio>
  useEffect(() => {
    const on = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => setTime(audio.currentTime),
      durationchange: () => setDuration(audio.duration || 0),
      ended: () => next(true),
    }
    for (const [e, fn] of Object.entries(on)) audio.addEventListener(e, fn)
    return () => {
      for (const [e, fn] of Object.entries(on)) audio.removeEventListener(e, fn)
    }
  }, [audio, next])

  useEffect(() => {
    audio.volume = volume
    audio.muted = muted
    savePref('volume', volume)
  }, [audio, volume, muted])

  useEffect(() => savePref('shuffle', shuffle), [shuffle])
  useEffect(() => savePref('repeat', repeat), [repeat])
  useEffect(() => savePref('visualizer', visualizer), [visualizer])

  // Restaura la última canción (en pausa) al abrir la app
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || !tracks.length) return
    restored.current = true
    const ids = tracks.map((t) => t.id)
    const last = loadPref('last', null)
    const i = ids.indexOf(last)
    setQueue(ids)
    if (i >= 0) {
      setIndex(i)
      load(last, false)
    }
  }, [tracks, load])

  // Controles del sistema (pantalla de bloqueo, auriculares, teclas multimedia)
  useEffect(() => {
    const ms = navigator.mediaSession
    if (!ms) return
    const handlers = {
      play: () => toggle(),
      pause: () => audio.pause(),
      previoustrack: () => prev(true),
      nexttrack: () => next(),
      seekto: (d) => seek(d.seekTime),
      seekbackward: () => seek(audio.currentTime - 10),
      seekforward: () => seek(audio.currentTime + 10),
    }
    for (const [a, fn] of Object.entries(handlers)) {
      try {
        ms.setActionHandler(a, fn)
      } catch {
        // acción no soportada
      }
    }
  }, [audio, toggle, prev, next, seek])

  useEffect(() => {
    const ms = navigator.mediaSession
    if (!ms || !current) return
    const art = coverUrl(current)
    ms.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album,
      artwork: art ? [{ src: art, sizes: '512x512', type: current.cover.type }] : [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
    })
  }, [current])

  useEffect(() => {
    if (navigator.mediaSession) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  const value = {
    current,
    queue,
    playing,
    time,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    visualizer,
    analyser,
    playQueue,
    playShuffled: (ids) => {
      if (!ids.length) return
      setShuffle(true)
      playQueue(ids, ids[Math.floor(Math.random() * ids.length)])
    },
    toggle,
    next: () => next(false),
    prev: () => prev(false),
    prevTrack: () => prev(true),
    seek,
    forget,
    setVolume: (v) => {
      setVolume(v)
      if (v > 0) setMuted(false)
    },
    toggleMute: () => setMuted((m) => !m),
    toggleShuffle: () => setShuffle((s) => !s),
    cycleRepeat: () => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
    setVisualizer,
  }

  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>
}

export const usePlayer = () => useContext(PlayerCtx)
