import { useState } from 'react'
import { useStore } from '../store/useStore'

function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return {
    net:      Math.floor(abs / 256),
    subnet:   Math.floor((abs % 256) / 16),
    universe: abs % 16,
  }
}

const card = {
  background: '#141414', border: '1px solid #2a2a2a',
  borderRadius: 10, padding: 16, marginBottom: 12,
}
const cardTitle = {
  fontSize: 11, fontWeight: 500, color: '#666',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
}
const tag = (color) => ({
  display: 'inline-block', padding: '2px 8px',
  borderRadius: 4, fontSize: 10, fontWeight: 500,
  background: color + '22', color, border: `1px solid ${color}44`,
})
const mono = {
  fontFamily: 'monospace', fontSize: 11,
  background: '#0a0a0a', padding: '2px 6px',
  borderRadius: 4, color: '#60a5fa',
}
const monoGreen  = { ...mono, color: '#4ade80' }
const monoOrange = { ...mono, color: '#fb923c' }
const row = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', padding: '4px 0',
  borderBottom: '1px solid #1a1a1a', fontSize: 11,
}
const label = { color: '#555', minWidth: 160 }

export default function TouchDesignerSetup() {
  const bars = useStore(s => s.bars)
  const [copied, setCopied] = useState(null)

  const onlineBars = bars.filter(b => b.online)

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateRoutingTable = () => {
    const lines = ['net\tsubnet\tuniverse\tnetaddress']
    const seen  = new Set()

    onlineBars.forEach(bar => {
      const strips = bar.strips?.filter(s => s.enabled) || []
      strips.forEach(strip => {
        const u1  = fromAbsolute(strip.dmxUniverse || 0)
        const k1  = `${u1.net}-${u1.subnet}-${u1.universe}`
        if (!seen.has(k1)) {
          seen.add(k1)
          lines.push(`${u1.net}\t${u1.subnet}\t${u1.universe}\t255.255.255.255`)
        }
        if (strip.universe2 > 0) {
          const u2  = fromAbsolute(strip.universe2)
          const k2  = `${u2.net}-${u2.subnet}-${u2.universe}`
          if (!seen.has(k2)) {
            seen.add(k2)
            lines.push(`${u2.net}\t${u2.subnet}\t${u2.universe}\t255.255.255.255`)
          }
        }
      })
    })

    return lines.join('\n')
  }

  const generatePythonScript = () => {
    const fixtures = []
    onlineBars.forEach(bar => {
      const strips = bar.strips?.filter(s => s.enabled) || []
      strips.forEach(strip => {
        const u1 = fromAbsolute(strip.dmxUniverse || 0)
        fixtures.push({
          name:   strip.name || bar.name,
          esp:    bar.name || bar.ip,
          leds:   strip.ledCount,
          net:    u1.net,
          subnet: u1.subnet,
          univ:   u1.universe,
          ch:     strip.dmxStartChannel || 1,
          gpio:   strip.pin,
        })
      })
    })

    return `# DMX LED Controller — TouchDesigner Setup Script
# Généré automatiquement depuis le dashboard

def setup_dmx_fixtures():
    fixtures = [
${fixtures.map(f => `        {
            "name":    "${f.name}",
            "esp":     "${f.esp}",
            "gpio":    ${f.gpio},
            "leds":    ${f.leds},
            "net":     ${f.net},
            "subnet":  ${f.subnet},
            "universe":${f.univ},
            "channel": ${f.ch},
        },`).join('\n')}
    ]

    print(f"Configuration de {len(fixtures)} bandes LED...")
    for i, f in enumerate(fixtures):
        print(f"  [{f['esp']} GPIO{f['gpio']}] {f['name']} — "
              f"Net{f['net']}/Sub{f['subnet']}/U{f['universe']} "
              f"ch.{f['channel']} — {f['leds']} LEDs")
    print("\\nCréer un DMX Fixture POP par bande selon les valeurs ci-dessus.")

setup_dmx_fixtures()
`
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f0' }}>
          TouchDesigner Setup
        </h1>
        <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Guide de configuration pour piloter vos barres LED depuis TouchDesigner
        </p>
      </div>

      {/* Section 1 */}
      <div style={card}>
        <div style={cardTitle}>1. Les opérateurs à utiliser</div>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          TouchDesigner utilise deux opérateurs connectés ensemble :
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 8, padding: '10px 14px', textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#4ade80' }}>DMX Fixture POP</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>1 par bande LED</div>
          </div>
          <div style={{ color: '#333', fontSize: 16 }}>→</div>
          <div style={{ background: '#1a1a2a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 14px', textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#818cf8' }}>DMX Out POP</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>1 seul pour tout</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#0f0f0f', borderRadius: 6 }}>
          💡 Connectez chaque <span style={mono}>DMX Fixture POP</span> à l'entrée du <span style={mono}>DMX Out POP</span> en tirant une ligne entre les deux dans le network TD.
        </div>
      </div>

      {/* Section 2 */}
      <div style={card}>
        <div style={cardTitle}>2. Comprendre l'adressage Art-Net</div>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          Art-Net utilise trois niveaux pour identifier un univers DMX :
        </p>
        <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 14, marginBottom: 12, fontFamily: 'monospace', fontSize: 12 }}>
          <div style={{ color: '#60a5fa', marginBottom: 8 }}>
            Univers absolu = (Net × 256) + (Subnet × 16) + Universe
          </div>
          <div style={{ color: '#555', fontSize: 11 }}>Exemples :</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 4, lineHeight: 1.8 }}>
            Net=0, Sub=0, U=0 → absolu = <span style={{ color: '#4ade80' }}>0</span><br/>
            Net=0, Sub=0, U=1 → absolu = <span style={{ color: '#4ade80' }}>1</span><br/>
            Net=0, Sub=1, U=0 → absolu = <span style={{ color: '#4ade80' }}>16</span><br/>
            Net=0, Sub=1, U=3 → absolu = <span style={{ color: '#4ade80' }}>19</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#1c1000', borderRadius: 6, border: '1px solid #713f12' }}>
          ⚠ Le numéro d'univers dans l'ESP32 doit correspondre à l'univers absolu calculé depuis Net/Subnet/Universe dans TouchDesigner.
        </div>
      </div>

      {/* Section 3 */}
      <div style={card}>
        <div style={cardTitle}>3. Configuration du DMX Fixture POP</div>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          Créez un <span style={mono}>DMX Fixture POP</span> par bande LED et configurez :
        </p>

        <div style={{ background: '#0f0f0f', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ background: '#1a1a2a', padding: '6px 12px', fontSize: 11, color: '#818cf8', fontWeight: 500 }}>
            Onglet Fixture
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={row}><span style={label}>Net / Subnet / Universe</span><span style={mono}>selon votre config ESP32</span></div>
            <div style={row}><span style={label}>Channel</span><span style={mono}>canal de départ (1 par défaut)</span></div>
            <div style={{ ...row, borderBottom: 'none' }}><span style={label}>Quantize Universe</span><span style={monoOrange}>By Components (défaut)</span></div>
          </div>
        </div>

        <div style={{ background: '#0f0f0f', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ background: '#1a2a1a', padding: '6px 12px', fontSize: 11, color: '#4ade80', fontWeight: 500 }}>
            Onglet DMX Profile
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={row}><span style={label}>Attribute</span><span style={monoGreen}>Color.rgb</span><span style={{ fontSize: 10, color: '#555' }}>3 canaux RGB uniquement (pas d'alpha)</span></div>
            <div style={row}><span style={label}>Value Type</span><span style={monoGreen}>Point</span></div>
            <div style={row}><span style={label}>Value Resolution</span><span style={monoGreen}>8-bit</span></div>
            <div style={{ ...row, borderBottom: 'none' }}><span style={label}>Value is Normalized</span><span style={monoGreen}>On</span></div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#0f0f0f', borderRadius: 6 }}>
          💡 <span style={monoGreen}>Color.rgb</span> exclut le canal Alpha — garantit exactement 3 canaux DMX par LED.
          Utilisez <span style={monoGreen}>Color.grb</span> si vos LEDs utilisent l'ordre GRB (WS2811 par exemple).
        </div>
      </div>

      {/* Section 4 */}
      <div style={card}>
        <div style={cardTitle}>4. Configuration du DMX Out POP</div>
        <div style={{ background: '#0f0f0f', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ background: '#1a1a2a', padding: '6px 12px', fontSize: 11, color: '#818cf8', fontWeight: 500 }}>
            Onglet DMX
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={row}><span style={label}>Active</span><span style={monoGreen}>On</span></div>
            <div style={row}><span style={label}>Interface</span><span style={monoOrange}>Art-Net</span></div>
            <div style={{ ...row, borderBottom: 'none' }}><span style={label}>Rate</span><span style={mono}>40 à 60</span><span style={{ fontSize: 10, color: '#555' }}>max 44Hz recommandé par le standard DMX</span></div>
          </div>
        </div>
        <div style={{ background: '#0f0f0f', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ background: '#1a1a2a', padding: '6px 12px', fontSize: 11, color: '#818cf8', fontWeight: 500 }}>
            Onglet Network
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={row}><span style={label}>Network Address</span><span style={mono}>255.255.255.255</span><span style={{ fontSize: 10, color: '#555' }}>broadcast — valeur par défaut</span></div>
            <div style={row}><span style={label}>Network Port</span><span style={mono}>6454</span><span style={{ fontSize: 10, color: '#555' }}>port Art-Net standard</span></div>
            <div style={{ ...row, borderBottom: 'none' }}><span style={label}>Send ArtSync</span><span style={mono}>On ou Off</span><span style={{ fontSize: 10, color: '#555' }}>utile avec beaucoup d'univers</span></div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#0f0f0f', borderRadius: 6 }}>
          💡 Le broadcast <span style={mono}>255.255.255.255</span> est la valeur par défaut — tous les ESP32 reçoivent et filtrent leur propre univers.
        </div>
      </div>

      {/* Section 5 — Config par bande */}
      <div style={card}>
        <div style={cardTitle}>5. Configuration par bande — depuis vos barres détectées</div>

        {onlineBars.length === 0 ? (
          <div style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>
            Aucune barre en ligne — démarrez vos ESP32 pour voir la configuration ici
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
              Créez un <span style={mono}>DMX Fixture POP</span> par bande active.
              Voici la configuration exacte :
            </p>

            {onlineBars.map(bar => {
              const activeStrips = bar.strips?.filter(s => s.enabled) || []

              return (
                <div key={bar.ip} style={{
                  background: '#0f0f0f', borderRadius: 8,
                  border: '1px solid #2a2a2a', overflow: 'hidden', marginBottom: 10,
                }}>
                  {/* Header ESP32 */}
                  <div style={{
                    background: '#1a1a1a', padding: '8px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0' }}>
                        {bar.name || bar.ip}
                      </span>
                      <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>
                        {bar.ip} · {activeStrips.length} bande{activeStrips.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={tag('#4ade80')}>En ligne</span>
                  </div>

                  {activeStrips.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 11, color: '#555' }}>
                      Aucune bande active
                    </div>
                  ) : (
                    activeStrips.map((strip, si) => {
                      const u1 = fromAbsolute(strip.dmxUniverse || 0)
                      const u2 = strip.universe2 > 0 ? fromAbsolute(strip.universe2) : null
                      const modeLabel  = ['Full Pixel (RGB)', 'Grouped', 'Full Bar'][strip.dmxMode] || '—'
                      const univMode   = ['Manuel', 'Continuation (QLC+)', 'Pixel aligné (Resolume)'][strip.universeMode] || '—'

                      return (
                        <div key={si} style={{
                          padding: '10px 12px',
                          borderTop: si > 0 ? '1px solid #1a1a1a' : 'none',
                        }}>
                          {/* Header bande */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>
                              {strip.name}
                            </span>
                            <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
                              GPIO {strip.pin} · {strip.ledCount} LEDs · {modeLabel}
                            </span>
                            <span style={{ fontSize: 10, color: '#2563eb', marginLeft: 'auto' }}>
                              DMX Fixture POP #{si + 1}
                            </span>
                          </div>

                          <div style={{ paddingLeft: 14 }}>
                            <p style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Onglet Fixture</p>
                            <div style={row}><span style={label}>Net</span><span style={mono}>{u1.net}</span></div>
                            <div style={row}><span style={label}>Subnet</span><span style={mono}>{u1.subnet}</span></div>
                            <div style={row}><span style={label}>Universe</span><span style={mono}>{u1.universe}</span></div>
                            <div style={row}><span style={label}>Channel</span><span style={mono}>{strip.dmxStartChannel || 1}</span></div>
                            <div style={row}><span style={label}>Univers absolu ESP32</span><span style={{ ...mono, color: '#fb923c' }}>{strip.dmxUniverse}</span></div>

                            <p style={{ fontSize: 10, color: '#555', margin: '8px 0 6px' }}>Onglet DMX Profile</p>
                            <div style={row}><span style={label}>Attribute</span><span style={monoGreen}>Color.rgb</span></div>
                            <div style={row}><span style={label}>Value Type</span><span style={monoGreen}>Point</span></div>
                            <div style={{ ...row, borderBottom: u2 ? undefined : 'none' }}>
                              <span style={label}>Quantize Universe</span>
                              <span style={monoOrange}>By Components (défaut)</span>
                            </div>

                            {u2 && (
                              <>
                                <p style={{ fontSize: 10, color: '#4ade80', margin: '8px 0 6px' }}>
                                  2ème univers — mode : {univMode}
                                </p>
                                <div style={row}><span style={label}>Net U2</span><span style={monoGreen}>{u2.net}</span></div>
                                <div style={row}><span style={label}>Subnet U2</span><span style={monoGreen}>{u2.subnet}</span></div>
                                <div style={row}><span style={label}>Universe U2</span><span style={monoGreen}>{u2.universe}</span></div>
                                <div style={{ ...row, borderBottom: 'none' }}>
                                  <span style={label}>Canal départ U2</span>
                                  <span style={monoGreen}>{strip.universe2StartCh || 1}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Section 6 — Outils */}
      <div style={card}>
        <div style={cardTitle}>6. Outils — génération automatique</div>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
          Génère automatiquement les fichiers de configuration depuis vos barres détectées.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Routing Table */}
          <div style={{ background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>Routing Table — DMX Out POP</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Table DAT à utiliser dans le paramètre Routing Table</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => copyToClipboard(generateRoutingTable(), 'routing')} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #333', background: '#1a1a1a', color: copied === 'routing' ? '#4ade80' : '#aaa', fontSize: 11, cursor: 'pointer' }}>
                  {copied === 'routing' ? '✓ Copié' : 'Copier'}
                </button>
                <button onClick={() => downloadFile(generateRoutingTable(), 'routing_table.txt')} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #333', background: '#1a1a1a', color: '#aaa', fontSize: 11, cursor: 'pointer' }}>
                  ↓ Télécharger
                </button>
              </div>
            </div>
            <pre style={{ margin: 0, padding: '10px 12px', background: '#0a0a0a', color: '#60a5fa', fontSize: 10, fontFamily: 'monospace', borderTop: '1px solid #1a1a1a', overflowX: 'auto' }}>
              {generateRoutingTable()}
            </pre>
          </div>

          {/* Script Python */}
          <div style={{ background: '#0f0f0f', borderRadius: 8, border: '1px solid #2a2a2a', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>Script Python — Configuration automatique</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Coller dans un Text DAT et exécuter dans TouchDesigner</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => copyToClipboard(generatePythonScript(), 'python')} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #333', background: '#1a1a1a', color: copied === 'python' ? '#4ade80' : '#aaa', fontSize: 11, cursor: 'pointer' }}>
                  {copied === 'python' ? '✓ Copié' : 'Copier'}
                </button>
                <button onClick={() => downloadFile(generatePythonScript(), 'led_setup.py')} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #333', background: '#1a1a1a', color: '#aaa', fontSize: 11, cursor: 'pointer' }}>
                  ↓ Télécharger .py
                </button>
              </div>
            </div>
            <pre style={{ margin: 0, padding: '10px 12px', background: '#0a0a0a', color: '#888', fontSize: 10, fontFamily: 'monospace', borderTop: '1px solid #1a1a1a', overflowX: 'auto', maxHeight: 200, overflow: 'auto' }}>
              {generatePythonScript()}
            </pre>
          </div>
        </div>
      </div>

      {/* Section 7 — Note .tox */}
      <div style={{ ...card, background: '#0f1a0f', border: '1px solid #1a3a1a' }}>
        <div style={{ ...cardTitle, color: '#4ade80' }}>Note sur la génération de fichier .tox</div>
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
          Le format <span style={monoGreen}>.tox</span> est un format binaire propriétaire de TouchDesigner — il n'est pas possible de le générer depuis une application externe.
          La méthode recommandée est de créer manuellement un composant dans TD et de le sauvegarder en <span style={monoGreen}>.tox</span> pour le réutiliser.
        </p>
      </div>

    </div>
  )
}