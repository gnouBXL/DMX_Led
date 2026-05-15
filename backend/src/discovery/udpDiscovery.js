// Découverte automatique des ESP32 via UDP broadcast
import dgram from 'dgram';
import store from '../store/store.js';

const DISCOVERY_PORT = 4210;
const ANNOUNCE_MSG   = 'LED_DISCOVER';

export function startDiscovery(wss) {
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
        const text = msg.toString().trim();

        // Les ESP32 envoient "LED_ANNOUNCE:{"name":"...","universe":1,...}"
        if (text.startsWith('LED_ANNOUNCE:')) {
            try {
                const json = JSON.parse(text.slice(13));
                const ip   = rinfo.address;

                store.updateBar(ip, json);

                console.log(`[Discovery] Barre détectée : ${json.name} @ ${ip}`);

                // Notifie tous les clients WebSocket
                broadcastToWS(wss, {
                    type: 'bar_update',
                    bar:  store.getBars().find(b => b.ip === ip),
                });

            } catch (e) {
                console.error('[Discovery] JSON invalide:', e.message);
            }
        }
    });

    socket.on('error', (err) => {
        console.error('[Discovery] Erreur socket:', err.message);
    });

    socket.bind(DISCOVERY_PORT, () => {
        console.log(`[Discovery] Écoute UDP sur port ${DISCOVERY_PORT}`);
    });

    // Vérifie les barres offline toutes les 5s
    setInterval(() => {
        store.checkOffline();
        broadcastToWS(wss, {
            type: 'bars_list',
            bars: store.getBars(),
        });
    }, 5000);

    return socket;
}

function broadcastToWS(wss, data) {
    if (!wss) return;
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msg);
        }
    });
}