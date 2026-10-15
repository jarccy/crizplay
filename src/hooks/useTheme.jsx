import { createContext, useContext, useEffect, useState } from 'react'
import { applyTheme, DEFAULT_THEME } from '../lib/theme'
import { loadPref, savePref } from '../lib/format'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => ({ ...DEFAULT_THEME, ...loadPref('theme', {}) }))

  useEffect(() => {
    applyTheme(theme)
    savePref('theme', theme)
    if (theme.mode !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(theme)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (patch) => setThemeState((t) => ({ ...t, ...patch }))
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
