import express    from 'express'
import { createServer } from 'http'
import cors       from 'cors'
import { createWSServer }     from './ws/wsServer.js'
import { startDiscovery }     from './discovery/udpDiscovery.js'
import { startArtNetMonitor, getUniverseBuffer, getActiveUniverses } from './artnet/artnetMonitor.js'
import barsRouter from './api/bars.js'
import store      from './store/store.js'

const PORT = process.env.PORT || 3001

store.load()

const app    = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())

// Routes API
app.use('/api/bars', barsRouter)

// API univers DMX en temps réel
app.get('/api/universes', (req, res) => {
  const universes = getActiveUniverses().map(u => ({
    universe: u,
    data:     Array.from(getUniverseBuffer(u)),
  }))
  res.json(universes)
})

app.get('/api/universes/:id', (req, res) => {
  const u    = parseInt(req.params.id)
  const data = getUniverseBuffer(u)
  res.json({ universe: u, data: Array.from(data) })
})

app.get('/api/ping', (req, res) => res.json({ ok: true }))

// WebSocket
const wss = createWSServer(server)

// Découverte UDP
startDiscovery(wss)

// Moniteur Art-Net
startArtNetMonitor(wss)

server.listen(PORT, () => {
  console.log(`[Backend] Serveur démarré sur http://localhost:${PORT}`)
})