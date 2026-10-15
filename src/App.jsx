import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HeartIcon, DownloadIcon, LibraryIcon, MusicIcon, PaletteIcon, PlusIcon, SearchIcon, SortIcon, XIcon } from './components/Icons'
import { NowPlaying } from './components/NowPlaying'
import { PlayerBar } from './components/PlayerBar'
import { Settings } from './components/Settings'
import { TrackList } from './components/TrackList'
import { useInstall } from './hooks/useInstall'
import { isAudio, useLibrary } from './hooks/useLibrary'
import { PlayerProvider, usePlayer } from './hooks/usePlayer'
import { loadPref, savePref } from './lib/format'

const SORTS = {
  added: { name: 'Recientes', fn: (a, b) => b.addedAt - a.addedAt },
  title: { name: 'Título', fn: (a, b) => a.title.localeCompare(b.title, 'es') },
  artist: { name: 'Artista', fn: (a, b) => a.artist.localeCompare(b.artist, 'es') || a.title.localeCompare(b.title, 'es') },
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
        <MusicIcon className="size-4" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">CrizPlay</span>
    </span>
  )
}

function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const notify = useCallback((msg, kind = 'info') => {
    clearTimeout(timer.current)
    setToast({ msg, kind, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])
  return [toast, notify]
}

export default function App() {
  const [toast, notify] = useToast()
  const library = useLibrary(notify)
  return (
    <PlayerProvider tracks={library.tracks}>
      <Shell library={library} toast={toast} />
    </PlayerProvider>
  )
}

function Shell({ library, toast }) {
  const { tracks, loaded, importing, importFiles, removeTrack, toggleFavorite } = library
  const player = usePlayer()
  const installer = useInstall()
  const [view, setView] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(() => loadPref('sort', 'added'))
  const [expanded, setExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => savePref('sort', sort), [sort])

  const favorites = tracks.filter((t) => t.favorite).length
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tracks
      .filter((t) => view === 'all' || t.favorite)
      .filter((t) => !q || `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q))
      .sort(SORTS[sort].fn)
  }, [tracks, view, query, sort])
  const totalMinutes = Math.round(visible.reduce((s, t) => s + (t.duration || 0), 0) / 60)

  const remove = useCallback(
    async (t) => {
      if (!confirm(`¿Eliminar «${t.title}» de tu biblioteca?`)) return
      player.forget(t.id)
      await removeTrack(t.id)
    },
    [player, removeTrack],
  )

  // Arrastrar y soltar archivos en cualquier parte de la ventana
  useEffect(() => {
    let depth = 0
    const hasFiles = (e) => e.dataTransfer?.types?.includes('Files')
    const enter = (e) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const over = (e) => hasFiles(e) && e.preventDefault()
    const drop = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      importFiles(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [importFiles])

  // Abrir archivos de audio con la app instalada ("Abrir con… CrizPlay")
  useEffect(() => {
    if (!('launchQueue' in window)) return
    window.launchQueue.setConsumer(async (params) => {
      if (!params.files?.length) return
      const files = await Promise.all(params.files.map((h) => h.getFile()))
      importFiles(files.filter(isAudio))
    })
  }, [importFiles])

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Space') {
        e.preventDefault()
        player.toggle()
      } else if (e.key === 'ArrowRight') {
        e.shiftKey ? player.next() : player.seek(player.time + 5)
      } else if (e.key === 'ArrowLeft') {
        e.shiftKey ? player.prev() : player.seek(Math.max(0, player.time - 5))
      } else if (e.key.toLowerCase() === 'm') player.toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player])

  const openPicker = () => fileInput.current?.click()
  const closeExpanded = useCallback(() => setExpanded(false), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const navItem = (id, label, Icon, count) => (
    <button
      onClick={() => setView(id)}
      aria-current={view === id ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        view === id ? 'bg-surface-2 font-medium text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg'
      }`}
    >
      <Icon className="size-[18px]" fill={id === 'fav' && view === id} />
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs tabular-nums text-muted">{count}</span>
    </button>
  )

  return (
    <div className="flex h-dvh flex-col">
      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
        multiple
        hidden
        onChange={(e) => {
          importFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="flex min-h-0 flex-1">
        {/* Barra lateral (escritorio) */}
        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface p-4 md:flex">
          <div className="px-1 pt-1">
            <Logo />
          </div>
          <nav className="space-y-1">
            {navItem('all', 'Biblioteca', LibraryIcon, tracks.length)}
            {navItem('fav', 'Favoritas', HeartIcon, favorites)}
          </nav>
          <button
            onClick={openPicker}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-sm text-muted transition-colors hover:border-muted hover:text-fg"
          >
            <PlusIcon className="size-4" /> Añadir música
          </button>
          <div className="mt-auto space-y-1">
            {installer.canInstall && (
              <button
                onClick={installer.install}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2/60 hover:text-fg"
              >
                <DownloadIcon className="size-[18px]" /> Instalar app
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2/60 hover:text-fg"
            >
              <PaletteIcon className="size-[18px]" /> Temas y colores
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Cabecera móvil */}
          <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
            <Logo />
            <div className="flex items-center gap-1">
              {installer.canInstall && (
                <button
                  onClick={installer.install}
                  className="grid size-10 place-items-center rounded-full text-muted hover:text-fg"
                  aria-label="Instalar app"
                >
                  <DownloadIcon />
                </button>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                className="grid size-10 place-items-center rounded-full text-muted hover:text-fg"
                aria-label="Temas y colores"
              >
                <PaletteIcon />
              </button>
            </div>
          </div>

          <header className="space-y-4 px-4 pt-4 pb-3 sm:px-6 md:pt-8">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {view === 'all' ? 'Biblioteca' : 'Favoritas'}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  {visible.length} {visible.length === 1 ? 'canción' : 'canciones'}
                  {totalMinutes > 0 && ` · ${totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min` : `${totalMinutes} min`}`}
                </p>
              </div>
              <button
                onClick={openPicker}
                className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
              >
                <PlusIcon className="size-4" />
                <span className="hidden sm:inline">Añadir</span>
              </button>
            </div>

            {/* Pestañas móviles */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 md:hidden">
              {[
                ['all', `Todas · ${tracks.length}`],
                ['fav', `Favoritas · ${favorites}`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`rounded-lg py-1.5 text-sm transition-colors ${
                    view === id ? 'bg-surface-2 font-medium text-fg' : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tracks.length > 0 && (
              <div className="flex gap-2">
                <label className="relative flex flex-1 items-center">
                  <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar canciones, artistas o álbumes"
                    className="h-10 w-full rounded-lg border border-line bg-surface pr-9 pl-9 text-sm placeholder:text-muted focus:border-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-2 grid size-6 place-items-center rounded-full text-muted hover:text-fg"
                      aria-label="Limpiar búsqueda"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                </label>
                <label className="relative flex items-center">
                  <SortIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-10 appearance-none rounded-lg border border-line bg-surface pr-3 pl-9 text-sm focus:border-muted focus:outline-none"
                    aria-label="Ordenar"
                  >
                    {Object.entries(SORTS).map(([id, s]) => (
                      <option key={id} value={id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!loaded ? null : tracks.length === 0 ? (
              <EmptyLibrary onPick={openPicker} />
            ) : visible.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-muted">
                {query ? `Sin resultados para «${query}»` : 'Aún no tienes favoritas. Toca el corazón de una canción.'}
              </p>
            ) : (
              <TrackList tracks={visible} onFavorite={toggleFavorite} onRemove={remove} />
            )}
          </div>
        </main>
      </div>

      <PlayerBar onExpand={() => setExpanded(true)} onFavorite={toggleFavorite} />

      {expanded && <NowPlaying onClose={closeExpanded} onFavorite={toggleFavorite} />}
      {settingsOpen && <Settings onClose={closeSettings} trackCount={tracks.length} install={installer} />}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-bg/80 p-6 backdrop-blur-sm">
          <div className="grid w-full max-w-md place-items-center gap-3 rounded-3xl border-2 border-dashed border-accent px-6 py-16 text-center">
            <MusicIcon className="size-10 text-accent" />
            <p className="text-lg font-medium">Suelta para añadir a tu biblioteca</p>
          </div>
        </div>
      )}

      {(importing || toast) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-28">
          <div
            key={importing ? 'importing' : toast.key}
            role="status"
            className={`animate-fade-up rounded-full border px-4 py-2 text-sm shadow-lg ${
              !importing && toast.kind === 'error'
                ? 'border-red-500/30 bg-red-500/15 text-red-600 backdrop-blur dark:text-red-300'
                : 'border-line bg-surface-2 text-fg'
            }`}
          >
            {importing ? `Guardando canciones… ${importing.done}/${importing.total}` : toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyLibrary({ onPick }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-surface">
        <MusicIcon className="size-9 text-muted" />
      </div>
      <h2 className="text-lg font-semibold">Tu biblioteca está vacía</h2>
      <p className="mt-2 text-sm text-balance text-muted">
        Añade archivos de audio desde tu dispositivo o arrástralos aquí. Se guardan en este navegador y podrás
        escucharlos sin conexión.
      </p>
      <button
        onClick={onPick}
        className="mt-6 flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
      >
        <PlusIcon className="size-4" /> Elegir canciones
      </button>
      <p className="mt-4 text-xs text-muted">MP3, M4A, AAC, OGG, OPUS, WAV y FLAC</p>
    </div>
  )
}
