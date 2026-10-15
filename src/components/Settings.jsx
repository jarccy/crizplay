import { useEffect, useState } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { useTheme } from '../hooks/useTheme'
import { formatBytes } from '../lib/format'
import { ACCENTS, BASE_NAMES, isDark, PALETTES, PRESETS } from '../lib/theme'
import { CheckIcon, DownloadIcon, MonitorIcon, MoonIcon, SunIcon, XIcon } from './Icons'

const MODES = [
  { id: 'light', name: 'Claro', Icon: SunIcon },
  { id: 'dark', name: 'Oscuro', Icon: MoonIcon },
  { id: 'system', name: 'Sistema', Icon: MonitorIcon },
]

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</h3>
      {children}
    </section>
  )
}

function accentSwatch(id, base, dark) {
  if (id !== 'neutral') return id
  return dark ? PALETTES[base][100] : PALETTES[base][900]
}

export function Settings({ onClose, trackCount, installed, onInstall }) {
  const { theme, setTheme } = useTheme()
  const { visualizer, setVisualizer } = usePlayer()
  const [usage, setUsage] = useState(null)
  const customAccent = theme.accent !== 'neutral' && !ACCENTS.some((a) => a.id === theme.accent)
  const dark = isDark(theme.mode)

  useEffect(() => {
    navigator.storage?.estimate?.().then(setUsage)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Personalizar">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-fade-up relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Personalizar</h2>
          <button
            className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-fg/10 hover:text-fg"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-[18px]" />
          </button>
        </header>

        <div className="space-y-7 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Section title="Temas">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESETS.map((t) => {
                const p = PALETTES[t.base]
                const d = t.mode === 'dark'
                const bg = d ? p[950] : p[50]
                const surface = d ? p[800] : p[200]
                const acc = accentSwatch(t.accent, t.base, d)
                const active = theme.mode === t.mode && theme.base === t.base && theme.accent === t.accent
                return (
                  <button
                    key={t.name}
                    onClick={() => setTheme({ mode: t.mode, base: t.base, accent: t.accent })}
                    className={`rounded-xl border p-1.5 text-left transition-colors ${
                      active ? 'border-accent' : 'border-line hover:border-muted'
                    }`}
                  >
                    <span className="flex h-12 items-end gap-1.5 rounded-lg p-2" style={{ background: bg }}>
                      <span className="h-full w-5 rounded" style={{ background: surface }} />
                      <span className="flex flex-1 flex-col gap-1">
                        <span className="h-1.5 w-3/4 rounded-full" style={{ background: surface }} />
                        <span className="h-1.5 w-1/2 rounded-full" style={{ background: surface }} />
                      </span>
                      <span className="size-4 rounded-full" style={{ background: acc }} />
                    </span>
                    <span className="mt-1.5 block px-1 text-xs font-medium">{t.name}</span>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section title="Modo">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-bg p-1">
              {MODES.map(({ id, name, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme({ mode: id })}
                  aria-pressed={theme.mode === id}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm transition-colors ${
                    theme.mode === id ? 'bg-surface-2 font-medium text-fg shadow-sm' : 'text-muted hover:text-fg'
                  }`}
                >
                  <Icon className="size-4" />
                  {name}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Tono neutro">
            <div className="flex flex-wrap gap-3">
              {Object.keys(PALETTES).map((b) => (
                <button
                  key={b}
                  onClick={() => setTheme({ base: b })}
                  aria-pressed={theme.base === b}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex size-11 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-surface transition ${
                      theme.base === b ? 'ring-accent' : 'ring-transparent group-hover:ring-line'
                    }`}
                  >
                    <span className="flex-1" style={{ background: PALETTES[b][300] }} />
                    <span className="flex-1" style={{ background: PALETTES[b][600] }} />
                    <span className="flex-1" style={{ background: PALETTES[b][900] }} />
                  </span>
                  <span className={`text-xs ${theme.base === b ? 'text-fg' : 'text-muted'}`}>{BASE_NAMES[b]}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Color de acento">
            <div className="flex flex-wrap gap-2.5">
              {ACCENTS.map((a) => {
                const active = theme.accent === a.id
                return (
                  <button
                    key={a.id}
                    onClick={() => setTheme({ accent: a.id })}
                    aria-label={a.name}
                    aria-pressed={active}
                    title={a.name}
                    className={`grid size-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition ${
                      active ? 'ring-fg' : 'ring-transparent hover:ring-line'
                    }`}
                    style={{ background: accentSwatch(a.id, theme.base, dark) }}
                  >
                    {active && <CheckIcon className="size-4 text-accent-fg" />}
                  </button>
                )
              })}
              <label
                title="Color personalizado"
                className={`relative grid size-9 cursor-pointer place-items-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition ${
                  customAccent ? 'ring-fg' : 'ring-transparent hover:ring-line'
                }`}
                style={{
                  background: customAccent
                    ? theme.accent
                    : 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)',
                }}
              >
                {customAccent && <CheckIcon className="size-4 text-accent-fg" />}
                <input
                  type="color"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  value={customAccent ? theme.accent : '#22c55e'}
                  onChange={(e) => setTheme({ accent: e.target.value })}
                  aria-label="Color personalizado"
                />
              </label>
            </div>
          </Section>

          <Section title="Reproducción">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-bg px-4 py-3">
              <span>
                <span className="block text-sm font-medium">Visualizador de audio</span>
                <span className="block text-xs text-muted">Barras animadas en la vista de reproducción</span>
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={visualizer}
                onChange={(e) => setVisualizer(e.target.checked)}
              />
              <span className="relative h-6 w-10 shrink-0 rounded-full bg-surface-2 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-fg after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-accent-fg" />
            </label>
          </Section>

          <Section title="Aplicación">
            <div className="space-y-3 rounded-xl bg-bg px-4 py-3 text-sm">
              {installed ? (
                <p className="flex items-center gap-2 text-muted">
                  <CheckIcon className="size-4 text-accent" /> CrizPlay está instalada en este dispositivo
                </p>
              ) : (
                <button
                  onClick={onInstall}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-medium text-accent-fg transition-opacity hover:opacity-90"
                >
                  <DownloadIcon className="size-4" /> Instalar aplicación
                </button>
              )}
              <div className="flex justify-between text-xs text-muted">
                <span>
                  {trackCount} {trackCount === 1 ? 'canción' : 'canciones'} guardadas
                </span>
                {usage && (
                  <span>
                    {formatBytes(usage.usage)} de {formatBytes(usage.quota)}
                  </span>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
