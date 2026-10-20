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

// Con la app en segundo plano se pasa a la siguiente canción un poco antes del final:
// así la página nunca queda en silencio y el sistema no la congela entre canciones.
const EARLY_SWITCH = 0.35

const setPlaybackState = (s) => {
  if (navigator.mediaSession) navigator.mediaSession.playbackState = s
}

export function PlayerProvider({ tracks, children }) {
  const [audio] = useState(() => {
    const a = new Audio()
    a.preload = 'auto'
    return a
  })
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

  // La cola y la posición viven en refs que se actualizan AL INSTANTE: los eventos del
  // audio (que siguen llegando en segundo plano) no dependen de que React vuelva a dibujar.
  const queueRef = useRef([])
  const indexRef = useRef(-1)
  const prefs = useRef({})
  prefs.current = { shuffle, repeat, visualizer }

  const urlRef = useRef(null)
  const loadSeq = useRef(0)
  const viz = useRef(null)
  const upcoming = useRef(null) // { queue, from, index, id, shuffle, url }
  const pendingPlay = useRef(false)
  const autoAdvancing = useRef(false)
  const errorStreak = useRef(0)

  const setPosition = useCallback((q, i) => {
    queueRef.current = q
    indexRef.current = i
    setQueue(q)
    setIndex(i)
  }, [])

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
  const connectViz = useCallback(() => {
    if (!prefs.current.visualizer || !vizSupported) return
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
      if (v.ctx.state === 'suspended' && !document.hidden) v.ctx.resume().catch(() => {})
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

  // ¿Qué canción viene después? (null = fin de la cola sin repetir)
  const nextIndex = useCallback((auto) => {
    const q = queueRef.current
    const i = indexRef.current
    const { shuffle, repeat } = prefs.current
    if (!q.length) return null
    const up = upcoming.current
    if (up && up.queue === q && up.from === i && up.shuffle === shuffle) return up.index
    if (shuffle && q.length > 1) {
      let ni
      do ni = Math.floor(Math.random() * q.length)
      while (ni === i)
      return ni
    }
    if (i + 1 < q.length) return i + 1
    return auto && repeat === 'off' ? null : 0
  }, [])

  const dropUpcoming = () => {
    const up = upcoming.current
    if (up?.url && up.url !== urlRef.current) URL.revokeObjectURL(up.url)
    upcoming.current = null
  }

  // Precarga la siguiente canción (URL lista para usar al instante)
  const prepare = useCallback(() => {
    const q = queueRef.current
    const i = indexRef.current
    const { shuffle } = prefs.current
    if (i < 0 || q.length < 2) return dropUpcoming()
    const up = upcoming.current
    if (up && up.queue === q && up.from === i && up.shuffle === shuffle) return
    dropUpcoming()
    let ni = (i + 1) % q.length
    if (shuffle)
      do ni = Math.floor(Math.random() * q.length)
      while (ni === i)
    const plan = { queue: q, from: i, index: ni, id: q[ni], shuffle, url: null }
    upcoming.current = plan
    getFile(plan.id).then((blob) => {
      if (upcoming.current === plan && blob) plan.url = URL.createObjectURL(blob)
    })
  }, [])

  const load = useCallback(
    (id, autoplay = true) => {
      const seq = ++loadSeq.current
      const start = (url) => {
        if (seq !== loadSeq.current) return URL.revokeObjectURL(url)
        if (urlRef.current && urlRef.current !== url) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        audio.src = url
        autoAdvancing.current = false
        savePref('last', id)
        if (autoplay) tryPlay()
        prepare()
      }
      // Canción precargada: el cambio es inmediato y síncrono, sin esperar a IndexedDB
      const up = upcoming.current
      if (up?.id === id && up.url) {
        upcoming.current = null
        start(up.url)
        return
      }
      getFile(id).then((blob) => {
        if (blob && seq === loadSeq.current) start(URL.createObjectURL(blob))
      })
    },
    [audio, tryPlay, prepare],
  )

  const playQueue = useCallback(
    (ids, startId) => {
      const i = Math.max(0, ids.indexOf(startId))
      setPosition(ids, i)
      load(ids[i])
    },
    [load, setPosition],
  )

  const next = useCallback(
    (auto = false) => {
      const q = queueRef.current
      if (!q.length) return
      if (auto && prefs.current.repeat === 'one') {
        audio.currentTime = 0
        tryPlay()
        return
      }
      const ni = nextIndex(auto)
      if (ni == null) {
        // fin de la cola
        audio.pause()
        audio.currentTime = 0
        return
      }
      if (auto) autoAdvancing.current = true
      setPosition(q, ni)
      load(q[ni])
    },
    [audio, load, tryPlay, nextIndex, setPosition],
  )

  // force = cambiar de canción aunque ya lleve más de 3 s sonando (gesto de deslizar)
  const prev = useCallback(
    (force = false) => {
      const q = queueRef.current
      if (!q.length) return
      if (!force && audio.currentTime > 3) {
        audio.currentTime = 0
        return
      }
      const i = indexRef.current
      const ni = i - 1 < 0 ? q.length - 1 : i - 1
      setPosition(q, ni)
      load(q[ni])
    },
    [audio, load, setPosition],
  )

  const toggle = useCallback(() => {
    if (!audio.src) {
      const q = queueRef.current
      if (q.length) {
        setPosition(q, 0)
        load(q[0])
      }
      return
    }
    if (audio.paused) tryPlay()
    else audio.pause()
  }, [audio, load, tryPlay, setPosition])

  const seek = useCallback(
    (t) => {
      if (Number.isFinite(t)) audio.currentTime = t
    },
    [audio],
  )

  // Cuando se borra una pista, la quitamos de la cola
  const forget = useCallback(
    (id) => {
      const q = queueRef.current
      const i = indexRef.current
      const at = q.indexOf(id)
      if (at === -1) return
      const nq = q.filter((x) => x !== id)
      dropUpcoming()
      if (at === i) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        setPosition(nq, -1)
      } else {
        setPosition(nq, at < i ? i - 1 : i)
        prepare()
      }
    },
    [audio, setPosition, prepare],
  )

  // Eventos del elemento <audio>: toda la lógica de paso de canción vive aquí,
  // fuera del ciclo de render de React, para que funcione en segundo plano.
  useEffect(() => {
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
    // ¿Al terminar esta canción sonará otra? (en ese caso no anunciamos "pausa")
    const continues = () => prefs.current.repeat === 'one' || nextIndex(true) != null

    const on = {
      play: () => {
        setPlaying(true)
        setPlaybackState('playing')
      },
      playing: () => {
        errorStreak.current = 0
        connectViz()
        syncPosition()
        prepare()
      },
      pause: () => {
        // evento atrasado de la canción anterior (ya está sonando la nueva)
        if (!audio.paused) return
        // Al terminar una canción el navegador dispara "pause" justo antes de "ended".
        // Si va a seguir otra, no lo comunicamos: el sistema mantiene viva la app.
        if (audio.ended && continues()) return
        setPlaying(false)
        setPlaybackState('paused')
        syncPosition()
      },
      timeupdate: () => {
        if (!document.hidden || autoAdvancing.current || audio.paused) return
        if (prefs.current.repeat === 'one') return
        const left = audio.duration - audio.currentTime
        const up = upcoming.current
        const ready = up?.url && up.queue === queueRef.current && up.from === indexRef.current
        if (left > 0 && left < EARLY_SWITCH && ready) next(true)
      },
      durationchange: syncPosition,
      seeked: syncPosition,
      ended: () => {
        if (!autoAdvancing.current) next(true)
      },
      // Archivo dañado o ilegible: saltar al siguiente (sin bucles infinitos)
      error: () => {
        if (!audio.getAttribute('src')) return
        errorStreak.current++
        if (errorStreak.current < queueRef.current.length) next(false)
      },
    }
    for (const [e, fn] of Object.entries(on)) audio.addEventListener(e, fn)
    return () => {
      for (const [e, fn] of Object.entries(on)) audio.removeEventListener(e, fn)
    }
  }, [audio, next, nextIndex, prepare, connectViz])

  // Reintenta reproducir al volver a la app si el navegador lo bloqueó en segundo plano
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (pendingPlay.current) tryPlay()
      if (viz.current?.ctx.state === 'suspended') viz.current.ctx.resume().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [tryPlay])

  // Al activar/desactivar aleatorio se vuelve a elegir la siguiente
  useEffect(() => {
    prepare()
  }, [shuffle, prepare])

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
  // Repetir canción: bucle nativo del navegador. Nunca llega a "terminar",
  // así que se repite sin cortes y también en segundo plano.
  useEffect(() => {
    audio.loop = repeat === 'one'
    savePref('repeat', repeat)
  }, [audio, repeat])
  useEffect(() => savePref('visualizer', visualizer), [visualizer])

  // Restaura la última canción (en pausa) al abrir la app
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || !tracks.length) return
    restored.current = true
    const ids = tracks.map((t) => t.id)
    const last = loadPref('last', null)
    const i = ids.indexOf(last)
    setPosition(ids, i)
    if (i >= 0) load(last, false)
  }, [tracks, load, setPosition])

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
      artwork: art
        ? [{ src: art, sizes: '512x512', type: current.cover.type }]
        : [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
    })
  }, [current])

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
      prefs.current.shuffle = true
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
    // sin repetir → repetir canción → repetir lista
    cycleRepeat: () => {
      const r = { off: 'one', one: 'all', all: 'off' }[prefs.current.repeat] || 'off'
      prefs.current.repeat = r
      audio.loop = r === 'one'
      setRepeat(r)
    },
    getTime: () => audio.currentTime,
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
