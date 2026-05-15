// Visualisation temps réel des barres LED
export default function LedVisualizer({ bars }) {
    if (!bars || bars.length === 0) return null
  
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bars.map(bar => (
          <BarVisual key={bar.ip} bar={bar} />
        ))}
      </div>
    )
  }
  
  function BarVisual({ bar }) {
    const ledCount = bar.ledCount || 30
    const mode = bar.dmxMode || 0
  
    // Génère des couleurs de démo selon le mode
    const leds = Array.from({ length: ledCount }, (_, i) => {
      if (!bar.online) return '#1a1a1a'
      if (mode === 2) return bar.testColor || '#ff3300'
      if (mode === 1) {
        const group = Math.floor(i / (bar.dmxGroupSize || 5))
        const hue = (group * 40) % 360
        return `hsl(${hue}, 80%, 40%)`
      }
      const hue = (i / ledCount) * 360
      return `hsl(${hue}, 80%, 40%)`
    })
  
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontSize: 11, color: '#555', width: 100,
          flexShrink: 0, textAlign: 'right', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {bar.name || bar.ip}
        </div>
        <div style={{
          display: 'flex', flex: 1, height: 16,
          borderRadius: 4, overflow: 'hidden', gap: 1,
        }}>
          {leds.map((color, i) => (
            <div key={i} style={{
              flex: 1, background: color,
              minWidth: 2,
            }} />
          ))}
        </div>
      </div>
    )
  }