import { io } from 'socket.io-client'

// VITE_SOCKET_URL doit être l'origine nue du serveur (sans /api) — passer une
// URL se terminant par /api à Socket.io la ferait interpréter comme un nom de
// namespace ("/api") plutôt que comme l'hôte, et la connexion échouerait
// silencieusement. En dev, ni l'un ni l'autre n'est défini en absolu : on
// retombe sur l'hôte courant : 5000 (comportement du serveur en dev).
const socketEnvUrl = import.meta.env.VITE_SOCKET_URL
const SOCKET_URL = socketEnvUrl?.startsWith('http')
  ? socketEnvUrl
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
