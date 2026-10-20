import { useEffect, useState } from 'react'
import { usePlayer, vizSupported } from '../hooks/usePlayer'
import { coverUrl } from '../lib/covers'
import { loadPref, savePref } from '../lib/format'
import { Cover } from './Cover'
import { Controls, Progress, Volume } from './Controls'
import { useDragDismiss } from '../hooks/useDragDismiss'
import { useSwipe } from '../hooks/useSwipe'
import { ChevronDownIcon, HeartIcon, ListPlusIcon, LyricsIcon } from './Icons'
import { LyricsPanel } from './Lyrics'
import { Visualizer } from './Visualizer'

export function NowPlaying({ onClose, onFavorite, onAddToPlaylist, onSaveLyrics, onLyricsSearch, onLyricsPaste }) {
  const { current, queue, visualizer, next, prevTrack } = usePlayer()
  const swipe = useSwipe({ onNext: next, onPrev: prevTrack, enabled: queue.length > 1 })
  const sheet = useDragDismiss(onClose)
  const { dismiss } = sheet
  const [showLyrics, setShowLyrics] = useState(() => loadPref('lyricsOpen', false))

  useEffect(() => savePref('lyricsOpen', showLyrics), [showLyrics])

  useEffect(() => {
    // Esc cierra solo el diálogo de arriba (búsqueda de letra, playlists…) si hay uno abierto
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const others = document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1
      if (!others) dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismiss])

  useEffect(() => {
    if (!current) onClose()
  }, [current, onClose])

  if (!current) return null
  const art = coverUrl(current)
  const position = queue.indexOf(current.id) + 1

  return (
    <div
      {...sheet.handlers}
      style={sheet.style}
      className="animate-rise fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Reproduciendo ahora"
    >
      {art && (
        <img
          src={art}
          alt=""
          className="pointer-events-none absolute inset-0 size-full scale-125 transform-gpu object-cover opacity-25 blur-3xl"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg/40 via-bg/70 to-bg" />

      {/* asa: indica que se puede deslizar hacia abajo */}
      <div className="relative mx-auto mt-[max(0.5rem,env(safe-area-inset-top))] h-1 w-10 shrink-0 rounded-full bg-fg/20 md:hidden" />

      <header className="relative flex items-center justify-between px-4 pt-2 md:pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-fg/10 hover:text-fg"
          onClick={dismiss}
          aria-label="Cerrar"
        >
          <ChevronDownIcon className="size-6" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Reproduciendo</p>
          {position > 0 && (
            <p className="text-xs tabular-nums text-muted/80">
              {position} de {queue.length}
            </p>
          )}
        </div>
        <button
          className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-fg/10 hover:text-fg"
          onClick={() => onAddToPlaylist(current)}
          aria-label="Añadir a playlist"
          title="Añadir a playlist"
        >
          <ListPlusIcon className="size-[22px]" />
        </button>
      </header>

      <main
        className={`relative mx-auto flex min-h-0 w-full flex-1 flex-col gap-6 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] ${
          showLyrics ? 'max-w-xl justify-end pt-2' : 'max-w-md justify-center'
        }`}
      >
        {showLyrics ? (
          <LyricsPanel
            track={current}
            onSave={onSaveLyrics}
            onSearch={() => onLyricsSearch(current)}
            onPaste={() => onLyricsPaste(current)}
          />
        ) : (
          <>
            <div
              {...swipe.handlers}
              style={swipe.style}
              className="w-full max-w-[min(100%,52vh)] cursor-grab self-center select-none active:cursor-grabbing"
              title={queue.length > 1 ? 'Desliza para cambiar de canción' : undefined}
            >
              <Cover
                track={current}
                className="pointer-events-none aspect-square w-full rounded-2xl shadow-2xl shadow-black/40"
                iconClass="size-1/4"
              />
            </div>

            {visualizer && vizSupported && <Visualizer className="h-12" bars={40} />}
          </>
        )}

        <div className="flex items-center gap-3">
          {showLyrics && <Cover track={current} className="size-12 rounded-md shadow-md" />}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">{current.title}</h2>
            <p className="truncate text-muted">
              {current.artist}
              {current.album && ` · ${current.album}`}
            </p>
          </div>
          <button
            className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-fg/10 ${
              showLyrics ? 'bg-accent !text-accent-fg hover:bg-accent' : 'text-muted hover:text-fg'
            }`}
            onClick={() => setShowLyrics((v) => !v)}
            aria-pressed={showLyrics}
            aria-label={showLyrics ? 'Ver carátula' : 'Ver letra'}
            title={showLyrics ? 'Ver carátula' : 'Ver letra'}
          >
            <LyricsIcon className="size-5" />
          </button>
          <button
            className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-fg/10 ${
              current.favorite ? 'text-accent' : 'text-muted'
            }`}
            onClick={() => onFavorite(current.id)}
            aria-label={current.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          >
            <HeartIcon className="size-6" fill={current.favorite} />
          </button>
        </div>

        <Progress />
        <Controls large />
        <Volume className="hidden justify-center sm:flex" />
      </main>
    </div>
  )
}
