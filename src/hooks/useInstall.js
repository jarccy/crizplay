import { useEffect, useState } from 'react'

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export function useInstall() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(standalone)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return { canInstall: !!prompt && !installed, install, installed, isIOS }
}
