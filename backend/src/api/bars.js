// API REST — gestion des barres LED
import { Router } from 'express';
import fetch from 'node-fetch';
import store from '../store/store.js';

const router = Router();

// GET /api/bars — liste toutes les barres
router.get('/', (req, res) => {
    res.json(store.getBars());
});

// GET /api/bars/:ip/config — lit la config d'une barre
router.get('/:ip/config', async (req, res) => {
    try {
        const response = await fetch(
            `http://${req.params.ip}/api/config`,
            { timeout: 3000 }
        );
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(503).json({ error: 'Barre inaccessible' });
    }
});

// POST /api/bars/:ip/config — envoie une config à une barre
router.post('/:ip/config', async (req, res) => {
    try {
        const response = await fetch(
            `http://${req.params.ip}/api/config`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(req.body),
                timeout: 3000,
            }
        );
        const data = await response.json();

        // Met à jour le store local
        store.updateBar(req.params.ip, req.body);

        res.json(data);
    } catch (e) {
        res.status(503).json({ error: 'Barre inaccessible' });
    }
});

// POST /api/bars/:ip/test — test couleur ou rainbow
router.post('/:ip/test', async (req, res) => {
    try {
        const response = await fetch(
            `http://${req.params.ip}/api/test`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(req.body),
                timeout: 3000,
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(503).json({ error: 'Barre inaccessible' });
    }
});

// POST /api/bars/:ip/reboot — redémarre une barre
router.post('/:ip/reboot', async (req, res) => {
    try {
        await fetch(
            `http://${req.params.ip}/api/reboot`,
            { method: 'POST', timeout: 3000 }
        );
        res.json({ ok: true });
    } catch (e) {
        res.status(503).json({ error: 'Barre inaccessible' });
    }
});

export default router;