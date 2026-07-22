import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import os from 'os'
import { createServer } from 'http'
import { Server } from 'socket.io'
import apiRoutes from './src/routes/index.js'
import { errorHandler } from './src/middlewares/errorHandler.js'
import { initChatSocket } from './src/socket/chat.socket.js'
import { initRappelRendezVousJob } from './src/jobs/rappelRendezVous.job.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Origines autorisées : dev local (tous ports) + tout déploiement Vercel du
// projet (les URLs de preview changent à chaque déploiement, d'où le motif).
// Reflect-any-origin + credentials:true est une faille CORS classique — on
// valide explicitement au lieu d'accepter n'importe quelle origine.
const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // accès depuis un téléphone sur le même WiFi en dev
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
]

function isOriginAutorisee(origin) {
  // Pas d'en-tête Origin (curl, apps mobiles, health checks) : on laisse passer,
  // ces requêtes n'envoient de toute façon pas de cookies/credentials navigateur.
  if (!origin) return true
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAutorisee(origin)) return callback(null, true)
    return callback(new Error('Origine non autorisée par CORS.'))
  },
  credentials: true,
}

app.use(helmet())
app.use(cors(corsOptions))

app.use(express.json())
app.use('/api', apiRoutes)
app.use(errorHandler)

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (isOriginAutorisee(origin)) return callback(null, true)
      return callback(new Error('Origine non autorisée par CORS.'))
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Rend io accessible dans les controllers (req.app.get('io'))
app.set('io', io)

initChatSocket(io)
initRappelRendezVousJob(io)

function getPhoneIP() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const name of Object.keys(interfaces)) {
    // Exclure les interfaces virtuelles et déconnectées
    if (/vmware|vbox|hyper-v|vethernet|loopback|virtual|docker|bridge/i.test(name)) {
      continue
    }

    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({ name, address: iface.address })
      }
    }
  }

  // Priorité 1: WiFi/WLAN
  const wifiNetwork = candidates.find(({ name }) =>
    /wi-?fi|wlan|wireless/i.test(name),
  )

  // Priorité 2: Ethernet (vrai réseau)
  const ethernetNetwork = candidates.find(({ name }) =>
    /ethernet/i.test(name),
  )

  return wifiNetwork?.address || ethernetNetwork?.address || candidates[0]?.address || 'localhost'
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const phoneIP = getPhoneIP()
  const line = '---------------------------------'

  console.log(line)
  console.log('Serveur SONAPIE demarre !')
  console.log(line)
  console.log(`Navigateur PC : http://localhost:5173`)
  console.log(`Telephone     : http://${phoneIP}:5173`)
  console.log(`API locale    : http://localhost:${PORT}`)
  console.log(`API reseau    : http://${phoneIP}:${PORT}`)
  console.log(`Socket.io     : actif`)
  console.log(line)
  console.log("Ouvrez le lien Telephone sur un appareil connecte au meme WiFi")
  console.log(line)
})
