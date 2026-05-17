import { useStore } from '../store/useStore'

function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return {
    net:      Math.floor(abs / 256),
    subnet:   Math.floor((abs % 256) / 16),
    universe: abs % 16,
  }
}

function BarStatus({ bar }) {
  if (!bar.ip) return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#1a1a1a', color: '#444', border: '1px solid #2a2a2a' }}>
      ⚫ Sans ESP
    </span>
  )
  if (!bar.online) return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#1c1000', color: '#ca8a04', border: '1px solid #713f12' }}>
      🟡 Hors ligne
    </span>
  )
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#14532d', color: '#86efac', border: '1px solid #166534' }}>
      🟢 En ligne
    </span>
  )
}

// ── Visualiseur d'une bande ───────────────────────────────────────────────────
function StripVisualizer({ strip, u1data, u2data }) {
  const colors = (() => {
    const ledCount = strip.ledCount || 100
    const result   = new Array(ledCount).fill([0, 0, 0])
    if (!u1data || u1data.length === 0) return result

    const startCh  = (strip.dmxStartChannel || 1) - 1
    const mode     = strip.dmxMode || 0

    if (mode === 2) {
      const r = u1data[startCh] || 0
      const g = u1data[startCh+1] || 0
      const b = u1data[startCh+2] || 0
      return new Array(ledCount).fill([r, g, b])
    }

    if (mode === 1) {
      const grp = strip.dmxGroupSize || 5
      for (let i = 0; i < ledCount; i++) {
        const ch = startCh + Math.floor(i / grp) * 3
        result[i] = [u1data[ch]||0, u1data[ch+1]||0, u1data[ch+2]||0]
      }
      return result
    }

    // Full Pixel
    const chInU1   = 512 - startCh
    const ledsInU1 = Math.floor(chInU1 / 3)
    for (let i = 0; i < Math.min(ledCount, ledsInU1); i++) {
      const ch = startCh + i * 3
      result[i] = [u1data[ch]||0, u1data[ch+1]||0, u1data[ch+2]||0]
    }
    if (u2data && ledCount > ledsInU1) {
      const u2StartCh = (strip.universe2StartCh || 1) - 1
      for (let i = ledsInU1; i < ledCount; i++) {
        const ch = u2StartCh + (i - ledsInU1) * 3
        result[i] = [u2data[ch]||0, u2data[ch+1]||0, u2data[ch+2]||0]
      }
    }
    return result
  })()

  const ledCount  = strip.ledCount || 100
  const u1        = fromAbsolute(strip.dmxUniverse || 0)
  const u2        = strip.universe2 > 0 ? fromAbsolute(strip.universe2) : null
  const hasSignal = colors.some(([r,g,b]) => r > 0 || g > 0 || b > 0)
  const modeLabel = ['Full Pixel', 'Grouped', 'Full Bar'][strip.dmxMode] || '—'

  const dotSize = ledCount <= 60  ? 10
                : ledCount <= 120 ? 7
                : ledCount <= 200 ? 5
                : 4
  const gap = Math.max(1, dotSize - 3)

  return (
    <div style={{
      padding: '8px 10px',
      borderTop: '1px solid #1a1a1a',
      background: '#0f0f0f',
    }}>
      {/* Header bande */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#e0e0e0' }}>
          {strip.name}
        </span>
        <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
          Net{u1.net}·Sub{u1.subnet}·U{u1.universe} · ch.{strip.dmxStartChannel || 1}
          {u2 && <span style={{ color: '#4ade80' }}> + U{u2.universe}</span>}
        </span>
        <span style={{ fontSize: 10, color: '#444' }}>
          {ledCount} LEDs · {modeLabel}
        </span>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 10, marginLeft: 'auto',
          background: hasSignal ? '#0f2a1a' : '#1a1a1a',
          color:      hasSignal ? '#4ade80' : '#333',
          border:     `1px solid ${hasSignal ? '#1a4a2a' : '#2a2a2a'}`,
        }}>
          {hasSignal ? '◉ Signal' : '○ Silence'}
        </span>
      </div>

      {/* LEDs */}
      <div style={{ display: 'flex', gap, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {colors.map(([r, g, b], i) => {
          const isOn    = r > 0 || g > 0 || b > 0
          const bgColor = isOn ? `rgb(${r},${g},${b})` : '#1a1a1a'
          const glow    = isOn ? `0 0 ${Math.round(dotSize * 0.8)}px rgba(${r},${g},${b},0.6)` : 'none'
          return (
            <div key={i} title={`LED ${i+1} — R:${r} G:${g} B:${b}`} style={{
              width: dotSize, height: dotSize,
              borderRadius: '50%', background: bgColor,
              boxShadow: glow, flexShrink: 0,
              transition: 'background 0.05s, box-shadow 0.05s',
            }} />
          )
        })}
      </div>
    </div>
  )
}

// ── Visualiseur d'un ESP32 ────────────────────────────────────────────────────
function BarVisualizer({ bar }) {
  const universes    = useStore(s => s.universes)
  const _tick        = useStore(s => s.universes._tick)
  const activeStrips = bar.strips?.filter(s => s.enabled) || []
  

  return (
    <div style={{
      background: '#141414', border: '1px solid #2a2a2a',
      borderRadius: 8, marginBottom: 8, overflow: 'hidden',
    }}>
      {/* Header ESP32 */}
      <div style={{
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#f0f0f0' }}>
          {bar.name || bar.ip || 'Barre sans nom'}
        </span>
        <span style={{ fontSize: 10, color: '#555' }}>
          {bar.ip}
        </span>
        <span style={{ fontSize: 10, color: '#555' }}>
          {activeStrips.length} bande{activeStrips.length > 1 ? 's' : ''}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <BarStatus bar={bar} />
        </div>
      </div>

      {/* Bandes */}
      {activeStrips.length === 0 ? (
        <div style={{ padding: '8px 12px', fontSize: 11, color: '#333', borderTop: '1px solid #1a1a1a' }}>
          Aucune bande active
        </div>
      ) : (
        activeStrips.map((strip, i) => (
          <StripVisualizer
            key={i}
            strip={strip}
            u1data={universes[strip.dmxUniverse] || []}
            u2data={strip.universe2 > 0 ? (universes[strip.universe2] || []) : null}
          />
        ))
      )}
    </div>
  )
}

// ── Moniteur univers DMX ──────────────────────────────────────────────────────
function UniverseMonitor() {
  const universes = useStore(s => s.universes)
  const keys      = Object.keys(universes).filter(k => k !== '_tick' && !isNaN(Number(k))).map(Number).sort((a,b) => a-b)

  if (keys.length === 0) return (
    <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: 16 }}>
      Aucun flux Art-Net détecté
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {keys.map(u => {
        const data    = universes[u]
        const u1      = fromAbsolute(u)
        const nonZero = data ? data.filter(v => v > 0).length : 0
        const peak    = data ? Math.max(...data) : 0

        return (
          <div key={u} style={{
            background: '#141414', border: '1px solid #2a2a2a',
            borderRadius: 6, padding: '6px 10px', minWidth: 160, width: 160,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#e0e0e0', marginBottom: 2 }}>
              Univers {u}
            </div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
              Net{u1.net}·Sub{u1.subnet}·U{u1.universe}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2, fontFamily: 'monospace' }}>
              {String(nonZero).padStart(3, ' ')} canaux actifs · peak {String(peak).padStart(3, ' ')}
            </div>
            <div style={{ display: 'flex', gap: 1, marginTop: 6, height: 4, borderRadius: 2, overflow: 'hidden' }}>
              {data && Array.from({ length: 64 }, (_, i) => {
                const val = data[Math.floor(i * 8)] || 0
                return (
                  <div key={i} style={{
                    flex: 1,
                    background: val > 0 ? `rgba(96,165,250,${val/255})` : '#1a1a1a',
                  }} />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Visualizer() {
  const bars      = useStore(s => s.bars)
  const universes = useStore(s => s.universes)

  const activeUniverses = Object.keys(universes).filter(k => k !== '_tick' && !isNaN(Number(k))).length
  const activeBars      = bars.filter(b => b.online).length
  const totalStrips     = bars.reduce((acc, b) => acc + (b.strips?.filter(s => s.enabled).length || 0), 0)

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'ESP32 en ligne',        value: activeBars,      color: '#4ade80' },
          { label: 'Bandes actives',         value: totalStrips,     color: '#60a5fa' },
          { label: 'Univers Art-Net actifs', value: activeUniverses, color: '#fb923c' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#141414', border: '1px solid #2a2a2a',
            borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 120,
          }}>
            <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Moniteur univers */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 14, marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Univers Art-Net reçus
        </div>
        <UniverseMonitor />
      </div>

      {/* Visualiseur */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Bandes LED — temps réel
        </div>

        {bars.length === 0 ? (
          <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: 20 }}>
            Aucune barre configurée
          </div>
        ) : (
          bars.map(bar => (
            <BarVisualizer key={bar.ip || bar.name} bar={bar} />
          ))
        )}
      </div>
    </div>
  )
}