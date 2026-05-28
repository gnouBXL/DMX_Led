
import { useState, useEffect } from 'react'

const MANIFEST_URL = 'https://github.com/gnouBXL/DMX_Led/releases/latest/download/manifest.json'

export default function FlashPage() {
  const [espWebToolsLoaded, setEspWebToolsLoaded] = useState(false)

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

  return (
    <div style={{ maxWidth: 700 }}>

      {/* Header */}
      <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 4 }}>
          ⚡ Flash ESP32 depuis le navigateur
        </div>
        <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
          Flashe automatiquement le firmware depuis GitHub Releases via ESP Web Tools.
          Nécessite Chrome ou Edge.
        </div>
      </div>

      {/* Guide */}
      <div style={{ background: '#0d1a2e', border: '1px solid #1e3a5f', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#60a5fa', marginBottom: 6 }}>
          📋 Avant de commencer
        </div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
          1. Branche l'ESP32 via le port <strong style={{color:'#e0e0e0'}}>COM/UART</strong> (pas USB natif)<br/>
          2. Mets l'ESP32 en mode bootloader :<br/>
          &nbsp;&nbsp;&nbsp;• Maintiens <strong style={{color:'#e0e0e0'}}>BOOT</strong> appuyé<br/>
          &nbsp;&nbsp;&nbsp;• Appuie sur <strong style={{color:'#e0e0e0'}}>RESET</strong> brièvement<br/>
          &nbsp;&nbsp;&nbsp;• Relâche <strong style={{color:'#e0e0e0'}}>BOOT</strong><br/>
          3. Clique <strong style={{color:'#e0e0e0'}}>"Install"</strong> ci-dessous<br/>
          4. Choisis <strong style={{color:'#e0e0e0'}}>"USB Single Serial"</strong> dans la popup Chrome<br/>
          5. Attends la fin du flash (~30s)
        </div>
      </div>

      {/* Bouton ESP Web Tools */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 20, textAlign: 'center',
      }}>
        {espWebToolsLoaded ? (
          <esp-web-install-button
            manifest={MANIFEST_URL}
            style={{ '--esp-tools-button-color': '#2563eb', '--esp-tools-button-text-color': '#fff' }}
          />
        ) : (
          <div style={{ fontSize: 12, color: '#555' }}>Chargement...</div>
        )}
        <div style={{ fontSize: 10, color: '#333', marginTop: 12, lineHeight: 1.6 }}>
          Propulsé par <a href="https://esphome.github.io/esp-web-tools/" target="_blank" rel="noreferrer" style={{ color: '#555' }}>ESP Web Tools</a> — la même technologie que WLED
        </div>
      </div>

    </div>
  )
}