import { useEffect, useMemo, useState } from 'react'
import { platform } from '../hooks/useInstall'
import { formatTime } from '../lib/format'
import { Cover } from './Cover'
import {
  CheckIcon,
  HeartIcon,
  ListPlusIcon,
  MinusCircleIcon,
  MoreIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  TrashIcon,
  XIcon,
} from './Icons'

// Hoja modal: panel inferior en móvil, ventana centrada en escritorio
export function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-up relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-w-md sm:rounded-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <button
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-fg/10 hover:text-fg"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-[18px]" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

const primaryBtn =
  'rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40'
const secondaryBtn = 'rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-fg/10 hover:text-fg'
const rowBtn = 'flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition-colors hover:bg-surface-2/60'

export function NameDialog({ title, initial = '', submitLabel = 'Guardar', onSubmit, onClose }) {
  const [name, setName] = useState(initial)
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim())
    onClose()
  }
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Cancelar
          </button>
          <button className={primaryBtn} form="name-form" disabled={!name.trim()}>
            {submitLabel}
          </button>
        </>
      }
    >
      <form id="name-form" onSubmit={submit} className="p-5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Nombre de la playlist"
          className="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
        />
      </form>
    </Sheet>
  )
}

export function AddToPlaylistSheet({ track, playlists, onToggle, onCreate, onClose }) {
  return (
    <Sheet title="Añadir a playlist" onClose={onClose}>
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <Cover track={track} className="size-10 rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{track.title}</p>
          <p className="truncate text-xs text-muted">{track.artist}</p>
        </div>
      </div>
      <button className={rowBtn} onClick={onCreate}>
        <span className="grid size-10 place-items-center rounded-md border border-dashed border-line text-muted">
          <PlusIcon className="size-4" />
        </span>
        Nueva playlist
      </button>
      {playlists.map((pl) => {
        const has = pl.trackIds.includes(track.id)
        return (
          <button key={pl.id} className={rowBtn} onClick={() => onToggle(pl.id)} aria-pressed={has}>
            <span className="grid size-10 place-items-center rounded-md bg-surface-2 text-xs tabular-nums text-muted">
              {pl.trackIds.length}
            </span>
            <span className="min-w-0 flex-1 truncate">{pl.name}</span>
            <span
              className={`grid size-6 place-items-center rounded-full border transition-colors ${
                has ? 'border-accent bg-accent text-accent-fg' : 'border-line'
              }`}
            >
              {has && <CheckIcon className="size-3.5" />}
            </span>
          </button>
        )
      })}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </Sheet>
  )
}

