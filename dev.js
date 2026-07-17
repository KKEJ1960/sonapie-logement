import { spawn } from 'child_process'
import os from 'os'
import path from 'path'

function getPhoneIP() {
  const interfaces = os.networkInterfaces()
  const candidates = []

  for (const name of Object.keys(interfaces)) {
    // Exclure les interfaces virtuelles
    if (/vmware|vbox|hyper-v|vethernet|loopback|virtual|docker|bridge/i.test(name)) {
      continue
    }

    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({ name, address: iface.address })
      }
    }
  }

  const wifiNetwork = candidates.find(({ name }) => /wi-?fi|wlan|wireless/i.test(name))
  const ethernetNetwork = candidates.find(({ name }) => /ethernet/i.test(name))

  return wifiNetwork?.address || ethernetNetwork?.address || candidates[0]?.address || 'localhost'
}

const phoneIP = getPhoneIP()

// Lancer les deux serveurs en parallèle
const server = spawn('npm run dev', {
  cwd: path.resolve(process.cwd(), 'server'),
  stdio: 'pipe',
  shell: true,
})

const client = spawn('npm run dev', {
  cwd: path.resolve(process.cwd(), 'client'),
  stdio: 'pipe',
  shell: true,
})

let serverReady = false
let clientReady = false

const displayInfo = () => {
  if (serverReady && clientReady) {
    const line = '---------------------------------'
    console.clear()
    console.log(line)
    console.log('Serveur SONAPIE demarre !')
    console.log(line)
    console.log(`Navigateur PC : http://localhost:5173`)
    console.log(`Telephone     : http://${phoneIP}:5173`)
    console.log(`API locale    : http://localhost:5000`)
    console.log(`API reseau    : http://${phoneIP}:5000`)
    console.log(line)
    console.log("Ouvrez le lien Telephone sur un appareil connecte au meme WiFi")
    console.log(line)
    console.log('\n[Serveur actif] [Client actif]\n')
  }
}

// Surveiller la sortie du serveur
server.stdout.on('data', (data) => {
  const message = data.toString()
  if (message.includes('starting') || message.includes('server')) {
    serverReady = true
    displayInfo()
  }
  // Ne rien afficher sauf les erreurs
  if (message.includes('Error') || message.includes('error')) {
    console.error('[SERVER ERROR]', message)
  }
})

server.stderr.on('data', (data) => {
  console.error('[SERVER]', data.toString())
})

// Surveiller la sortie du client
client.stdout.on('data', (data) => {
  const message = data.toString()
  if (message.includes('ready') || message.includes('VITE')) {
    clientReady = true
    displayInfo()
  }
})

client.stderr.on('data', (data) => {
  console.error('[CLIENT]', data.toString())
})

// Gérer les arrêts
process.on('SIGINT', () => {
  server.kill()
  client.kill()
  process.exit()
})
