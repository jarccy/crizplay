import { useRef } from 'react'
import { usePlayer, useTime } from '../hooks/usePlayer'
import { useSwipe } from '../hooks/useSwipe'
import { Cover } from './Cover'
import { Controls, Progress, Volume } from './Controls'
import { HeartIcon } from './Icons'

// Línea de progreso fina (móvil): componente aparte para que solo él se redibuje con el tiempo
function MiniProgress() {
  const { time, duration } = useTime()
  const pct = duration ? (time / duration) * 100 : 0
  return (
    <div className="absolute inset-x-0 top-0 h-0.5 bg-fg/10 md:hidden">
      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  )
}

// controles que tienen su propia acción y no deben abrir el reproductor
const INTERACTIVE = 'button:not([data-expand]), input, select, a, label'

export function PlayerBar({ onExpand, onFavorite }) {
  const { current, queue, next, prevTrack } = usePlayer()
  const swipe = useSwipe({ onNext: next, onPrev: prevTrack, enabled: !!current && queue.length > 1, tilt: false, threshold: 50 })
  const startY = useRef(null)

  // Tocar cualquier zona libre de la barra abre el reproductor
  const onBarClick = (e) => {
    if (current && !e.target.closest(INTERACTIVE)) onExpand()
  }

  // Deslizar la barra hacia arriba también lo abre
  const onBarPointerDown = (e) => {
    startY.current = current && !e.target.closest('input') ? { x: e.clientX, y: e.clientY } : null
  }
  const onBarPointerUp = (e) => {
    const s = startY.current
    startY.current = null
    if (!s) return
    const dy = e.clientY - s.y
    if (dy < -40 && Math.abs(e.clientX - s.x) < Math.abs(dy)) onExpand()
  }

  return (
    <footer
      onClick={onBarClick}
      onPointerDown={onBarPointerDown}
      onPointerUp={onBarPointerUp}
      onPointerCancel={() => (startY.current = null)}
      className={`relative border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur ${
        current ? 'cursor-pointer' : ''
      }`}
    >
      <MiniProgress />

      <div className="grid h-[72px] grid-cols-[1fr_auto] items-center gap-4 px-3 md:h-20 md:grid-cols-[1fr_minmax(0,40rem)_1fr] md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            {...swipe.handlers}
            style={swipe.style}
            data-expand
            className="flex min-w-0 items-center gap-3 text-left select-none disabled:cursor-default"
            disabled={!current}
            aria-label="Abrir reproductor"
          >
            <Cover track={current} className="size-12 rounded-md shadow-sm md:size-14" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{current?.title || 'Nada sonando'}</span>
              <span className="block truncate text-[13px] text-muted">
                {current ? current.artist : 'Elige una canción'}
              </span>
            </span>
          </button>
          {current && (
            <button
              className={`hidden size-8 shrink-0 place-items-center rounded-full transition-colors hover:text-fg md:grid ${
                current.favorite ? 'text-accent' : 'text-muted'
              }`}
              onClick={() => onFavorite(current.id)}
              aria-label={current.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
            >
              <HeartIcon className="size-[18px]" fill={current.favorite} />
            </button>
          )}
        </div>

        <div className="hidden flex-col gap-1 md:flex">
          <Controls />
          <Progress />
        </div>
        <div className="md:hidden">
          <Controls compact />
        </div>

        <div className="hidden justify-end md:flex">
          <Volume />
        </div>
      </div>
    </footer>
  )
}