export function PickTracksSheet({ playlist, tracks, onSave, onClose }) {
  const [selected, setSelected] = useState(() => new Set(playlist.trackIds))
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q)) : tracks
  }, [tracks, query])

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const save = () => {
    // conserva el orden actual y añade las nuevas al final
    const kept = playlist.trackIds.filter((id) => selected.has(id))
    const added = tracks.filter((t) => selected.has(t.id) && !playlist.trackIds.includes(t.id)).map((t) => t.id)
    onSave([...kept, ...added])
    onClose()
  }

  return (
    <Sheet
      title={`Canciones de «${playlist.name}»`}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Cancelar
          </button>
          <button className={primaryBtn} onClick={save}>
            Guardar · {selected.size}
          </button>
        </>
      }
    >
      <div className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-3">
        <label className="relative flex items-center">
          <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en tu biblioteca"
            className="h-10 w-full rounded-lg border border-line bg-bg pr-3 pl-9 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
          />
        </label>
      </div>
      {tracks.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">Primero añade música a tu biblioteca.</p>}
      {visible.map((t) => {
        const on = selected.has(t.id)
        return (
          <button key={t.id} className={`${rowBtn} py-2`} onClick={() => toggle(t.id)} aria-pressed={on}>
            <Cover track={t} className="size-10 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{t.title}</span>
              <span className="block truncate text-xs text-muted">
                {t.artist} · {formatTime(t.duration)}
              </span>
            </span>
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
                on ? 'border-accent bg-accent text-accent-fg' : 'border-line'
              }`}
            >
              {on && <CheckIcon className="size-3.5" />}
            </span>
          </button>
        )
      })}
    </Sheet>
  )
}

// Menú de acciones de una canción (sobre todo para móvil)
export function TrackActionsSheet({ track, inPlaylist, onAddToPlaylist, onFavorite, onRemove, onClose }) {
  const act = (fn) => () => {
    onClose()
    fn(track)
  }
  return (
    <Sheet title={track.title} onClose={onClose}>
      <button className={rowBtn} onClick={act(onAddToPlaylist)}>
        <ListPlusIcon className="size-5 text-muted" /> Añadir a playlist
      </button>
      <button className={rowBtn} onClick={act((t) => onFavorite(t.id))}>
        <HeartIcon className={`size-5 ${track.favorite ? 'text-accent' : 'text-muted'}`} fill={track.favorite} />
        {track.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
      </button>
      <button className={`${rowBtn} text-red-500`} onClick={act(onRemove)}>
        {inPlaylist ? <MinusCircleIcon className="size-5" /> : <TrashIcon className="size-5" />}
        {inPlaylist ? 'Quitar de esta playlist' : 'Eliminar de la biblioteca'}
      </button>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </Sheet>
  )
}

export function MoreButton({ onClick, label }) {
  return (
    <button
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-fg md:hidden"
      onClick={onClick}
      aria-label={label}
    >
      <MoreIcon className="size-[18px]" />
    </button>
  )
}

// Instrucciones cuando el navegador no ofrece el diálogo de instalación
export function InstallHelpSheet({ onClose }) {
  const Step = ({ n, children }) => (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-medium">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  )

  let content
  if (!platform.secure) {
    content = (
      <>
        <p>
          Estás abriendo la app desde <b className="font-medium text-fg">{location.origin}</b>. Los navegadores solo permiten
          instalar apps y usarlas sin conexión desde <b className="font-medium text-fg">HTTPS</b> o desde{' '}
          <b className="font-medium text-fg">localhost</b>.
        </p>
        <ol className="space-y-3">
          <Step n={1}>En este ordenador abre http://localhost:4173 (o el puerto que uses).</Step>
          <Step n={2}>
            Para el móvil, publica la carpeta <code className="rounded bg-surface-2 px-1">dist</code> en un hosting con HTTPS
            (Netlify, Vercel, Cloudflare Pages o GitHub Pages) y abre esa dirección.
          </Step>
        </ol>
      </>
    )
  } else if (platform.ios) {
    content = (
      <ol className="space-y-3">
        <Step n={1}>Abre esta página en Safari.</Step>
        <Step n={2}>
          Toca el botón Compartir <ShareIcon className="inline size-4 align-[-2px]" />.
        </Step>
        <Step n={3}>Elige «Añadir a pantalla de inicio» y confirma con «Añadir».</Step>
      </ol>
    )
  } else if (platform.firefox && !platform.android) {
    content = (
      <p>
        Firefox de escritorio no permite instalar aplicaciones web. Abre esta página en <b className="font-medium text-fg">Chrome</b>{' '}
        o <b className="font-medium text-fg">Edge</b> y pulsa «Instalar app».
      </p>
    )
  } else if (platform.safari) {
    content = (
      <ol className="space-y-3">
        <Step n={1}>En la barra de menús de Safari abre «Archivo».</Step>
        <Step n={2}>Elige «Añadir al Dock».</Step>
      </ol>
    )
  } else if (platform.android) {
    content = (
      <ol className="space-y-3">
        <Step n={1}>Abre el menú del navegador (⋮ arriba a la derecha).</Step>
        <Step n={2}>Toca «Instalar aplicación» o «Añadir a pantalla de inicio».</Step>
      </ol>
    )
  } else {
    content = (
      <>
        <ol className="space-y-3">
          <Step n={1}>Busca el icono de instalar (un monitor con una flecha) al final de la barra de direcciones.</Step>
          <Step n={2}>
            O abre el menú ⋮ → «Enviar, guardar y compartir» → «Instalar página como app» (en Edge: ⋯ → «Aplicaciones» →
            «Instalar este sitio como aplicación»).
          </Step>
        </ol>
        <p className="text-xs">
          Si no aparece la opción, recarga la página una vez: el navegador necesita que la app haya terminado de guardarse
          para usarse sin conexión.
        </p>
      </>
    )
  }

  return (
    <Sheet title="Instalar CrizPlay" onClose={onClose} footer={<button className={primaryBtn} onClick={onClose}>Entendido</button>}>
      <div className="space-y-4 p-5 text-sm leading-relaxed text-muted">{content}</div>
    </Sheet>
  )
}
