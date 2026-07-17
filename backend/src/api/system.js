// API système — info et mise à jour du Pi
import { Router } from 'express'
import { execSync, spawn } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INSTALL_DIR = process.env.INSTALL_DIR || join(__dirname, '..', '..', '..')

const router = Router()

// GET /api/system/info
router.get('/info', (req, res) => {
    try {
        const gitHash   = safeExec('git rev-parse --short HEAD', INSTALL_DIR) || '—'
        const gitBranch = safeExec('git rev-parse --abbrev-ref HEAD', INSTALL_DIR) || '—'
        const gitDate   = safeExec('git log -1 --format=%ci', INSTALL_DIR) || '—'

        res.json({
            version:    gitHash,
            branch:     gitBranch,
            date:       gitDate,
            node:       process.version,
            platform:   process.platform,
            uptime:     Math.floor(process.uptime()),
            memory:     process.memoryUsage().rss,
            isRaspberry: process.platform === 'linux' && existsSync('/etc/rpi-issue'),
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /api/system/update — met à jour le Pi depuis GitHub
router.post('/update', (req, res) => {
    const isLinux = process.platform === 'linux'
    const scriptPath = join(INSTALL_DIR, 'pi', 'update-service.sh')

    try {
        // Réponse immédiate — le restart coupe la connexion
        res.json({ ok: true, message: 'Mise à jour lancée, redémarrage dans ~30s' })

        // Lancement en arrière-plan après que la réponse soit envoyée
        setTimeout(() => {
            if (isLinux && existsSync(scriptPath)) {
                spawn('bash', [scriptPath], {
                    detached: true,
                    stdio: 'ignore',
                    cwd: INSTALL_DIR,
                }).unref()
            } else {
                // Mode dev (Mac) — juste git pull + rebuild sans restart
                spawn('bash', ['-c',
                    `cd ${INSTALL_DIR} && git pull && cd frontend && npm run build`
                ], { detached: true, stdio: 'ignore' }).unref()
            }
        }, 500)

    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST /api/system/reboot — redémarre le Pi
router.post('/reboot', (req, res) => {
    res.json({ ok: true })
    setTimeout(() => {
        if (process.platform === 'linux') {
            spawn('sudo', ['reboot'], { detached: true, stdio: 'ignore' }).unref()
        }
    }, 500)
})

function safeExec(cmd, cwd) {
    try {
        return execSync(cmd, { cwd, encoding: 'utf8', timeout: 5000 }).trim()
    } catch {
        return null
    }
}

export default router
