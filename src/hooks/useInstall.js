import { useEffect, useState } from 'react'

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const ua = navigator.userAgent
export const platform = {
  ios: /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1),
  android: /android/i.test(ua),
  firefox: /firefox|fxios/i.test(ua),
  safari: /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua),
  // la instalación (y el service worker) exige HTTPS o localhost
  secure: window.isSecureContext,
}

export function useInstall() {
  // el evento lo captura un script en index.html antes de que cargue React
  const [prompt, setPrompt] = useState(() => window.__installPrompt || null)
  const [installed, setInstalled] = useState(standalone)

  useEffect(() => {
    const onReady = () => setPrompt(window.__installPrompt || null)
    const onInstalled = () => {
      window.__installPrompt = null
      setInstalled(true)
      setPrompt(null)
    }
    const mq = matchMedia('(display-mode: standalone)')
    const onMode = () => setInstalled(standalone())
    window.addEventListener('installprompt-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)
    mq.addEventListener('change', onMode)
    return () => {
      window.removeEventListener('installprompt-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener('change', onMode)
    }
  }, [])

  // Devuelve true si se mostró el diálogo nativo; false si hay que enseñar instrucciones
  const install = async () => {
    if (!prompt) return false
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    window.__installPrompt = null
    setPrompt(null)
    if (outcome === 'accepted') setInstalled(true)
    return true
  }

  return { canPrompt: !!prompt, installed, install }
}
