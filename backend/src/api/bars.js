// API REST — gestion des barres LED
import { Router } from 'express';
import fetch from 'node-fetch';
import store from '../store/store.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// GET /api/flash/releases/latest — retourne la dernière release GitHub
router.get('/flash/releases/latest', async (req, res) => {
    try {
        const token = process.env.GITHUB_TOKEN || readFlashToken()
        const headers = { 'Accept': 'application/vnd.github.v3+json' }
        if (token) headers['Authorization'] = `token ${token}`

        const response = await fetch(
            'https://api.github.com/repos/gnouBXL/DMX_Led/releases/latest',
            { headers, timeout: 10000 }
        )
        const data = await response.json()
        res.json(data)
    } catch (e) {
        res.status(503).json({ error: 'GitHub inaccessible' })
    }
})

// GET /api/flash/asset?url=... — proxy téléchargement asset GitHub privé
router.get('/flash/asset', async (req, res) => {
    try {
        const assetUrl = req.query.url
        if (!assetUrl || !assetUrl.includes('api.github.com')) {
            return res.status(400).json({ error: 'URL invalide' })
        }
        const token = process.env.GITHUB_TOKEN || readFlashToken()
        const headers = { 'Accept': 'application/octet-stream' }
        if (token) headers['Authorization'] = `token ${token}`

        const response = await fetch(assetUrl, { headers })
        if (!response.ok) throw new Error(`GitHub: ${response.status}`)

        res.set('Content-Type', 'application/octet-stream')
        response.body.pipe(res)
    } catch (e) {
        res.status(503).json({ error: e.message })
    }
})

function readFlashToken() {
    try {
        const tokenFile = join(__dirname, '..', '..', '..', '.flash_token')
        return readFileSync(tokenFile, 'utf8').trim()
    } catch {
        return null
    }
}
// GET /api/flash/manifest — proxy manifest pour ESP Web Tools
router.get('/flash/manifest', async (req, res) => {
    try {
        const response = await fetch(
            'https://github.com/gnouBXL/DMX_Led/releases/latest/download/manifest.json'
        )
        const data = await response.json()

        // Remplace les URLs GitHub par des URLs proxy locales
        const host = req.headers.host || 'localhost:3001'
        const protocol = req.headers['x-forwarded-proto'] || 'http'
        const baseUrl = `${protocol}://${host}/api/flash/bin`

        data.builds = data.builds.map(build => ({
            ...build,
            parts: build.parts.map(part => ({
                ...part,
                path: `${baseUrl}?url=${encodeURIComponent(part.path)}`
            }))
        }))

        res.set('Access-Control-Allow-Origin', '*')
        res.json(data)
    } catch (e) {
        res.status(503).json({ error: 'Manifest inaccessible' })
    }
})

// GET /api/flash/bin?url=... — proxy téléchargement binaire
router.get('/flash/bin', async (req, res) => {
    try {
        const url = req.query.url
        if (!url || !url.includes('github.com')) {
            return res.status(400).json({ error: 'URL invalide' })
        }
        const response = await fetch(url, { redirect: 'follow' })
        if (!response.ok) throw new Error(`GitHub: ${response.status}`)
        res.set('Content-Type', 'application/octet-stream')
        res.set('Access-Control-Allow-Origin', '*')
        response.body.pipe(res)
    } catch (e) {
        res.status(503).json({ error: e.message })
    }
})
export default router;