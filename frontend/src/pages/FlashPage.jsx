import { useState, useRef } from 'react'

const API = 'http://localhost:3001'

export default function FlashPage() {
  const [step, setStep]         = useState('idle')
  const [log, setLog]           = useState([])
  const [progress, setProgress] = useState(0)
  const [version, setVersion]   = useState(null)
  const portRef                 = useRef(null)

  const addLog = (msg, color = '#e0e0e0') =>
    setLog(prev => [...prev, { msg, color }])

  const reset = () => {
    setStep('idle')
    setLog([])
    setProgress(0)
    setVersion(null)
    if (portRef.current) {
      portRef.current.close().catch(() => {})
      portRef.current = null
    }
  }

  const flash = async () => {
    if (!('serial' in navigator)) {
      addLog('❌ Web Serial non supporté — utilise Chrome ou Edge', '#ef4444')
      setStep('error')
      return
    }

    try {
      // 1. Connexion port série
      setStep('connecting')
      addLog('🔌 Sélection du port USB...', '#60a5fa')
      addLog('   → Si tu as 2 ports, choisis "Espressif Device" (pas debug-console ni Bluetooth)', '#888')
      const port = await navigator.serial.requestPort()
      portRef.current = port
      addLog('✓ Port sélectionné', '#4ade80')

      // 2. Récupération de la release via le backend (supporte repo privé)
      setStep('fetching')
      addLog('📡 Récupération de la dernière release...', '#60a5fa')
      const releaseRes = await fetch(`${API}/api/flash/releases/latest`)
      if (!releaseRes.ok) throw new Error('Backend inaccessible — le serveur local tourne-t-il ?')
      const release = await releaseRes.json()
      if (release.error) throw new Error(release.error)
      const ver = release.tag_name
      setVersion(ver)
      addLog(`✓ Release : ${ver}`, '#4ade80')

      const assets = {}
      for (const a of release.assets) assets[a.name] = a.url

      // 3. Téléchargement du manifest via le backend
      setStep('downloading')
      addLog('📥 Téléchargement du manifest...', '#60a5fa')
      const manifestRes = await fetch(`${API}/api/flash/asset?url=${encodeURIComponent(assets['manifest.json'])}`)
      if (!manifestRes.ok) throw new Error('manifest.json inaccessible')
      const manifest = await manifestRes.json()

      // 4. Sélection des parts ESP32-S3
      const board = 'esp32-s3-devkitc-1'
      const build = manifest.builds.find(b => b.board === board)
      if (!build) throw new Error(`Board ${board} non trouvé dans le manifest`)

      addLog(`📦 ${build.parts.length} fichiers à flasher`, '#60a5fa')

      // 5. Téléchargement des binaires via le backend
      const binaries = []
      for (let i = 0; i < build.parts.length; i++) {
        const part = build.parts[i]
        addLog(`⬇ ${part.path}...`, '#a0a0a0')
        const res = await fetch(`${API}/api/flash/asset?url=${encodeURIComponent(assets[part.path])}`)
        if (!res.ok) throw new Error(`Impossible de télécharger ${part.path}`)
        const data = await res.arrayBuffer()
        binaries.push({ data, offset: parseInt(part.offset, 16), name: part.path })
        setProgress(Math.round((i + 1) / build.parts.length * 40))
      }
      addLog('✓ Tous les fichiers téléchargés', '#4ade80')

      // 6. Flash via esptool-js
      setStep('flashing')
      addLog('⚡ Chargement de esptool-js...', '#60a5fa')

      const { ESPLoader, Transport } = await import('https://unpkg.com/esptool-js@0.4.4/bundle.js')

      await port.open({ baudRate: 115200 })
      const transport = new Transport(port)
      const loader = new ESPLoader({
        transport,
        baudrate: 460800,
        terminal: {
          clean:     () => {},
          writeLine: (s) => { if (s.trim()) addLog(s, '#555') },
          write:     (s) => { if (s.trim()) addLog(s, '#555') },
        },
      })

      addLog('🔍 Connexion à l\'ESP32...', '#60a5fa')
      const chip = await loader.main()
      addLog(`✓ Chip détecté : ${chip}`, '#4ade80')

      addLog('⚡ Flashage en cours...', '#fb923c')
      await loader.writeFlash({
        fileArray: binaries.map(b => ({
          data:    new Uint8Array(b.data),
          address: b.offset,
        })),
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll:  false,
        compress:  true,
        reportProgress: (idx, written, total) => {
          const pct = Math.round(40 + ((idx + written/total) / binaries.length) * 60)
          setProgress(Math.min(pct, 99))
        },
      })

      await loader.hardReset()
      setStep('done')
      setProgress(100)
      addLog('✅ ESP32 flashé avec succès !', '#4ade80')
      addLog(`   Firmware : ${ver}`, '#4ade80')
      addLog('   Débranchez et rebranchez l\'ESP32 pour le démarrer', '#888')

    } catch (err) {
      addLog(`❌ Erreur : ${err.message}`, '#ef4444')
      setStep('error')
    }
  }

  const isRunning = ['connecting','fetching','downloading','flashing'].includes(step)

  return (
    <div style={{ maxWidth: 700 }}>

      {/* Header */}
      <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 4 }}>
          ⚡ Flash ESP32 depuis le navigateur
        </div>
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          Flashe automatiquement le firmware depuis GitHub Releases via Web Serial API.
          Nécessite Chrome ou Edge avec le backend local démarré.
        </div>
        {version && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#4ade80' }}>
            Dernière version disponible : {version}
          </div>
        )}
      </div>

      {/* Guide port USB */}
      <div style={{ background: '#0d1a2e', border: '1px solid #1e3a5f', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#60a5fa', marginBottom: 6 }}>
          📋 Avant de commencer
        </div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
          1. Branche l'ESP32 via le port <strong style={{color:'#e0e0e0'}}>USB</strong> (pas COM/UART)<br/>
          2. Clique "Flasher un ESP32"<br/>
          3. Dans la popup Chrome, choisis <strong style={{color:'#e0e0e0'}}>"Espressif Device"</strong><br/>
          &nbsp;&nbsp;&nbsp;⚠ Ignore "cu.debug-console" et "Bluetooth-Incoming-Port"<br/>
          4. Clique Connexion et attends la fin du flash (~30s)
        </div>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={flash}
          disabled={isRunning}
          style={{
            padding: '8px 16px', borderRadius: 6, border: 'none',
            background: isRunning ? '#1a1a1a' : '#2563eb',
            color: isRunning ? '#444' : '#fff',
            fontSize: 12, fontWeight: 500, cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? '⏳ En cours...' : '⚡ Flasher un ESP32'}
        </button>
        {(step === 'done' || step === 'error') && (
          <button onClick={reset} style={{
            padding: '8px 16px', borderRadius: 6, border: '1px solid #2a2a2a',
            background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer',
          }}>
            Recommencer
          </button>
        )}
      </div>

      {/* Barre de progression */}
      {progress > 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: step === 'done' ? '#4ade80' : step === 'error' ? '#ef4444' : '#2563eb',
            width: `${progress}%`, transition: 'width 0.3s',
          }} />
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{
          background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8,
          padding: 12, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8,
          maxHeight: 320, overflowY: 'auto',
        }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.color }}>{l.msg}</div>
          ))}
        </div>
      )}
    </div>
  )
}
