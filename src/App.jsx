import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddToPlaylistSheet, InstallHelpSheet, NameDialog, PickTracksSheet, TrackActionsSheet } from './components/Dialogs'
import {
  ChevronLeftIcon,
  DownloadIcon,
  HeartIcon,
  LibraryIcon,
  MusicIcon,
  PaletteIcon,
  PencilIcon,
  PlayIcon,
  PlaylistIcon,
  PlusIcon,
  SearchIcon,
  ShuffleIcon,
  SortIcon,
  TrashIcon,
  XIcon,
} from './components/Icons'
import { NowPlaying } from './components/NowPlaying'
import { PlayerBar } from './components/PlayerBar'
import { PlaylistCover, PlaylistGrid } from './components/Playlists'
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

const songs = (n) => `${n} ${n === 1 ? 'canción' : 'canciones'}`

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
  const { tracks, playlists, loaded, importing, importFiles, removeTrack, toggleFavorite } = library
  const player = usePlayer()
  const installer = useInstall()
  // vista: 'all' | 'fav' | 'lists' | 'pl:<id>'
  const [view, setView] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(() => loadPref('sort', 'added'))
  const [expanded, setExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => savePref('sort', sort), [sort])

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const playlist = view.startsWith('pl:') ? playlists.find((p) => p.id === view.slice(3)) : null
  const favorites = tracks.filter((t) => t.favorite).length

  // si se borra la playlist abierta, volvemos a la lista de playlists
  useEffect(() => {
    if (view.startsWith('pl:') && loaded && !playlist) setView('lists')
  }, [view, playlist, loaded])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (t) => !q || `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q)
    if (playlist) return playlist.trackIds.map((id) => byId.get(id)).filter(Boolean).filter(match)
    if (view === 'lists') return []
    return tracks.filter((t) => (view === 'all' || t.favorite) && match(t)).sort(SORTS[sort].fn)
  }, [tracks, byId, playlist, view, query, sort])
  const totalMinutes = Math.round(visible.reduce((s, t) => s + (t.duration || 0), 0) / 60)
  const visibleIds = visible.map((t) => t.id)

  const go = (v) => {
    setView(v)
    setQuery('')
  }
  const closeDialog = useCallback(() => setDialog(null), [])

  const requestInstall = async () => {
    const shown = await installer.install()
    if (!shown) setDialog({ type: 'installHelp' })
  }

  const removeFromLibrary = useCallback(
    async (t) => {
      if (!confirm(`¿Eliminar «${t.title}» de tu biblioteca?`)) return
      player.forget(t.id)
      await removeTrack(t.id)
    },
    [player, removeTrack],
  )

  const onRemove = (t) => {
    if (playlist) library.setPlaylistTracks(playlist.id, playlist.trackIds.filter((id) => id !== t.id))
    else removeFromLibrary(t)
  }

  const newPlaylist = (trackIds = []) =>
    setDialog({
      type: 'name',
      title: 'Nueva playlist',
      submitLabel: 'Crear',
      onSubmit: async (name) => {
        const pl = await library.createPlaylist(name, trackIds)
        if (!trackIds.length) go(`pl:${pl.id}`)
      },
    })

  const addToPlaylist = (track) => setDialog({ type: 'addTo', track })

  const deletePlaylist = () => {
    if (!confirm(`¿Eliminar la playlist «${playlist.name}»? Las canciones seguirán en tu biblioteca.`)) return
    library.removePlaylist(playlist.id)
    go('lists')
  }

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
      if (dialog || e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Space') {
        e.preventDefault()
        player.toggle()
      } else if (e.key === 'ArrowRight') {
        e.shiftKey ? player.next() : player.seek(player.time + 5)
      } else if (e.key === 'ArrowLeft') {
        e.shiftKey ? player.prevTrack() : player.seek(Math.max(0, player.time - 5))
      } else if (e.key.toLowerCase() === 'm') player.toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, dialog])

  const openPicker = () => fileInput.current?.click()
  const closeExpanded = useCallback(() => setExpanded(false), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const navItem = (id, label, Icon, count) => {
    const active = view === id || (id === 'lists' && playlist)
    return (
      <button
        onClick={() => go(id)}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          active ? 'bg-surface-2 font-medium text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg'
        }`}
      >
        <Icon className="size-[18px]" fill={id === 'fav' && active} />
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs text-muted tabular-nums">{count}</span>
      </button>
    )
  }

  const sideBtn =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2/60 hover:text-fg'
  const iconBtn = 'grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-fg/10 hover:text-fg'

  const title = playlist ? playlist.name : { all: 'Biblioteca', fav: 'Favoritas', lists: 'Playlists' }[view]
  const subtitle =
    view === 'lists'
      ? `${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`
      : `${songs(visible.length)}${
          totalMinutes > 0
            ? ` · ${totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min` : `${totalMinutes} min`}`
            : ''
        }`
  const showSearch = view !== 'lists' && (playlist ? playlist.trackIds.length > 0 : tracks.length > 0)

  let body
  if (!loaded) body = null
  else if (view === 'lists')
    body = <PlaylistGrid playlists={playlists} byId={byId} onOpen={(id) => go(`pl:${id}`)} onCreate={() => newPlaylist()} />
  else if (tracks.length === 0) body = <EmptyLibrary onPick={openPicker} />
  else if (playlist && playlist.trackIds.length === 0)
    body = (
      <EmptyState
        icon={PlaylistIcon}
        title="Esta playlist está vacía"
        text="Elige canciones de tu biblioteca para añadirlas."
        action="Añadir canciones"
        onAction={() => setDialog({ type: 'pick', playlistId: playlist.id })}
      />
    )
  else if (visible.length === 0)
    body = (
      <p className="px-6 py-16 text-center text-sm text-muted">
        {query ? `Sin resultados para «${query}»` : 'Aún no tienes favoritas. Toca el corazón de una canción.'}
      </p>
    )
  else
    body = (
      <TrackList
        tracks={visible}
        inPlaylist={!!playlist}
        onFavorite={toggleFavorite}
        onRemove={onRemove}
        onAddToPlaylist={addToPlaylist}
        onMore={(track) => setDialog({ type: 'actions', track })}
      />
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
            {navItem('lists', 'Playlists', PlaylistIcon, playlists.length)}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Tus playlists</span>
              <button
                onClick={() => newPlaylist()}
                className="grid size-6 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                aria-label="Nueva playlist"
                title="Nueva playlist"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {playlists.length === 0 && <p className="px-3 py-2 text-xs text-muted">Aún no hay playlists</p>}
              {playlists.map((pl) => {
                const active = playlist?.id === pl.id
                const playingHere = player.playing && player.current && pl.trackIds.includes(player.current.id)
                return (
                  <button
                    key={pl.id}
                    onClick={() => go(`pl:${pl.id}`)}
                    className={`flex w-full items-center gap-2 truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                      active ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <span className="flex-1 truncate">{pl.name}</span>
                    {playingHere && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={openPicker}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-sm text-muted transition-colors hover:border-muted hover:text-fg"
            >
              <PlusIcon className="size-4" /> Añadir música
            </button>
            {!installer.installed && (
              <button onClick={requestInstall} className={sideBtn}>
                <DownloadIcon className="size-[18px]" /> Instalar app
              </button>
            )}
            <button onClick={() => setSettingsOpen(true)} className={sideBtn}>
              <PaletteIcon className="size-[18px]" /> Temas y colores
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {/* Cabecera móvil */}
          <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
            <Logo />
            <div className="flex items-center gap-1">
              {!installer.installed && (
                <button onClick={requestInstall} className={iconBtn} aria-label="Instalar app">
                  <DownloadIcon />
                </button>
              )}
              <button onClick={() => setSettingsOpen(true)} className={iconBtn} aria-label="Temas y colores">
                <PaletteIcon />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <header className="space-y-4 px-4 pt-4 pb-3 sm:px-6 md:pt-8">
              {/* Pestañas móviles */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1 md:hidden">
                {[
                  ['all', 'Todas'],
                  ['fav', 'Favoritas'],
                  ['lists', 'Playlists'],
                ].map(([id, label]) => {
                  const active = view === id || (id === 'lists' && playlist)
                  return (
                    <button
                      key={id}
                      onClick={() => go(id)}
                      className={`rounded-lg py-1.5 text-sm transition-colors ${
                        active ? 'bg-surface-2 font-medium text-fg' : 'text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {playlist && (
                <button
                  onClick={() => go('lists')}
                  className="-ml-1 flex items-center gap-1 text-sm text-muted transition-colors hover:text-fg"
                >
                  <ChevronLeftIcon className="size-4" /> Playlists
                </button>
              )}

              <div className="flex items-end justify-between gap-4">
                <div className="flex min-w-0 items-end gap-4">
                  {playlist && (
                    <PlaylistCover
                      tracks={playlist.trackIds.map((id) => byId.get(id)).filter(Boolean)}
                      className="size-20 shrink-0 rounded-xl shadow-md sm:size-28"
                    />
                  )}
                  <div className="min-w-0">
                    {playlist && <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Playlist</p>}
                    <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                    <p className="mt-1 text-sm text-muted">{subtitle}</p>
                  </div>
                </div>
                {view === 'lists' ? (
                  <button
                    onClick={() => newPlaylist()}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
                  >
                    <PlusIcon className="size-4" />
                    <span className="hidden sm:inline">Nueva</span>
                  </button>
                ) : playlist ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() =>
                        setDialog({
                          type: 'name',
                          title: 'Renombrar playlist',
                          initial: playlist.name,
                          onSubmit: (name) => library.renamePlaylist(playlist.id, name),
                        })
                      }
                      className={iconBtn}
                      aria-label="Renombrar playlist"
                      title="Renombrar"
                    >
                      <PencilIcon className="size-[18px]" />
                    </button>
                    <button onClick={deletePlaylist} className={`${iconBtn} hover:!text-red-500`} aria-label="Eliminar playlist" title="Eliminar playlist">
                      <TrashIcon className="size-[18px]" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={openPicker}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
                  >
                    <PlusIcon className="size-4" />
                    <span className="hidden sm:inline">Añadir</span>
                  </button>
                )}
              </div>

              {view !== 'lists' && (visible.length > 0 || playlist) && (
                <div className="flex flex-wrap items-center gap-2">
                  {visible.length > 0 && (
                    <>
                      <button
                        onClick={() => player.playQueue(visibleIds, visibleIds[0])}
                        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
                      >
                        <PlayIcon className="size-4" /> Reproducir
                      </button>
                      <button
                        onClick={() => player.playShuffled(visibleIds)}
                        className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
                      >
                        <ShuffleIcon className="size-4" /> Aleatorio
                      </button>
                    </>
                  )}
                  {playlist && (
                    <button
                      onClick={() => setDialog({ type: 'pick', playlistId: playlist.id })}
                      className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
                    >
                      <PlusIcon className="size-4" /> Añadir canciones
                    </button>
                  )}
                </div>
              )}

              {showSearch && (
                <div className="flex gap-2">
                  <label className="relative flex flex-1 items-center">
                    <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={playlist ? 'Buscar en la playlist' : 'Buscar canciones, artistas o álbumes'}
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
                  {!playlist && (
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
                  )}
                </div>
              )}
            </header>

            {body}
          </div>
        </main>
      </div>

      <PlayerBar onExpand={() => setExpanded(true)} onFavorite={toggleFavorite} />

      {expanded && <NowPlaying onClose={closeExpanded} onFavorite={toggleFavorite} onAddToPlaylist={addToPlaylist} />}
      {settingsOpen && (
        <Settings onClose={closeSettings} trackCount={tracks.length} installed={installer.installed} onInstall={requestInstall} />
      )}

      {dialog?.type === 'name' && <NameDialog {...dialog} onClose={closeDialog} />}
      {dialog?.type === 'addTo' && (
        <AddToPlaylistSheet
          track={dialog.track}
          playlists={playlists}
          onToggle={(pid) => library.togglePlaylistTrack(pid, dialog.track.id)}
          onCreate={() => newPlaylist([dialog.track.id])}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'pick' && playlist && (
        <PickTracksSheet
          playlist={playlist}
          tracks={tracks}
          onSave={(ids) => library.setPlaylistTracks(playlist.id, ids)}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'actions' && (
        <TrackActionsSheet
          track={byId.get(dialog.track.id) || dialog.track}
          inPlaylist={!!playlist}
          onAddToPlaylist={addToPlaylist}
          onFavorite={toggleFavorite}
          onRemove={onRemove}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'installHelp' && <InstallHelpSheet onClose={closeDialog} />}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-bg/80 p-6 backdrop-blur-sm">
          <div className="grid w-full max-w-md place-items-center gap-3 rounded-3xl border-2 border-dashed border-accent px-6 py-16 text-center">
            <MusicIcon className="size-10 text-accent" />
            <p className="text-lg font-medium">Suelta para añadir a tu biblioteca</p>
          </div>
        </div>
      )}

      {(importing || toast) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-28">
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

function EmptyState({ icon: Icon, title, text, action, onAction, note }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-surface">
        <Icon className="size-9 text-muted" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-balance text-muted">{text}</p>
      <button
        onClick={onAction}
        className="mt-6 flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
      >
        <PlusIcon className="size-4" /> {action}
      </button>
      {note && <p className="mt-4 text-xs text-muted">{note}</p>}
    </div>
  )
}

function EmptyLibrary({ onPick }) {
  return (
    <EmptyState
      icon={MusicIcon}
      title="Tu biblioteca está vacía"
      text="Añade archivos de audio desde tu dispositivo o arrástralos aquí. Se guardan en este navegador y podrás escucharlos sin conexión."
      action="Elegir canciones"
      onAction={onPick}
      note="MP3, M4A, AAC, OGG, OPUS, WAV y FLAC"
    />
  )
}
