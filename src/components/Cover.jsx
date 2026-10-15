import { coverUrl } from '../lib/covers'
import { MusicIcon } from './Icons'

export function Cover({ track, className = '', iconClass = 'size-1/3' }) {
  const url = coverUrl(track)
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden bg-surface-2 ${className}`}>
      {url ? (
        <img src={url} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
      ) : (
        <MusicIcon className={`${iconClass} text-muted`} />
      )}
    </div>
  )
}

export function Equalizer({ paused, className = '' }) {
  return (
    <span className={`eq inline-flex h-3.5 items-end gap-0.5 ${paused ? 'paused' : ''} ${className}`} aria-hidden="true">
      <span className="h-full w-0.75 rounded-full bg-accent" />
      <span className="h-full w-0.75 rounded-full bg-accent" />
      <span className="h-full w-0.75 rounded-full bg-accent" />
    </span>
  )
}
