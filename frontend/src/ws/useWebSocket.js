const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

let socket = null

export function connectWS({ setBars, updateBar, setUniverse }) {
  socket = new WebSocket(WS_URL)

  socket.onopen = () => {
    console.log('[WS] Connecté au backend')
    setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_bars' }))
        socket.send(JSON.stringify({ type: 'get_universes' }))
      }
    }, 100)
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'bars_list')      setBars(data.bars)
      if (data.type === 'bar_update')     updateBar(data.bar)
      if (data.type === 'artnet_universe') setUniverse(data.universe, data.data)
    } catch (e) {
      console.error('[WS] Message invalide:', e)
    }
  }

  socket.onclose = () => {
    console.log('[WS] Déconnecté — reconnexion dans 3s')
    setTimeout(() => connectWS({ setBars, updateBar, setUniverse }), 3000)
  }

  socket.onerror = (e) => {
    console.error('[WS] Erreur:', e)
  }
}

export function sendWS(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data))
  }
}