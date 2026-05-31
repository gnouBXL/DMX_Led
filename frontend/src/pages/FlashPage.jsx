import { useState, useEffect, useRef } from 'react'

const MANIFEST_URL = 'http://localhost:3001/api/flash/manifest'

const BOARDS = [
  { id: 'esp32-s3-devkitc-1', name: 'ESP32-S3 DevKitC-1', description: '4 bandes LED — board de développement standard', icon: '🔧', strips: 4 },
  { id: 'esp32-s3-mini', name: 'ESP32-S3 Mini', description: '4 bandes LED — format compact', icon: '⚡', strips: 4 },
  { id: 'esp32-c3-mini', name: 'ESP32-C3 Super Mini', description: '1 bande LED — très compact, économique', icon: '🔹', strips: 1 },
  { id: 'esp32-c3-oled', name: 'ESP32-C3 OLED 0.42"', description: '1 bande LED + écran OLED (IP, statut, Art-Net)', icon: '🖥', strips: 1 },
]

function EspInstallButton({ manifestUrl }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.setAttribute('manifest', manifestUrl) }, [manifestUrl])
  return <esp-web-install-button ref={ref} />
}

export default function FlashPage() {
  const [espWebToolsLoaded, setEspWebToolsLoaded] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState(BOARDS[0])

  useEffect(() => {
    if (!customElements.get('esp-web-install-button')) {
      const script = document.createElement('script')
      script.type = 'module'
      script.src = 'https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module'
      script.onload = () => setEspWebToolsLoaded(true)
      document.head.appendChild(script)
    } else {
      setEspWebToolsLoaded(true)
    }
  }, [])

  const manifestUrl = `${MANIFEST_URL}?board=${selectedBoard.id}`

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 4 }}>⚡ Flash ESP32 depuis le navigateur</div>
        <div style={{ fontSize: 11, color: '#555' }}>Flashe automatiquement le firmware depuis GitHub Releases via ESP Web Tools. Nécessite Chrome ou Edge.</div>
      </div>
      <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#f0f0f0', marginBottom: 10 }}>🔌 Choisir le board</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {BOARDS.map(board => (
            <div key={board.id} onClick={() => setSelectedBoard(board)} style={{ background: selectedBoard.id === board.id ? '#1e3a5f' : '#0d0d0d', border: `1px solid ${selectedBoard.id === board.id ? '#2563eb' : '#2a2a2a'}`, borderRadius: 8, padding: 10, cursor: 'pointer' }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{board.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#f0f0f0', marginBottom: 2 }}>{board.name}</div>
              <div style={{ fontSize: 10, color: '#555' }}>{board.description}</div>
              <div style={{ fontSize: 10, color: '#2563eb', marginTop: 4 }}>{board.strips} bande{board.strips > 1 ? 's' : ''} LED</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#0d1a2e', border: '1px solid #1e3a5f', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#60a5fa', marginBottom: 6 }}>📋 Procédure de flash — {selectedBoard.name}</div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
          1. Branche via le port <strong style={{color:'#e0e0e0'}}>COM/UART</strong><br/>
          2. Mode bootloader : maintiens <strong style={{color:'#e0e0e0'}}>BOOT</strong> → appuie <strong style={{color:'#e0e0e0'}}>RESET</strong> → relâche <strong style={{color:'#e0e0e0'}}>BOOT</strong><br/>
          3. Clique <strong style={{color:'#e0e0e0'}}>&quot;Connect&quot;</strong> ci-dessous<br/>
          4. Choisis <strong style={{color:'#e0e0e0'}}>&quot;USB Single Serial&quot;</strong><br/>
          5. Clique <strong style={{color:'#e0e0e0'}}>&quot;Install LED Controller&quot;</strong> → attends ~30s
        </div>
      </div>
      <div style={{ background: '#0d2a1a', border: '1px solid #1e5f3a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#4ade80', marginBottom: 6 }}>✅ Après le flash</div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
          1. Appuie sur <strong style={{color:'#e0e0e0'}}>RESET</strong><br/>
          2. Réseau temporaire <strong style={{color:'#e0e0e0'}}>LED-SETUP-[nom]</strong> — mdp : <strong style={{color:'#e0e0e0'}}>ledsetup123</strong><br/>
          3. Ouvre <strong style={{color:'#e0e0e0'}}>http://192.168.4.1</strong> → configure le Wi-Fi<br/>
          4. Le board rejoint le réseau → apparaît dans le Dashboard
        </div>
      </div>
      <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>Board : <strong style={{color:'#f0f0f0'}}>{selectedBoard.icon} {selectedBoard.name}</strong></div>
        {espWebToolsLoaded ? <EspInstallButton manifestUrl={manifestUrl} /> : <div style={{ fontSize: 12, color: '#555' }}>Chargement...</div>}
        <div style={{ fontSize: 10, color: '#333', marginTop: 12 }}>Propulsé par <a href="https://esphome.github.io/esp-web-tools/" target="_blank" rel="noreferrer" style={{ color: '#555' }}>ESP Web Tools</a></div>
      </div>
    </div>
  )
}
