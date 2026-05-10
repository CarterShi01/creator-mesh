import { useState, useEffect } from 'react'

export interface PwaState {
  isStandalone: boolean
  isOfflineReady: boolean
  needsRefresh: boolean
  updateAvailable: boolean
}

export function usePwa(): PwaState {
  const [isStandalone] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
  const [isOfflineReady, setIsOfflineReady] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    // vite-plugin-pwa auto-registers the service worker
    // We listen for controller changes to detect offline readiness
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsOfflineReady(true)
      })

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true)
      })
    }
  }, [])

  return {
    isStandalone,
    isOfflineReady,
    needsRefresh: updateAvailable,
    updateAvailable,
  }
}
