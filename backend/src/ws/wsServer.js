import { WebSocketServer } from 'ws'
import store from '../store/store.js'
import { getActiveUniverses, getUniverseBuffer } from '../artnet/artnetMonitor.js'

export function createWSServer(server) {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    console.log('[WS] Client connecté')

    // Envoie l'état actuel des barres
    ws.send(JSON.stringify({
      type: 'bars_list',
      bars: store.getBars(),
    }))

    // Envoie l'état actuel des univers Art-Net
    const universes = getActiveUniverses()
    if (universes.length > 0) {
      universes.forEach(u => {
        ws.send(JSON.stringify({
          type:     'artnet_universe',
          universe: u,
          data:     Array.from(getUniverseBuffer(u)),
          ts:       Date.now(),
        }))
      })
    }

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg)
        handleMessage(ws, wss, data)
      } catch (e) {
        console.error('[WS] Message invalide:', e.message)
      }
    })

    ws.on('close', () => {
      console.log('[WS] Client déconnecté')
    })
  })

  return wss
}

function handleMessage(ws, wss, data) {
  switch (data.type) {
    case 'get_bars':
      ws.send(JSON.stringify({
        type: 'bars_list',
        bars: store.getBars(),
      }))
      break
    case 'get_universes':
      getActiveUniverses().forEach(u => {
        ws.send(JSON.stringify({
          type:     'artnet_universe',
          universe: u,
          data:     Array.from(getUniverseBuffer(u)),
        }))
      })
      break
    default:
      break
  }
}