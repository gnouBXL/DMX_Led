import StatusBadge from './StatusBadge'
import { useStore } from '../store/useStore'

export default function BarCard({ bar }) {
  const selectBar = useStore(s => s.selectBar)
  const selectedBar = useStore(s => s.selectedBar)
  const isSelected = selectedBar?.ip === bar.ip

  const modeLabel = ['Full Pixel', 'Grouped', 'Full Bar'][bar.dmxMode] || '—'

  let channels = 0
  if (bar.dmxMode === 0) channels = (bar.ledCount || 0) * 3
  else if (bar.dmxMode === 1) channels = Math.ceil((bar.ledCount || 0) / (bar.dmxGroupSize || 1)) * 3
  else channels = 3
  const lastCh = (bar.dmxStartChannel || 1) + channels - 1

  return (
    <div
      onClick={() => selectBar(bar.ip)}
      style={{
        background: isSelected ? '#1a2535' : '#141414',
        border: `1px solid ${isSelected ? '#2563eb' : '#2a2a2a'}`,
        borderRadius: 10,
        padding: 16,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#f0f0f0' }}>{bar.name || bar.ip}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{bar.ip}</div>
        </div>
        <StatusBadge online={bar.online} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        <Info label="Univers" value={bar.dmxUniverse ?? '—'} />
        <Info label="Canal départ" value={bar.dmxStartChannel ?? '—'} />
        <Info label="LEDs" value={bar.ledCount ?? '—'} />
        <Info label="Mode" value={modeLabel} />
        <Info label="Dernier canal" value={bar.online ? lastCh : '—'} />
        <Info label="RSSI" value={bar.rssi ? `${bar.rssi} dBm` : '—'} />
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#a0a0a0' }}>{value}</div>
    </div>
  )
}