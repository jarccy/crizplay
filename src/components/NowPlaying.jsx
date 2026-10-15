import { useEffect } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { coverUrl } from '../lib/covers'
import { Cover } from './Cover'
import { Controls, Progress, Volume } from './Controls'
import { ChevronDownIcon, HeartIcon } from './Icons'
import { Visualizer } from './Visualizer'

export function NowPlaying({ onClose, onFavorite }) {
  const { current, queue, visualizer } = usePlayer()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!current) onClose()
  }, [current, onClose])

  if (!current) return null
  const art = coverUrl(current)
  const position = queue.indexOf(current.id) + 1

  return (
    <div
      className="animate-rise fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Reproduciendo ahora"
    >
      {art && (
        <img
          src={art}
          alt=""
          className="pointer-events-none absolute inset-0 size-full scale-125 object-cover opacity-25 blur-3xl"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg/40 via-bg/70 to-bg" />

      <header className="relative flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-fg/10 hover:text-fg"
          onClick={onClose}
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
        <span className="size-10" />
      </header>

      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Cover
          track={current}
          className="aspect-square w-full max-w-[min(100%,52vh)] self-center rounded-2xl shadow-2xl shadow-black/40"
          iconClass="size-1/4"
        />

        {visualizer && <Visualizer className="h-12" bars={40} />}

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">{current.title}</h2>
            <p className="truncate text-muted">
              {current.artist}
              {current.album && ` · ${current.album}`}
            </p>
          </div>
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
