import StatusBadge from './StatusBadge'
import { useStore } from '../store/useStore'

function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return {
    net:      Math.floor(abs / 256),
    subnet:   Math.floor((abs % 256) / 16),
    universe: abs % 16,
  }
}

function StripRow({ strip, index, barIp, isSelected }) {
  const selectStrip = useStore(s => s.selectStrip)
  const modeLabel   = ['Full Pixel', 'Grouped', 'Full Bar'][strip.dmxMode] || '—'
  const u1          = fromAbsolute(strip.dmxUniverse || 0)
  const totalCh     = strip.dmxMode === 0 ? (strip.ledCount || 0) * 3
                    : strip.dmxMode === 1 ? Math.ceil((strip.ledCount || 0) / (strip.dmxGroupSize || 5)) * 3
                    : 3
  const lastCh      = (strip.dmxStartChannel || 1) + Math.min(totalCh, 512) - 1

  return (
    <div
      onClick={e => { e.stopPropagation(); selectStrip(barIp, index) }}
      style={{
        padding:      '8px 10px',
        background:   isSelected ? '#1a2535' : '#0f0f0f',
        borderRadius: 6,
        marginTop:    6,
        borderLeft:   `2px solid ${strip.enabled ? '#2563eb' : '#333'}`,
        cursor:       'pointer',
        transition:   'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: strip.enabled ? 4 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: strip.enabled ? '#e0e0e0' : '#444' }}>
          {strip.name || `Bande ${index + 1}`}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {strip.enabled && (
            <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
              GPIO {strip.pin}
            </span>
          )}
          {!strip.enabled && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 10,
              background: '#1a1a1a', color: '#444', border: '1px solid #2a2a2a',
            }}>
              Inactif — cliquer pour configurer
            </span>
          )}
        </div>
      </div>

      {strip.enabled && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
          <Info label="Univers" value={`Net${u1.net}·Sub${u1.subnet}·U${u1.universe}`} />
          <Info label="Canal"   value={`${strip.dmxStartChannel || 1} → ${lastCh}`} />
          <Info label="LEDs"    value={strip.ledCount} />
          <Info label="Mode"    value={modeLabel} />
        </div>
      )}
    </div>
  )
}

export default function BarCard({ bar }) {
  const selectedStrip = useStore(s => s.selectedStrip)

  // Crée un tableau de 4 slots même si strips est incomplet
  const allStrips = Array.from({ length: 4 }, (_, i) =>
    bar.strips?.[i] || {
      enabled:         false,
      pin:             [4, 5, 6, 7][i],
      name:            `bande-${i + 1}`,
      ledCount:        100,
      dmxUniverse:     0,
      dmxStartChannel: 1,
      dmxMode:         0,
      dmxGroupSize:    5,
      universe2:       0,
      universe2StartCh: 1,
      universe2LedStart: 0,
      universeMode:    0,
    }
  )

  return (
    <div style={{
      background:   '#141414',
      border:       '1px solid #2a2a2a',
      borderRadius: 10,
      padding:      14,
    }}>
      {/* Header ESP32 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#f0f0f0' }}>
            {bar.name || bar.ip}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{bar.ip}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge online={bar.online} />
          <span style={{ fontSize: 10, color: '#555' }}>
            {bar.rssi ? `${bar.rssi} dBm` : '—'}
          </span>
        </div>
      </div>

      {/* 4 slots de bandes */}
      {allStrips.map((strip, i) => (
        <StripRow
          key={i}
          strip={strip}
          index={i}
          barIp={bar.ip}
          isSelected={selectedStrip?.barIp === bar.ip && selectedStrip?.stripIndex === i}
        />
      ))}

      <div style={{ marginTop: 8, fontSize: 10, color: '#333', textAlign: 'right' }}>
        firmware {bar.firmware || '—'}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#a0a0a0' }}>{value}</div>
    </div>
  )
}