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

// POST /api/bars/:ip/ota — met à jour le firmware d'une barre via OTA
router.post('/:ip/ota', async (req, res) => {
    const { ip } = req.params
    const bar = store.getBars().find(b => b.ip === ip)
    const boardType = bar?.boardType || 'S3_MINI'

    const FIRMWARE_FILES = {
        'S3_DEVKITC': 'firmware-esp32s3.bin',
        'S3_MINI':    'firmware-s3-mini.bin',
        'C3_MINI':    'firmware-c3-mini.bin',
        'C3_OLED':    'firmware-c3-oled.bin',
    }

    try {
        // 1. Dernière release GitHub
        const token = process.env.GITHUB_TOKEN || readFlashToken()
        const ghHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'DMX-Led-OTA' }
        if (token) ghHeaders['Authorization'] = `token ${token}`

        const releaseRes = await fetch(
            'https://api.github.com/repos/gnouBXL/DMX_Led/releases/latest',
            { headers: ghHeaders, timeout: 10000 }
        )
        if (!releaseRes.ok) throw new Error(`GitHub API: ${releaseRes.status}`)
        const release = await releaseRes.json()

        // 2. Trouve le bon binaire selon le type de board
        const filename = FIRMWARE_FILES[boardType] || FIRMWARE_FILES['S3_DEVKITC']
        const asset = release.assets.find(a => a.name === filename)
        if (!asset) throw new Error(`${filename} non trouvé dans ${release.tag_name}`)

        console.log(`[OTA] ${ip} (${boardType}) → ${filename} v${release.tag_name}`)

        // 3. Télécharge le firmware depuis GitHub
        const fwHeaders = { 'Accept': 'application/octet-stream', 'User-Agent': 'DMX-Led-OTA' }
        if (token) fwHeaders['Authorization'] = `token ${token}`

        const fwRes = await fetch(asset.browser_download_url, {
            headers: fwHeaders, redirect: 'follow', timeout: 30000,
        })
        if (!fwRes.ok) throw new Error(`Téléchargement échoué: ${fwRes.status}`)

        const fwBuffer = Buffer.from(await fwRes.arrayBuffer())
        console.log(`[OTA] Firmware téléchargé: ${fwBuffer.length} bytes`)

        // 4. Envoie le firmware vers l'ESP
        const espRes = await fetch(`http://${ip}/api/ota`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': String(fwBuffer.length),
            },
            body: fwBuffer,
            timeout: 60000,
        })
        if (!espRes.ok) throw new Error(`ESP OTA: ${espRes.status}`)
        await espRes.json()

        console.log(`[OTA] ${ip} flashé avec succès → redémarrage`)
        res.json({ ok: true, version: release.tag_name, size: fwBuffer.length, ip, boardType })

    } catch (e) {
        console.error(`[OTA] Erreur ${ip}:`, e.message)
        res.status(500).json({ error: e.message })
    }
})

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