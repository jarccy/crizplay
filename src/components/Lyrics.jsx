import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { formatTime } from '../lib/format'
import { findLyrics, looksLikeLrc, parseLrc, searchLyrics, stripLrc, toStoredLyrics } from '../lib/lyrics'
import { Sheet } from './Dialogs'
import { ClipboardIcon, SearchIcon, TrashIcon } from './Icons'

// Canciones ya consultadas en esta sesión (para no repetir búsquedas sin resultado)
const tried = new Set()

const chip =
  'flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40'

export function LyricsPanel({ track, onSave, onSearch, onPaste }) {
  const [status, setStatus] = useState('idle') // idle | loading | notfound | error | offline
  const lyrics = track.lyrics

  // Busca la letra automáticamente la primera vez y la guarda con la canción
  useEffect(() => {
    if (lyrics) return setStatus('idle')
    if (tried.has(track.id)) return setStatus((s) => (s === 'loading' ? 'notfound' : s))
    if (!navigator.onLine) return setStatus('offline')
    let cancelled = false
    tried.add(track.id)
    setStatus('loading')
    findLyrics(track)
      .then((hit) => {
        if (cancelled) return
        if (hit) onSave(track.id, toStoredLyrics(hit))
        else setStatus('notfound')
      })
      .catch(() => {
        tried.delete(track.id)
        if (!cancelled) setStatus(navigator.onLine ? 'error' : 'offline')
      })
    return () => {
      cancelled = true
    }
    // solo al cambiar de canción o si se quita la letra
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id, !!lyrics])

  if (!lyrics) {
    const messages = {
      loading: 'Buscando la letra…',
      notfound: 'No encontramos la letra de esta canción.',
      error: 'No se pudo conectar con el servicio de letras.',
      offline: 'Sin conexión. Conéctate para descargar la letra; después quedará guardada para escucharla sin internet.',
      idle: '',
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        {status === 'loading' && <span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent" />}
        <p className="max-w-xs text-sm text-balance text-muted">{messages[status]}</p>
        {status !== 'loading' && (
          <div className="flex flex-wrap justify-center gap-2">
            <button className={chip} onClick={onSearch}>
              <SearchIcon className="size-3.5" /> Buscar letra
            </button>
            <button className={chip} onClick={onPaste}>
              <ClipboardIcon className="size-3.5" /> Pegar letra
            </button>
          </div>
        )}
      </div>
    )
  }

  const setOffset = (delta) =>
    onSave(track.id, { ...lyrics, offset: Math.round(((lyrics.offset || 0) + delta) * 10) / 10 })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {lyrics.synced ? (
        <SyncedLyrics key={track.id} text={lyrics.synced} offset={lyrics.offset || 0} />
      ) : lyrics.instrumental && !lyrics.plain ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted">♪ Canción instrumental ♪</p>
      ) : (
        <div
          data-no-dismiss
          className="min-h-0 flex-1 overflow-y-auto py-6 text-lg leading-relaxed font-medium whitespace-pre-line text-fg/80 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]"
          style={{ touchAction: 'pan-y' }}
        >
          {lyrics.plain}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {lyrics.synced && (
          <div className="flex items-center rounded-full border border-line bg-surface/70 text-xs text-muted">
            <button
              className="px-2.5 py-1.5 transition-colors hover:text-fg"
              onClick={() => setOffset(-0.5)}
              title="Mostrar la letra antes"
              aria-label="Adelantar la letra medio segundo"
            >
              −0,5 s
            </button>
            <span className="min-w-12 text-center tabular-nums" title="Desfase de la letra">
              {(lyrics.offset || 0) > 0 ? '+' : ''}
              {(lyrics.offset || 0).toFixed(1).replace('.', ',')} s
            </span>
            <button
              className="px-2.5 py-1.5 transition-colors hover:text-fg"
              onClick={() => setOffset(0.5)}
              title="Mostrar la letra después"
              aria-label="Retrasar la letra medio segundo"
            >
              +0,5 s
            </button>
          </div>
        )}
        {!lyrics.synced && <span className="px-1 text-xs text-muted">Letra sin sincronizar</span>}
        <button className={chip} onClick={onSearch} title="Buscar otra letra">
          <SearchIcon className="size-3.5" /> Otra
        </button>
        <button
          className={`${chip} hover:!text-red-500`}
          onClick={() => {
            tried.add(track.id) // no volver a buscarla automáticamente
            onSave(track.id, null)
          }}
          title="Quitar letra"
          aria-label="Quitar letra"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// Letra sincronizada: resalta la línea actual y se desplaza sola
function SyncedLyrics({ text, offset }) {
  const { getTime, seek, playing, toggle } = usePlayer()
  const lines = useMemo(() => parseLrc(text), [text])
  const [active, setActive] = useState(-1)
  const activeRef = useRef(-1)
  const box = useRef(null)
  const refs = useRef([])
  const userScrollUntil = useRef(0)

  // Bucle por fotograma: más preciso que timeupdate (que solo llega ~4 veces por segundo)
  useEffect(() => {
    let raf
    const tick = () => {
      const t = getTime() - offset + 0.15 // pequeño adelanto: la línea aparece justo al cantarse
      let i = -1
      for (let k = 0; k < lines.length && lines[k].time <= t; k++) i = k
      if (i !== activeRef.current) {
        activeRef.current = i
        setActive(i)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [lines, offset, getTime])

  // Centra la línea activa (salvo si el usuario acaba de desplazarse a mano)
  useEffect(() => {
    const el = refs.current[active]
    const c = box.current
    if (!el || !c || Date.now() < userScrollUntil.current) return
    c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
  }, [active])

  const pauseAutoScroll = () => (userScrollUntil.current = Date.now() + 3500)

  return (
    <div
      ref={box}
      data-no-dismiss
      onWheel={pauseAutoScroll}
      onTouchStart={pauseAutoScroll}
      className="relative min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="space-y-1 py-[30vh]">
        {lines.map((l, i) => {
          const state = i === active ? 'now' : i < active ? 'past' : 'next'
          return (
            <button
              key={i}
              ref={(el) => (refs.current[i] = el)}
              onClick={() => {
                seek(l.time + offset)
                userScrollUntil.current = 0
                if (!playing) toggle()
              }}
              title={formatTime(l.time + offset)}
              className={`block w-full origin-left rounded-lg px-2 py-1.5 text-left text-xl leading-snug font-bold tracking-tight transition-all duration-300 hover:bg-fg/5 sm:text-2xl ${
                state === 'now' ? 'scale-100 text-fg' : state === 'past' ? 'scale-[0.97] text-fg/35' : 'scale-[0.97] text-fg/45'
              }`}
            >
              {l.text || '♪'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function LyricsSearchSheet({ track, onPick, onClose }) {
  const unknown = !track.artist || track.artist === 'Artista desconocido'
  const [query, setQuery] = useState(unknown ? track.title : `${track.artist} ${track.title}`)
  const [state, setState] = useState({ status: 'idle', results: [] })

  const run = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setState({ status: 'loading', results: [] })
    try {
      const results = await searchLyrics(query.trim())
      setState({ status: results.length ? 'done' : 'empty', results })
    } catch {
      setState({ status: navigator.onLine ? 'error' : 'offline', results: [] })
    }
  }

  useEffect(() => {
    run()
    // búsqueda inicial con el título de la canción
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Sheet title="Buscar letra" onClose={onClose}>
      <form onSubmit={run} className="sticky top-0 z-10 flex gap-2 border-b border-line bg-surface px-5 py-3">
        <label className="relative flex flex-1 items-center">
          <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artista y título"
            className="h-10 w-full rounded-lg border border-line bg-bg pr-3 pl-9 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
          />
        </label>
        <button className="rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90">
          Buscar
        </button>
      </form>

      {state.status === 'loading' && (
        <div className="grid place-items-center py-10">
          <span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      )}
      {state.status === 'empty' && <p className="px-5 py-10 text-center text-sm text-muted">Sin resultados. Prueba con otras palabras.</p>}
      {state.status === 'error' && <p className="px-5 py-10 text-center text-sm text-muted">No se pudo conectar con el servicio de letras.</p>}
      {state.status === 'offline' && <p className="px-5 py-10 text-center text-sm text-muted">Necesitas conexión a internet para buscar letras.</p>}

      {state.results.map((r) => {
        const near = track.duration && r.duration && Math.abs(r.duration - track.duration) <= 3
        const preview = (r.plain || stripLrc(r.synced || '')).split('\n').find(Boolean)
        return (
          <button
            key={r.id}
            onClick={() => {
              onPick(toStoredLyrics(r))
              onClose()
            }}
            className="flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors hover:bg-surface-2/60"
          >
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  r.synced ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted'
                }`}
              >
                {r.synced ? 'Sincronizada' : r.instrumental ? 'Instrumental' : 'Solo texto'}
              </span>
            </span>
            <span className="truncate text-xs text-muted">
              {r.artist}
              {r.album && ` · ${r.album}`} · <span className={near ? 'text-fg' : ''}>{formatTime(r.duration)}</span>
            </span>
            {preview && <span className="truncate text-xs text-muted/80 italic">«{preview}»</span>}
          </button>
        )
      })}
      <p className="px-5 py-4 text-center text-[11px] text-muted">Letras de LRCLIB.net</p>
    </Sheet>
  )
}

export function LyricsPasteSheet({ track, onSave, onClose }) {
  const [text, setText] = useState(track.lyrics?.synced || track.lyrics?.plain || '')
  const synced = looksLikeLrc(text)

  const save = () => {
    const value = text.trim()
    if (!value) return
    onSave(
      synced
        ? { synced: value, plain: stripLrc(value), instrumental: false, offset: 0, source: 'manual' }
        : { synced: null, plain: value, instrumental: false, offset: 0, source: 'manual' },
    )
    onClose()
  }

  return (
    <Sheet
      title="Pegar letra"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto self-center text-xs text-muted">
            {text.trim() ? (synced ? 'Formato LRC: se sincronizará' : 'Texto sin sincronizar') : ''}
          </span>
          <button className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-fg/10 hover:text-fg" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
            onClick={save}
            disabled={!text.trim()}
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-2 p-5">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={'Pega aquí la letra.\n\nPara que se sincronice usa formato LRC:\n[00:12.50] Primera línea\n[00:16.80] Segunda línea'}
          className="w-full resize-y rounded-lg border border-line bg-bg p-3 font-mono text-sm leading-relaxed placeholder:text-muted focus:border-muted focus:outline-none"
        />
      </div>
    </Sheet>
  )
}
