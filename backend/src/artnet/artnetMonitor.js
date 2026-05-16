// Écoute le flux Art-Net en broadcast et redistribue via WebSocket
import dgram from 'dgram'

const ARTNET_PORT    = 6454
const ARTNET_HEADER  = Buffer.from([65,114,116,45,78,101,116,0]) // "Art-Net\0"

// Buffer par univers : { universe: Buffer(512) }
const universeBuffers = new Map()

let _wss = null

export function startArtNetMonitor(wss) {
  _wss = wss

  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

  socket.on('message', (msg, rinfo) => {
    // Vérifie l'en-tête Art-Net
    if (msg.length < 18) return
    if (!msg.slice(0, 8).equals(ARTNET_HEADER)) return

    // OpCode ArtDMX = 0x5000
    const opCode = msg.readUInt16LE(8)
    if (opCode !== 0x5000) return

    // Univers absolu
    const universe = msg.readUInt16LE(14)

    // Données DMX (à partir de l'octet 18)
    const dmxLen  = msg.readUInt16BE(16)
    const dmxData = msg.slice(18, 18 + dmxLen)

    // Stocke le buffer
    if (!universeBuffers.has(universe)) {
      universeBuffers.set(universe, Buffer.alloc(512))
    }
    dmxData.copy(universeBuffers.get(universe))

    // Redistribue via WebSocket
    broadcastUniverse(universe, dmxData)
  })

  socket.on('error', err => {
    console.error('[ArtNet Monitor] Erreur:', err.message)
  })

  socket.bind(ARTNET_PORT, () => {
    console.log(`[ArtNet Monitor] Écoute port ${ARTNET_PORT}`)
  })

  return socket
}

// Retourne les données d'un univers (pour init client WS)
export function getUniverseBuffer(universe) {
  return universeBuffers.get(universe) || Buffer.alloc(512)
}

// Retourne tous les univers actifs
export function getActiveUniverses() {
  return Array.from(universeBuffers.keys())
}

function broadcastUniverse(universe, dmxData) {
  if (!_wss) return

  // Convertit en tableau RGB compact pour le frontend
  const payload = JSON.stringify({
    type:     'artnet_universe',
    universe,
    data:     Array.from(dmxData),
    ts:       Date.now(),
  })

  _wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload)
    }
  })
}