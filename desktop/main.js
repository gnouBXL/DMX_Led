// Processus principal Electron — démarre le backend Node en interne
// et affiche le dashboard dans une fenêtre native. Aucun Raspberry Pi requis.
const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const PORT = process.env.PORT || 3001
const isDev = !app.isPackaged

const BACKEND_DIR = isDev
  ? path.join(__dirname, '..', 'backend')
  : path.join(process.resourcesPath, 'backend')

let mainWindow

// La config (groupes/presets) doit vivre dans un dossier utilisateur inscriptible,
// jamais dans le bundle de l'app (en lecture seule une fois installée/signée).
function configurePersistentStorage() {
  const userDataDir = app.getPath('userData')
  fs.mkdirSync(userDataDir, { recursive: true })
  process.env.BARS_CONFIG_PATH = path.join(userDataDir, 'bars.json')
}

async function startBackend() {
  process.env.PORT = String(PORT)
  await import(path.join(BACKEND_DIR, 'src', 'index.js'))
}

function waitForBackend(url, timeoutMs = 15000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      require('http').get(url, res => {
        res.destroy()
        resolve()
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Backend timeout'))
        setTimeout(tryOnce, 300)
      })
    }
    tryOnce()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'DMX LED Controller',
    backgroundColor: '#0b0d10',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)

  // Les liens externes (GitHub, doc...) s'ouvrent dans le navigateur système
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

Menu.setApplicationMenu(null)

app.whenReady().then(async () => {
  configurePersistentStorage()

  try {
    await startBackend()
    await waitForBackend(`http://localhost:${PORT}/api/ping`)
  } catch (err) {
    console.error('[Desktop] Échec démarrage backend:', err)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
