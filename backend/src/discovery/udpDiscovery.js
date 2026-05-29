import dgram from 'dgram'
import fetch from 'node-fetch'
import store from '../store/store.js'

const DISCOVERY_PORT = 4210

export function startDiscovery(wss) {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

    socket.on('message', async (msg, rinfo) => {
        const text = msg.toString().trim()

        if (text.startsWith('LED_ANNOUNCE:')) {
            try {
                const json = JSON.parse(text.slice(13))
                const ip   = rinfo.address

                // Mise à jour basique depuis l'annonce UDP
                store.updateBar(ip, { ...json, ip, online: true })

                // Récupère la vraie config complète depuis l'ESP32
                try {
                    const response = await fetch(
                        `http://${ip}/api/config`,
                        { timeout: 2000 }
                    )
                    const config = await response.json()

                    // Met à jour le store avec la vraie config
                    store.updateBar(ip, {
                        ip,
                        name:            config.deviceName,
                        brightness:      config.brightness,
                        fpsMax:          config.fpsMax,
                        stripCount:      config.stripCount,
                        strips:          config.strips,
                        // Infos de la bande principale pour compatibilité dashboard
                        ledCount:        config.strips?.[0]?.ledCount,
                        dmxUniverse:     config.strips?.[0]?.dmxUniverse,
                        dmxStartChannel: config.strips?.[0]?.dmxStartChannel,
                        dmxMode:         config.strips?.[0]?.dmxMode,
                        online:          true,
                    })

                    console.log(`[Discovery] Config lue : ${config.deviceName} — ${config.stripCount} bande(s)`)
                } catch (e) {
                    console.log(`[Discovery] Config non lisible depuis ${ip}: ${e.message}`)
                }

                // Notifie les clients WebSocket
                broadcastToWS(wss, {
                    type: 'bars_list',
                    bars: store.getBars(),
                })

            } catch (e) {
                console.error('[Discovery] JSON invalide:', e.message)
            }
        }
    })

    socket.on('error', (err) => {
        console.error('[Discovery] Erreur socket:', err.message)
    })

    socket.bind(DISCOVERY_PORT, '0.0.0.0', () => {
        socket.setBroadcast(true)
        console.log(`[Discovery] Écoute UDP sur port ${DISCOVERY_PORT}`)
    })

    setInterval(() => {
        store.checkOffline()
        broadcastToWS(wss, {
            type: 'bars_list',
            bars: store.getBars(),
        })
    }, 5000)

    return socket
}

function broadcastToWS(wss, data) {
    if (!wss) return
    const msg = JSON.stringify(data)
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msg)
        }
    })
}