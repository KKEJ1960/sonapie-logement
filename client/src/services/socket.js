import { io } from 'socket.io-client'

// VITE_API_URL vaut '/api' en dev (chemin relatif utilisé par axios via le proxy
// Vite) — inutilisable tel quel pour Socket.io, qui a besoin d'une origine
// complète. On ne l'utilise donc que si c'est une vraie URL absolue (prod),
// sinon on retombe sur l'hôte courant : 5000 (comportement du serveur en dev).
const envUrl = import.meta.env.VITE_API_URL
const SOCKET_URL = envUrl?.startsWith('http')
  ? envUrl
  : `${window.location.protocol}//${window.location.hostname}:5000`

let socket = null

export function getSocket() {
  if (!socket) {
    const token = sessionStorage.getItem('token')
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
    socket = null
  }
}
