import { usePlayer } from '../hooks/usePlayer'
import { formatTime } from '../lib/format'
import { Cover, Equalizer } from './Cover'
import { HeartIcon, PlayIcon, TrashIcon } from './Icons'

export function TrackList({ tracks, onFavorite, onRemove }) {
  const { current, playing, playQueue, toggle } = usePlayer()
  const ids = tracks.map((t) => t.id)

  return (
    <ul className="px-2 pb-4 sm:px-4" role="list">
      <li className="sticky top-0 z-10 hidden grid-cols-[2.5rem_1fr_1fr_4.5rem_4.5rem] items-center gap-3 border-b border-line bg-bg/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted backdrop-blur md:grid">
        <span className="text-center">#</span>
        <span>Título</span>
        <span>Álbum</span>
        <span className="text-right">Duración</span>
        <span />
      </li>
      {tracks.map((t, i) => {
        const isCurrent = current?.id === t.id
        return (
          <li
            key={t.id}
            className={`group grid cursor-default grid-cols-[1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface md:grid-cols-[2.5rem_1fr_1fr_4.5rem_4.5rem] md:px-3 ${
              isCurrent ? 'bg-surface' : ''
            }`}
            onDoubleClick={() => playQueue(ids, t.id)}
          >
            <span className="hidden place-items-center text-sm tabular-nums text-muted md:grid">
              {isCurrent ? (
                <Equalizer paused={!playing} />
              ) : (
                <>
                  <span className="group-hover:hidden">{i + 1}</span>
                  <button
                    className="hidden text-fg group-hover:block"
                    onClick={() => playQueue(ids, t.id)}
                    aria-label={`Reproducir ${t.title}`}
                  >
                    <PlayIcon className="size-4" />
                  </button>
                </>
              )}
            </span>

            <button
              className="flex min-w-0 items-center gap-3 text-left"
              onClick={() => (isCurrent ? toggle() : playQueue(ids, t.id))}
            >
              <Cover track={t} className="size-11 rounded-md md:size-10" />
              <span className="min-w-0">
                <span className={`block truncate text-sm font-medium ${isCurrent ? 'text-accent' : ''}`}>{t.title}</span>
                <span className="block truncate text-[13px] text-muted">
                  {t.artist}
                  <span className="md:hidden"> · {formatTime(t.duration)}</span>
                </span>
              </span>
            </button>

            <span className="hidden truncate text-[13px] text-muted md:block">{t.album || '—'}</span>
            <span className="hidden text-right text-[13px] tabular-nums text-muted md:block">{formatTime(t.duration)}</span>

            <span className="flex items-center justify-end gap-0.5">
              <button
                className={`grid size-9 place-items-center rounded-full transition-colors hover:text-fg ${
                  t.favorite ? 'text-accent' : 'text-muted md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'
                }`}
                onClick={() => onFavorite(t.id)}
                aria-label={t.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                aria-pressed={t.favorite}
              >
                <HeartIcon className="size-[18px]" fill={t.favorite} />
              </button>
              <button
                className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                onClick={() => onRemove(t)}
                aria-label={`Eliminar ${t.title}`}
              >
                <TrashIcon className="size-[17px]" />
              </button>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
