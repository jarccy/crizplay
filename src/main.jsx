import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ThemeProvider } from './hooks/useTheme'
import './index.css'

// Service worker: guarda la app en caché para funcionar sin conexión
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
