import { useEffect, useState } from 'react'
import api from '../services/api.js'

// Le backend (Render, plan gratuit) se met en veille après inactivité — la
// première requête après un réveil peut prendre 30 à 60 secondes. On envoie
// un ping silencieux vers /health dès le chargement de l'app pour déclencher
// ce réveil avant même que l'utilisateur n'appuie sur "Connexion".
//
// État partagé au niveau du module : plusieurs composants (App, LoginPage...)
// peuvent utiliser ce hook sans jamais dupliquer l'appel réseau, et tous
// voient le même statut.
const RETRY_DELAY_MS = 5000
const MAX_ATTEMPTS = 18 // ~90s de tentatives, au-delà du pire cas annoncé (60s)

let awake = false
let attempts = 0
let started = false
const listeners = new Set()

function notify() {
  listeners.forEach(fn => fn(awake))
}

function ping() {
  if (awake || attempts >= MAX_ATTEMPTS) return

  attempts += 1
  // Pas de timeout ici : un cold start peut légitimement dépasser les 30s
  // configurés par défaut sur l'instance api partagée.
  api.get('/health', { timeout: 0 })
    .then(() => {
      awake = true
      notify()
    })
    .catch(() => {
      if (attempts < MAX_ATTEMPTS) {
        setTimeout(ping, RETRY_DELAY_MS)
      }
    })
}

function startOnce() {
  if (started) return
  started = true
  ping()
}

export function useWakeUpServer() {
  const [isAwake, setIsAwake] = useState(awake)

  useEffect(() => {
    startOnce()
    if (awake) return
    listeners.add(setIsAwake)
    return () => { listeners.delete(setIsAwake) }
  }, [])

  return isAwake
}
