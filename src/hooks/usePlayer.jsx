import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getFile } from '../lib/db'
import { loadPref, savePref } from '../lib/format'
import { coverUrl } from '../lib/covers'

const PlayerCtx = createContext(null)

// captureStream existe en Chrome/Edge/Android. En Safari/iOS no: allí no hay visualizador,
// pero así nunca desviamos el audio por Web Audio (que se corta en segundo plano).
export const vizSupported =
  typeof HTMLMediaElement !== 'undefined' &&
  typeof HTMLMediaElement.prototype.captureStream === 'function' &&
  // en Firefox capturar el audio silencia el elemento
  !('mozCaptureStream' in HTMLMediaElement.prototype) &&
  !!(window.AudioContext || window.webkitAudioContext)

export function PlayerProvider({ tracks, children }) {
  const [audio] = useState(() => new Audio())
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
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
  const viz = useRef(null)
  const upcoming = useRef(null) // siguiente canción ya preparada: { queue, from, index, id, url }
  const pendingPlay = useRef(false)

  // Si el navegador bloquea play() (p. ej. en segundo plano), se reintenta al volver
  const tryPlay = useCallback(() => {
    audio.play().then(
      () => (pendingPlay.current = false),
      (e) => {
        if (e?.name === 'NotAllowedError') pendingPlay.current = true
      },
    )
  }, [audio])

  // Visualizador: escucha una COPIA del audio (captureStream) sin desviar la salida.
  // Así, aunque el navegador suspenda Web Audio en segundo plano, la música sigue sonando
  // por el elemento <audio>. Si el navegador no tiene captureStream, no hay visualizador.
  const connectViz = useCallback(() => {
    if (!state.current.visualizer || !vizSupported) return
    try {
      if (!viz.current) {
        const AC = window.AudioContext || window.webkitAudioContext
        const ctx = new AC()
        const an = ctx.createAnalyser()
        an.fftSize = 256
        an.smoothingTimeConstant = 0.82
        const stream = audio.captureStream()
        viz.current = { ctx, an, stream, track: null, src: null }
        stream.addEventListener('addtrack', () => connectViz())
        setAnalyser(an)
      }
      const v = viz.current
      if (v.ctx.state === 'suspended') v.ctx.resume().catch(() => {})
      const track = v.stream.getAudioTracks().find((t) => t.readyState === 'live')
      if (track && track !== v.track) {
        v.src?.disconnect()
        v.src = v.ctx.createMediaStreamSource(new MediaStream([track]))
        v.src.connect(v.an) // el analizador NO se conecta a los altavoces
        v.track = track
      }
    } catch {
      // sin visualizador; la reproducción no se ve afectada
    }
  }, [audio])

  const load = useCallback(
    (id, autoplay = true) => {
      const seq = ++loadSeq.current
      const start = (url) => {
        if (seq !== loadSeq.current) return URL.revokeObjectURL(url)
        if (urlRef.current && urlRef.current !== url) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        audio.src = url
        savePref('last', id)
        if (autoplay) tryPlay()
      }
      // Si la canción ya estaba precargada, se cambia al instante (sin esperar a IndexedDB):
      // clave para que el paso de canción funcione con la app en segundo plano.
      const up = upcoming.current
      if (up?.id === id) {
        upcoming.current = null
        start(up.url)
        return
      }
      getFile(id).then((blob) => {
        if (blob && seq === loadSeq.current) start(URL.createObjectURL(blob))
      })
    },
    [audio, tryPlay],
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
        tryPlay()
        return
      }
      const up = upcoming.current
      let ni = index + 1
      if (shuffle && queue.length > 1) {
        // usa la canción aleatoria que ya se precargó
        if (up && up.queue === queue && up.from === index) ni = up.index
        else
          do ni = Math.floor(Math.random() * queue.length)
          while (ni === index)
      } else if (ni >= queue.length) {
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
    [audio, load, tryPlay],
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
    if (audio.paused) tryPlay()
    else audio.pause()
  }, [audio, load, tryPlay])

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
    // posición para la notificación / pantalla de bloqueo
    const syncPosition = () => {
      try {
        if (audio.duration > 0)
          navigator.mediaSession?.setPositionState?.({
            duration: audio.duration,
            position: Math.min(audio.currentTime, audio.duration),
            playbackRate: audio.playbackRate || 1,
          })
      } catch {
        // no soportado
      }
    }
    const on = {
      play: () => setPlaying(true),
      playing: () => {
        connectViz()
        syncPosition()
      },
      pause: () => {
        setPlaying(false)
        syncPosition()
      },
      durationchange: syncPosition,
      seeked: syncPosition,
      ended: () => next(true),
    }
    for (const [e, fn] of Object.entries(on)) audio.addEventListener(e, fn)
    return () => {
      for (const [e, fn] of Object.entries(on)) audio.removeEventListener(e, fn)
    }
  }, [audio, next, connectViz])

  // Reintenta reproducir al volver a la app si el navegador lo bloqueó en segundo plano
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (pendingPlay.current) tryPlay()
      viz.current?.ctx.state === 'suspended' && viz.current.ctx.resume().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [tryPlay])

  // Precarga la siguiente canción para cambiar sin esperas (también en segundo plano)
  useEffect(() => {
    if (index < 0 || queue.length < 2) return
    let ni = (index + 1) % queue.length
    if (shuffle)
      do ni = Math.floor(Math.random() * queue.length)
      while (ni === index)
    const id = queue[ni]
    let cancelled = false
    getFile(id).then((blob) => {
      if (cancelled || !blob) return
      const old = upcoming.current
      if (old && old.url !== urlRef.current) URL.revokeObjectURL(old.url)
      upcoming.current = { queue, from: index, index: ni, id, url: URL.createObjectURL(blob) }
    })
    return () => {
      cancelled = true
    }
  }, [queue, index, shuffle])

  // Activar el visualizador mientras suena
  useEffect(() => {
    if (visualizer && !audio.paused) connectViz()
  }, [visualizer, audio, connectViz])

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
    seekBy: (delta) => seek(Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0))),
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

  return (
    <PlayerCtx.Provider value={value}>
      <TimeProvider audio={audio}>{children}</TimeProvider>
    </PlayerCtx.Provider>
  )
}

export const usePlayer = () => useContext(PlayerCtx)

// El tiempo cambia varias veces por segundo: va en su propio contexto para que
// solo se vuelvan a dibujar las barras de progreso y no toda la aplicación.
const TimeCtx = createContext({ time: 0, duration: 0 })

function TimeProvider({ audio, children }) {
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const onTime = () => setTime(audio.currentTime)
    const onDuration = () => setDuration(audio.duration || 0)
    const onEmptied = () => {
      setTime(0)
      setDuration(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('seeking', onTime)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('emptied', onEmptied)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('seeking', onTime)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('emptied', onEmptied)
    }
  }, [audio])

  const value = useMemo(() => ({ time, duration }), [time, duration])
  return <TimeCtx.Provider value={value}>{children}</TimeCtx.Provider>
}

export const useTime = () => useContext(TimeCtx)
