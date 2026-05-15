// Point d'entrée du serveur backend
import express    from 'express';
import { createServer } from 'http';
import cors       from 'cors';
import { createWSServer }  from './ws/wsServer.js';
import { startDiscovery }  from './discovery/udpDiscovery.js';
import barsRouter from './api/bars.js';
import store      from './store/store.js';

const PORT = process.env.PORT || 3001;

// Init
store.load();

const app    = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/bars', barsRouter);

// Sanity check
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// WebSocket
const wss = createWSServer(server);

// Découverte UDP
startDiscovery(wss);

// Démarre le serveur
server.listen(PORT, () => {
    console.log(`[Backend] Serveur démarré sur http://localhost:${PORT}`);
});