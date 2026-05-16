import { useStore } from '../store/useStore'
import { useMemo } from 'react'

// ── Conversion univers absolu → Net/Sub/U ─────────────────────────────────────
function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return {
    net:      Math.floor(abs / 256),
    subnet:   Math.floor((abs % 256) / 16),
    universe: abs % 16,
  }
}

// ── Statut de la barre ────────────────────────────────────────────────────────
function BarStatus({ bar }) {
  if (!bar.ip) {
    return (
      <span style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 10,
        background: '#1a1a1a', color: '#444',
        border: '1px solid #2a2a2a',
      }}>⚫ Sans ESP</span>
    )
  }
  if (!bar.online) {
    return (
      <span style={{
        fontSize: 10, padding: '2px 7px', borderRadius: 10,
        background: '#1c1000', color: '#ca8a04',
        border: '1px solid #713f12',
      }}>🟡 Hors ligne</span>
    )
  }
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 10,
      background: '#14532d', color: '#86efac',
      border: '1px solid #166534',
    }}>🟢 En ligne</span>
  )
}

// ── Visualiseur d'une barre ───────────────────────────────────────────────────
function BarVisualizer({ bar }) {
  const getBarColors = useStore(s => s.getBarColors)
  const universes    = useStore(s => s.universes)

  const colors = useMemo(() => {
    return getBarColors(bar)
  }, [bar, universes[bar.dmxUniverse], universes[bar.universe2]])

  const ledCount = bar.ledCount || 100
  const u1       = fromAbsolute(bar.dmxUniverse || 0)
  const u2       = bar.universe2 ? fromAbsolute(bar.universe2) : null

  const totalCh  = bar.dmxMode === 2 ? 3
                 : bar.dmxMode === 1 ? Math.ceil(ledCount / (bar.dmxGroupSize || 5)) * 3
                 : ledCount * 3

  const lastCh   = u2
    ? `U${bar.universe2} · ch.${bar.universe2StartCh + (totalCh - (512 - (bar.dmxStartChannel - 1))) - 1}`
    : `ch.${(bar.dmxStartChannel || 1) + Math.min(totalCh, 512) - 1}`

  const modeLabel = ['Full Pixel', 'Grouped', 'Full Bar'][bar.dmxMode] || '—'

  // Vérifie si la barre reçoit du signal
  const hasSignal = colors.some(([r,g,b]) => r > 0 || g > 0 || b > 0)

  return (
    <div style={{
      background: '#141414',
      border: '1px solid #2a2a2a',
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      {/* Header barre */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 8, flexWrap: 'wrap',
      }}>
        {/* Nom */}
        <span style={{ fontSize: 12, fontWeight: 500, color: '#f0f0f0', minWidth: 120 }}>
          {bar.name || bar.ip || 'Barre sans nom'}
        </span>

        {/* Adressage */}
        <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
          Net{u1.net}·Sub{u1.subnet}·U{u1.universe}
          {' · '}ch.{bar.dmxStartChannel || 1}→{lastCh}
          {u2 && (
            <span style={{ color: '#4ade80' }}>
              {' + '}Net{u2.net}·Sub{u2.subnet}·U{u2.universe}
            </span>
          )}
        </span>

        {/* Infos */}
        <span style={{ fontSize: 10, color: '#444' }}>
          {ledCount} LEDs · {modeLabel}
        </span>

        {/* Signal indicator */}
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 10, marginLeft: 'auto',
          background: hasSignal ? '#0f2a1a' : '#1a1a1a',
          color:      hasSignal ? '#4ade80' : '#333',
          border:     `1px solid ${hasSignal ? '#1a4a2a' : '#2a2a2a'}`,
        }}>
          {hasSignal ? '◉ Signal' : '○ Silence'}
        </span>

        {/* Statut ESP */}
        <BarStatus bar={bar} />
      </div>

      {/* Strip LED */}
      <LedStrip colors={colors} ledCount={ledCount} />
    </div>
  )
}

// ── Strip de LEDs ─────────────────────────────────────────────────────────────
function LedStrip({ colors, ledCount }) {
  // Taille du point selon le nombre de LEDs
  const dotSize = ledCount <= 60  ? 10
                : ledCount <= 120 ? 7
                : ledCount <= 200 ? 5
                : 4

  const gap = Math.max(1, dotSize - 3)

  return (
    <div style={{
      display: 'flex',
      gap: gap,
      flexWrap: 'nowrap',
      overflowX: 'auto',
      paddingBottom: 4,
    }}>
      {colors.map(([r, g, b], i) => {
        const isOn    = r > 0 || g > 0 || b > 0
        const bgColor = isOn ? `rgb(${r},${g},${b})` : '#1a1a1a'
        const glow    = isOn
          ? `0 0 ${Math.round(dotSize * 0.8)}px rgba(${r},${g},${b},0.6)`
          : 'none'

        return (
          <div
            key={i}
            title={`LED ${i+1} — R:${r} G:${g} B:${b}`}
            style={{
              width:        dotSize,
              height:       dotSize,
              borderRadius: '50%',
              background:   bgColor,
              boxShadow:    glow,
              flexShrink:   0,
              transition:   'background 0.05s, box-shadow 0.05s',
            }}
          />
        )
      })}
    </div>
  )
}

// ── Moniteur univers DMX ──────────────────────────────────────────────────────
function UniverseMonitor() {
  const universes = useStore(s => s.universes)
  const keys      = Object.keys(universes).map(Number).sort((a,b) => a-b)

  if (keys.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: 16 }}>
        Aucun flux Art-Net détecté
      </div>
    )
  }

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
            borderRadius: 6, padding: '6px 10px', minWidth: 120,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#e0e0e0', marginBottom: 2 }}>
              Univers {u}
            </div>
            <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
              Net{u1.net}·Sub{u1.subnet}·U{u1.universe}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
              {nonZero} canaux actifs · peak {peak}
            </div>
            {/* Mini visu canaux */}
            <div style={{
              display: 'flex', gap: 1, marginTop: 6,
              height: 4, borderRadius: 2, overflow: 'hidden',
            }}>
              {data && Array.from({ length: 64 }, (_, i) => {
                const val = data[Math.floor(i * 8)] || 0
                return (
                  <div key={i} style={{
                    flex: 1,
                    background: val > 0
                      ? `rgba(96,165,250,${val/255})`
                      : '#1a1a1a',
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

  const activeUniverses = Object.keys(universes).length
  const activeBars      = bars.filter(b => b.online).length

  return (
    <div>
      {/* Stats globales */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Barres en ligne',      value: activeBars,      color: '#4ade80' },
          { label: 'Univers Art-Net actifs', value: activeUniverses, color: '#60a5fa' },
          { label: 'Barres configurées',   value: bars.length,     color: '#a0a0a0' },
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
        <div style={{
          fontSize: 11, fontWeight: 500, color: '#666',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: 10,
        }}>
          Univers Art-Net reçus
        </div>
        <UniverseMonitor />
      </div>

      {/* Visualiseur barres */}
      <div style={{
        background: '#141414', border: '1px solid #2a2a2a',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 500, color: '#666',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: 10,
        }}>
          Barres LED — temps réel
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