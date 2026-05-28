import express    from 'express'
import { createServer } from 'http'
import cors       from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
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
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/flash')) {
    return barsRouter(req, res, next)
  }
  next()
})

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

// Servir le frontend React
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
app.use(express.static(join(__dirname, '../../frontend/dist')))

server.listen(PORT, () => {
  console.log(`[Backend] Serveur démarré sur http://localhost:${PORT}`)
})