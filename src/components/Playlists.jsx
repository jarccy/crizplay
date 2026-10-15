import { usePlayer } from '../hooks/usePlayer'
import { Cover } from './Cover'
import { PlayIcon, PlaylistIcon, PlusIcon } from './Icons'

// Mosaico con las portadas de las 4 primeras canciones
export function PlaylistCover({ tracks, className = '' }) {
  if (tracks.length === 0) {
    return (
      <div className={`grid place-items-center bg-surface-2 ${className}`}>
        <PlaylistIcon className="size-1/3 text-muted" />
      </div>
    )
  }
  if (tracks.length < 4) return <Cover track={tracks[0]} className={className} iconClass="size-1/3" />
  return (
    <div className={`grid grid-cols-2 overflow-hidden ${className}`}>
      {tracks.slice(0, 4).map((t) => (
        <Cover key={t.id} track={t} className="size-full" iconClass="size-1/3" />
      ))}
    </div>
  )
}

export function PlaylistGrid({ playlists, byId, onOpen, onCreate }) {
  const { playQueue } = usePlayer()
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 xl:grid-cols-5">
      <button
        onClick={onCreate}
        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm text-muted transition-colors hover:border-muted hover:text-fg"
      >
        <PlusIcon className="size-7" />
        Nueva playlist
      </button>
      {playlists.map((pl) => {
        const tracks = pl.trackIds.map((id) => byId.get(id)).filter(Boolean)
        return (
          <div key={pl.id} className="group relative min-w-0">
            <button onClick={() => onOpen(pl.id)} className="block w-full text-left">
              <PlaylistCover tracks={tracks} className="aspect-square w-full rounded-xl shadow-sm" />
              <span className="mt-2 block truncate text-sm font-medium">{pl.name}</span>
              <span className="block text-xs text-muted">
                {tracks.length} {tracks.length === 1 ? 'canción' : 'canciones'}
              </span>
            </button>
            {tracks.length > 0 && (
              <button
                onClick={() => playQueue(tracks.map((t) => t.id), tracks[0].id)}
                className="absolute right-2 bottom-14 grid size-11 translate-y-1 place-items-center rounded-full bg-accent text-accent-fg opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
                aria-label={`Reproducir ${pl.name}`}
              >
                <PlayIcon className="size-5 translate-x-px" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
