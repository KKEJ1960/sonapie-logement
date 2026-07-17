import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }
    const onAppInstalled = () => setIsInstallable(false)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
    setIsInstallable(false)
  }

  return { isInstallable, installApp }
}
