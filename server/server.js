import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
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

app.use(
  cors({
    origin(origin, callback) {
      callback(null, true)
    },
    credentials: true,
  }),
)

app.use(express.json())
app.use('/api', apiRoutes)
app.use(errorHandler)

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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
