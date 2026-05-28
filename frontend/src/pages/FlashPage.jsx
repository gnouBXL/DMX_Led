
import { useState, useEffect, useRef } from 'react'

const MANIFEST_URL = 'http://localhost:3001/api/flash/manifest'

function EspInstallButton({ manifestUrl }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('manifest', manifestUrl)
    }
  }, [manifestUrl])
  return <esp-web-install-button ref={ref} />
}

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
          📋 Procédure de flash
        </div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
          1. Branche l'ESP32 via le port <strong style={{color:'#e0e0e0'}}>COM/UART</strong> (pas USB natif)<br/>
          2. Mets l'ESP32 en mode bootloader :<br/>
          &nbsp;&nbsp;&nbsp;• Maintiens <strong style={{color:'#e0e0e0'}}>BOOT</strong> appuyé<br/>
          &nbsp;&nbsp;&nbsp;• Appuie sur <strong style={{color:'#e0e0e0'}}>RESET</strong> brièvement<br/>
          &nbsp;&nbsp;&nbsp;• Relâche <strong style={{color:'#e0e0e0'}}>BOOT</strong><br/>
          3. Clique <strong style={{color:'#e0e0e0'}}>"Connect"</strong> ci-dessous<br/>
          4. Choisis <strong style={{color:'#e0e0e0'}}>"USB Single Serial"</strong> dans la popup Chrome<br/>
          5. Clique <strong style={{color:'#e0e0e0'}}>"Install LED Controller"</strong> puis attends ~30s
        </div>
      </div>

      <div style={{ background: '#0d2a1a', border: '1px solid #1e5f3a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#4ade80', marginBottom: 6 }}>
          ✅ Après le flash — étapes suivantes
        </div>
        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
          1. Appuie sur <strong style={{color:'#e0e0e0'}}>RESET</strong> pour redémarrer l'ESP32<br/>
          2. L'ESP32 crée un réseau Wi-Fi temporaire <strong style={{color:'#e0e0e0'}}>LED-SETUP-[nom]</strong><br/>
          3. Connecte ton Mac à ce réseau (mdp : <strong style={{color:'#e0e0e0'}}>ledsetup123</strong>)<br/>
          4. Ouvre <strong style={{color:'#e0e0e0'}}>http://192.168.4.1</strong> dans ton navigateur<br/>
          5. Va dans <strong style={{color:'#e0e0e0'}}>Wi-Fi</strong> → scanne et connecte-toi à ton réseau<br/>
          6. L'ESP32 redémarre et rejoint le réseau → il apparaît dans le <strong style={{color:'#e0e0e0'}}>Dashboard</strong><br/>
          <br/>
          💡 Si l'ESP32 était déjà configuré, il rejoint automatiquement son réseau Wi-Fi sans étapes supplémentaires.
        </div>
      </div>

      {/* Bouton ESP Web Tools */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 20, textAlign: 'center',
      }}>
        {espWebToolsLoaded ? (
          <EspInstallButton manifestUrl={MANIFEST_URL} />
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