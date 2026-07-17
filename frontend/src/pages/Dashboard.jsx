import { useState } from 'react'
import { useStore } from '../store/useStore'

const API_BASE = import.meta.env.VITE_API_URL
  || `http://${window.location.hostname}:3001`
import BarCard from '../components/BarCard'
import LedVisualizer from '../components/LedVisualizer'
import BarConfig from './BarConfig'
import TouchDesignerSetup from './TouchDesignerSetup'
import Visualizer from './Visualizer'
import FlashPage from './FlashPage'
import PiSettings from './PiSettings'


export default function Dashboard() {
  const bars = useStore(s => s.bars)
  const selectedBar = useStore(s => s.selectedBar)
  const selectedStrip = useStore(s => s.selectedStrip)
  const clearSelection = useStore(s => s.clearSelection)
  const [tab, setTab] = useState('dashboard')

  const online  = bars.filter(b => b.online).length
  const offline = bars.length - online
  const [otaAllState, setOtaAllState] = useState(null)

  const handleUpdateAll = async () => {
    const targets = bars.filter(b => b.online)
    if (!targets.length) return
    setOtaAllState(`0/${targets.length}`)
    let done = 0
    for (const bar of targets) {
      try {
        await fetch(`${API_BASE}/api/bars/${bar.ip}/ota`, { method: 'POST' })
      } catch (_) {}
      done++
      setOtaAllState(`${done}/${targets.length}`)
    }
    setOtaAllState('done')
    setTimeout(() => setOtaAllState(null), 5000)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f0' }}>
            💡 LED Controller
          </h1>
          <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
            {online} en ligne · {offline} hors ligne · {bars.length} barres total
          </p>
          {tab === 'dashboard' && online > 0 && (
            <button
              onClick={handleUpdateAll}
              disabled={!!otaAllState}
              style={{
                marginTop: 6, fontSize: 11, padding: '4px 12px', borderRadius: 6,
                border: '1px solid #2563eb', background: 'transparent',
                color: otaAllState === 'done' ? '#22c55e' : '#2563eb',
                cursor: otaAllState ? 'default' : 'pointer',
              }}
            >
              {otaAllState === 'done' ? '✓ Tous mis à jour !'
               : otaAllState ? `⬆ Mise à jour ${otaAllState}...`
               : `⬆ Tout mettre à jour (${online})`}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['dashboard', 'visualizer', 'realtime', 'touchdesigner', 'flash', 'pi'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              fontSize: 12, fontWeight: 500,
              background: tab === t ? '#2563eb' : '#1e1e1e',
              color: tab === t ? '#fff' : '#a0a0a0',
            }}>
              {t === 'dashboard' ? 'Dashboard'
              : t === 'visualizer' ? '🎥 Visualiseur'
              : t === 'realtime' ? '🔄 Temps réel'
              : t === 'touchdesigner' ? '🎛 TouchDesigner'
              : t === 'flash' ? '⚡ Flash'
              : '🍓 Pi'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu selon onglet */}
      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedBar ? '1fr 380px' : '1fr', gap: 16 }}>

          {/* Grille des barres */}
          <div>
            {bars.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {bars.map(bar => <BarCard key={bar.ip} bar={bar} />)}
              </div>
            )}
          </div>

          {/* Panel config si une barre est sélectionnée */}
          {selectedBar && selectedStrip && (
            <div style={{
              background: '#141414', border: '1px solid #2a2a2a',
              borderRadius: 10, padding: 16, height: 'fit-content',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  Configuration — Bande {selectedStrip.stripIndex + 1}
                </span>
                <button onClick={clearSelection} style={{
                  background: 'none', border: 'none', color: '#555',
                  fontSize: 18, lineHeight: 1,
                }}>×</button>
              </div>
              <BarConfig
                key={`${selectedBar.ip}-${selectedStrip.stripIndex}`}
                bar={selectedBar}
                stripIndex={selectedStrip.stripIndex}
              />
            </div>
          )}
        </div>
      )}

        {tab === 'visualizer' && (
        <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 13, color: '#555', marginBottom: 16, fontWeight: 500 }}>
            VISUALISATION TEMPS RÉEL
          </h2>
          <LedVisualizer bars={bars} />
        </div>
      )}
      
      {tab === 'realtime' && (
        <Visualizer />
      )}

      {tab === 'touchdesigner' && (
        <TouchDesignerSetup />
      )}

      {tab === 'flash' && (
        <FlashPage />
      )}

      {tab === 'pi' && (
        <PiSettings />
      )}
    </div>
  )
}

function Empty() {
  return (
    <div style={{
      background: '#141414', border: '1px solid #2a2a2a',
      borderRadius: 10, padding: 40, textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 14, color: '#555' }}>
        Aucune barre détectée
      </div>
      <div style={{ fontSize: 12, color: '#333', marginTop: 6 }}>
        Assurez-vous que les ESP32 sont sur le même réseau
      </div>
    </div>
  )
}