// Serveur WebSocket — communication temps réel avec le dashboard
import { WebSocketServer } from 'ws';
import store from '../store/store.js';

export function createWSServer(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        console.log('[WS] Client connecté');

        // Envoie l'état actuel au nouveau client
        ws.send(JSON.stringify({
            type: 'bars_list',
            bars: store.getBars(),
        }));

        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg);
                handleMessage(ws, wss, data);
            } catch (e) {
                console.error('[WS] Message invalide:', e.message);
            }
        });

        ws.on('close', () => {
            console.log('[WS] Client déconnecté');
        });
    });

    return wss;
}

function handleMessage(ws, wss, data) {
    switch (data.type) {
        case 'get_bars':
            ws.send(JSON.stringify({
                type: 'bars_list',
                bars: store.getBars(),
            }));
            break;
        default:
            break;
    }
}