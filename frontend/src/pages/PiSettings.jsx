import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL
  || `http://${window.location.hostname}:3001`

export default function PiSettings() {
  const [info, setInfo]         = useState(null)
  const [updateState, setUpdateState] = useState(null)
  // null | 'updating' | 'done' | { error }

  useEffect(() => {
    fetch(`${API_BASE}/api/system/info`)
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [])

  const handleUpdate = async () => {
    setUpdateState('updating')
    try {
      await fetch(`${API_BASE}/api/system/update`, { method: 'POST' })
      setUpdateState('done')
      // Le serveur redémarre — on recharge après 35s
      setTimeout(() => window.location.reload(), 35000)
    } catch {
      setUpdateState('done') // restart coupe la connexion = normal
      setTimeout(() => window.location.reload(), 35000)
    }
  }

  const handleReboot = async () => {
    if (!confirm('Redémarrer le Raspberry Pi ?')) return
    await fetch(`${API_BASE}/api/system/reboot`, { method: 'POST' }).catch(() => {})
  }

  const uptimeStr = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontSize: 13, color: '#555', fontWeight: 500, marginBottom: 20 }}>
        RASPBERRY PI — SERVEUR
      </h2>

      {/* Infos système */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 20, marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0', marginBottom: 14 }}>
          Informations
        </div>
        {info ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <InfoRow label="Version" value={info.version} mono />
            <InfoRow label="Branche" value={info.branch} mono />
            <InfoRow label="Date build" value={info.date?.slice(0, 10) || '—'} />
            <InfoRow label="Node.js" value={info.node} mono />
            <InfoRow label="Uptime" value={uptimeStr(info.uptime)} />
            <InfoRow label="Mémoire" value={`${Math.round(info.memory / 1024 / 1024)} MB`} />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#555' }}>Chargement...</div>
        )}
      </div>

      {/* Mise à jour */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 20, marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0', marginBottom: 8 }}>
          Mise à jour depuis GitHub
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>
          Récupère la dernière version, rebuild le frontend et redémarre le service (~30s).
        </div>

        {updateState === 'updating' && (
          <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 12 }}>
            ⏳ Mise à jour en cours... La page se rechargera automatiquement dans ~35s.
          </div>
        )}
        {updateState === 'done' && (
          <div style={{ fontSize: 12, color: '#22c55e', marginBottom: 12 }}>
            ✓ Mise à jour lancée — rechargement en cours...
          </div>
        )}

        <button
          onClick={handleUpdate}
          disabled={!!updateState}
          style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: updateState ? '#1a1a1a' : '#2563eb',
            color: updateState ? '#555' : '#fff',
            fontSize: 12, fontWeight: 500,
            cursor: updateState ? 'not-allowed' : 'pointer',
          }}
        >
          ⬆ Mettre à jour le Pi
        </button>
      </div>

      {/* Redémarrage */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0', marginBottom: 8 }}>
          Redémarrage système
        </div>
        <button
          onClick={handleReboot}
          style={{
            padding: '8px 20px', borderRadius: 6,
            border: '1px solid #7f1d1d', background: 'transparent',
            color: '#ef4444', fontSize: 12, cursor: 'pointer',
          }}
        >
          Redémarrer le Pi
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#a0a0a0', fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  )
}
