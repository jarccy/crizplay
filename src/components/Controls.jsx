import { useState } from 'react'
import { usePlayer, useTime } from '../hooks/usePlayer'
import { formatTime } from '../lib/format'
import {
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
} from './Icons'

const ghost =
  'relative grid place-items-center rounded-full text-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-40'

const Dot = () => <span className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />

export function Controls({ large = false, compact = false }) {
  const p = usePlayer()
  const disabled = !p.current
  const repeatLabel = { off: 'Repetir: no', all: 'Repetir: todo', one: 'Repetir: una' }[p.repeat]

  return (
    <div className={`flex items-center justify-center ${large ? 'gap-5 sm:gap-7' : 'gap-3'}`}>
      {!compact && (
        <button
          className={`${ghost} size-10 ${p.shuffle ? '!text-accent' : ''}`}
          onClick={p.toggleShuffle}
          aria-pressed={p.shuffle}
          aria-label="Aleatorio"
          title="Aleatorio"
        >
          <ShuffleIcon className={large ? 'size-5' : 'size-[18px]'} />
          {p.shuffle && <Dot />}
        </button>
      )}
      {!compact && (
        <button className={`${ghost} size-10 text-fg/80`} onClick={p.prev} disabled={disabled} aria-label="Anterior" title="Anterior">
          <PrevIcon className={large ? 'size-7' : 'size-5'} />
        </button>
      )}
      <button
        className={`grid place-items-center rounded-full bg-accent text-accent-fg shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 ${
          large ? 'size-16' : 'size-10'
        }`}
        onClick={p.toggle}
        disabled={disabled}
        aria-label={p.playing ? 'Pausar' : 'Reproducir'}
      >
        {p.playing ? (
          <PauseIcon className={large ? 'size-7' : 'size-[18px]'} />
        ) : (
          <PlayIcon className={`${large ? 'size-7' : 'size-[18px]'} translate-x-[1px]`} />
        )}
      </button>
      <button className={`${ghost} size-10 text-fg/80`} onClick={p.next} disabled={disabled} aria-label="Siguiente" title="Siguiente">
        <NextIcon className={large ? 'size-7' : 'size-5'} />
      </button>
      {!compact && (
        <button
          className={`${ghost} size-10 ${p.repeat !== 'off' ? '!text-accent' : ''}`}
          onClick={p.cycleRepeat}
          aria-label={repeatLabel}
          title={repeatLabel}
        >
          {p.repeat === 'one' ? (
            <RepeatOneIcon className={large ? 'size-5' : 'size-[18px]'} />
          ) : (
            <RepeatIcon className={large ? 'size-5' : 'size-[18px]'} />
          )}
          {p.repeat !== 'off' && <Dot />}
        </button>
      )}
    </div>
  )
}

export function Progress({ className = '' }) {
  const { seek, current } = usePlayer()
  const { time, duration } = useTime()
  // Mientras se arrastra solo se mueve la barra; el salto real ocurre al soltar
  const [drag, setDrag] = useState(null)
  const shown = drag ?? time
  const pct = duration ? Math.min(100, (shown / duration) * 100) : 0

  const commit = () => {
    if (drag == null) return
    if (Math.abs(drag - time) > 0.3) seek(drag)
    setDrag(null)
  }

  return (
    <div className={`flex items-center gap-3 text-[11px] tabular-nums text-muted ${className}`}>
      <span className="w-9 text-right">{formatTime(shown)}</span>
      <input
        type="range"
        className={`slider ${drag != null ? 'always' : ''}`}
        min={0}
        max={duration || 0}
        step={0.1}
        value={shown}
        disabled={!current}
        style={{ '--p': `${pct}%` }}
        onPointerDown={(e) => setDrag(Number(e.currentTarget.value))}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (drag != null) setDrag(v)
          else seek(v) // teclado: salta directamente
        }}
        onPointerUp={commit}
        onPointerCancel={commit}
        onLostPointerCapture={commit}
        onBlur={commit}
        aria-label="Posición"
      />
      <span className="w-9">{formatTime(duration)}</span>
    </div>
  )
}

export function Volume({ className = '' }) {
  const { volume, muted, setVolume, toggleMute } = usePlayer()
  const v = muted ? 0 : volume
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button className={`${ghost} size-8`} onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
        {v === 0 ? <MuteIcon className="size-[18px]" /> : <VolumeIcon className="size-[18px]" />}
      </button>
      <input
        type="range"
        className="slider w-24"
        min={0}
        max={1}
        step={0.01}
        value={v}
        style={{ '--p': `${v * 100}%` }}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volumen"
      />
    </div>
  )
}
