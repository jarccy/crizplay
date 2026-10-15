// Paletas base neutras (valores de Tailwind v4) y colores de acento.
const scale = (v) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k, i) => [k, `oklch(${v[i]})`]))

export const PALETTES = {
  neutral: scale(['98.5% 0 0', '97% 0 0', '92.2% 0 0', '87% 0 0', '70.8% 0 0', '55.6% 0 0', '43.9% 0 0', '37.1% 0 0', '26.9% 0 0', '20.5% 0 0', '14.5% 0 0']),
  stone: scale(['98.5% 0.001 106.4', '97% 0.001 106.4', '92.3% 0.003 48.7', '86.9% 0.005 56.4', '70.9% 0.01 56.3', '55.3% 0.013 58.1', '44.4% 0.011 73.6', '37.4% 0.01 67.6', '26.8% 0.007 34.3', '21.6% 0.006 56', '14.7% 0.004 49.3']),
  zinc: scale(['98.5% 0 0', '96.7% 0.001 286.4', '92% 0.004 286.3', '87.1% 0.006 286.3', '70.5% 0.015 286.1', '55.2% 0.016 285.9', '44.2% 0.017 285.8', '37% 0.013 285.8', '27.4% 0.006 286', '21% 0.006 285.9', '14.1% 0.005 285.8']),
  slate: scale(['98.4% 0.003 247.9', '96.8% 0.007 247.9', '92.9% 0.013 255.5', '86.9% 0.022 252.9', '70.4% 0.04 256.8', '55.4% 0.046 257.4', '44.6% 0.043 257.3', '37.2% 0.044 257.3', '27.9% 0.041 260', '20.8% 0.042 265.8', '12.9% 0.042 264.7']),
  gray: scale(['98.5% 0.002 247.8', '96.7% 0.003 264.5', '92.8% 0.006 264.5', '87.2% 0.01 258.3', '70.7% 0.022 261.3', '55.1% 0.027 264.4', '44.6% 0.03 256.8', '37.3% 0.034 259.7', '27.8% 0.033 256.8', '21% 0.034 264.7', '13% 0.028 261.7']),
}

export const BASE_NAMES = { neutral: 'Neutro', stone: 'Piedra', zinc: 'Zinc', slate: 'Pizarra', gray: 'Gris' }

export const ACCENTS = [
  { id: 'neutral', name: 'Neutro' },
  { id: '#f43f5e', name: 'Rosa' },
  { id: '#f97316', name: 'Naranja' },
  { id: '#f59e0b', name: 'Ámbar' },
  { id: '#84cc16', name: 'Lima' },
  { id: '#10b981', name: 'Esmeralda' },
  { id: '#06b6d4', name: 'Cian' },
  { id: '#3b82f6', name: 'Azul' },
  { id: '#6366f1', name: 'Índigo' },
  { id: '#8b5cf6', name: 'Violeta' },
  { id: '#d946ef', name: 'Fucsia' },
]

// Temas predefinidos: combinan modo, base y acento de un clic
export const PRESETS = [
  { name: 'Grafito', mode: 'dark', base: 'neutral', accent: 'neutral' },
  { name: 'Papel', mode: 'light', base: 'stone', accent: 'neutral' },
  { name: 'Medianoche', mode: 'dark', base: 'slate', accent: '#6366f1' },
  { name: 'Brasa', mode: 'dark', base: 'stone', accent: '#f97316' },
  { name: 'Bosque', mode: 'dark', base: 'zinc', accent: '#10b981' },
  { name: 'Aurora', mode: 'light', base: 'gray', accent: '#d946ef' },
]

export const DEFAULT_THEME = { mode: 'dark', base: 'neutral', accent: 'neutral' }

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDark(mode) {
  return mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
}

export function applyTheme({ mode, base, accent }) {
  const dark = isDark(mode)
  const p = PALETTES[base] || PALETTES.neutral
  const tokens = dark
    ? { bg: p[950], surface: p[900], 'surface-2': p[800], border: p[800], fg: p[50], muted: p[400] }
    : { bg: p[50], surface: p[100], 'surface-2': p[200], border: p[200], fg: p[950], muted: p[500] }

  if (/^#[0-9a-f]{6}$/i.test(accent)) {
    // texto blanco o negro, el que tenga mejor contraste sobre el acento
    const L = luminance(accent)
    tokens.accent = accent
    tokens['accent-fg'] = 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#0a0a0a'
  } else {
    tokens.accent = dark ? p[100] : p[900]
    tokens['accent-fg'] = dark ? p[950] : p[50]
  }

  const root = document.documentElement
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--${k}`, v)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  root.style.background = tokens.bg
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tokens.bg)
}
