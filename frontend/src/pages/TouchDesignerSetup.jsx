import { useState } from 'react'
import { useStore } from '../store/useStore'

// ── Conversion Art-Net ────────────────────────────────────────────────────────
function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return {
    net:      Math.floor(abs / 256),
    subnet:   Math.floor((abs % 256) / 16),
    universe: abs % 16,
  }
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── Styles communs ────────────────────────────────────────────────────────────
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
  marginRight: 6,
})
const mono = {
  fontFamily: 'monospace', fontSize: 11,
  background: '#0a0a0a', padding: '2px 6px',
  borderRadius: 4, color: '#60a5fa',
}
const monoGreen = { ...mono, color: '#4ade80' }
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
  const [generated, setGenerated] = useState(false)

  const onlineBars = bars.filter(b => b.online)

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // Génère la table de routage pour le DMX Out POP
  const generateRoutingTable = () => {
    const lines = ['net\tsubnet\tuniverse\tnetaddress']
    const seen  = new Set()

    onlineBars.forEach(bar => {
      // Univers 1
      if (bar.dmxUniverse !== undefined) {
        const u1 = fromAbsolute(bar.dmxUniverse)
        const key1 = `${u1.net}-${u1.subnet}-${u1.universe}`
        if (!seen.has(key1)) {
          seen.add(key1)
          lines.push(`${u1.net}\t${u1.subnet}\t${u1.universe}\t255.255.255.255`)
        }
      }
      // Univers 2
      if (bar.universe2 && bar.universe2 > 0) {
        const u2  = fromAbsolute(bar.universe2)
        const key2 = `${u2.net}-${u2.subnet}-${u2.universe}`
        if (!seen.has(key2)) {
          seen.add(key2)
          lines.push(`${u2.net}\t${u2.subnet}\t${u2.universe}\t255.255.255.255`)
        }
      }
    })

    return lines.join('\n')
  }

  // Génère le script Python pour configurer TD automatiquement
  const generatePythonScript = () => {
    const strips = []
    onlineBars.forEach(bar => {
      if (!bar.ledCount) return
      const u1 = fromAbsolute(bar.dmxUniverse || 0)
      strips.push({
        name:    bar.name || bar.ip,
        leds:    bar.ledCount,
        net:     u1.net,
        subnet:  u1.subnet,
        univ:    u1.universe,
        ch:      bar.dmxStartChannel || 1,
      })
    })

    return `# DMX LED Controller — TouchDesigner Setup Script
# Généré automatiquement depuis le dashboard
# Coller dans un Text DAT et exécuter via script

import td

def setup_dmx_fixtures():
    """Configure les DMX Fixture POPs pour chaque barre LED"""
    
    # Configuration des barres
    fixtures = [
${strips.map(s => `        {
            "name":    "${s.name}",
            "leds":    ${s.leds},
            "net":     ${s.net},
            "subnet":  ${s.subnet},
            "universe":${s.univ},
            "channel": ${s.ch},
        },`).join('\n')}
    ]
    
    print(f"Configuration de {len(fixtures)} barres LED...")
    
    for i, f in enumerate(fixtures):
        print(f"  Barre {i+1}: {f['name']} — "
              f"Net{f['net']}/Sub{f['subnet']}/U{f['universe']} "
              f"ch.{f['channel']} — {f['leds']} LEDs")
    
    print("\\nConfiguration terminée.")
    print("Créer manuellement les DMX Fixture POPs selon les valeurs ci-dessus.")
    print("Puis configurer le DMX Out POP avec Interface = Art-Net.")

setup_dmx_fixtures()
`
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f0' }}>
          TouchDesigner Setup
        </h1>
        <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Guide de configuration et outils pour piloter vos barres LED depuis TouchDesigner
        </p>
      </div>

      {/* ── Section 1 : Comprendre les POPs ── */}
      <div style={card}>
        <div style={cardTitle}>1. Les opérateurs à utiliser</div>

        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          TouchDesigner utilise deux opérateurs pour piloter des LEDs via Art-Net.
          Ils doivent être connectés ensemble dans cet ordre :
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{
            background: '#1a2a1a', border: '1px solid #2a4a2a',
            borderRadius: 8, padding: '10px 14px', textAlign: 'center', minWidth: 140,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#4ade80' }}>DMX Fixture POP</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Définit chaque barre LED comme une fixture</div>
          </div>
          <div style={{ color: '#333', fontSize: 18 }}>→</div>
          <div style={{
            background: '#1a1a2a', border: '1px solid #2a2a4a',
            borderRadius: 8, padding: '10px 14px', textAlign: 'center', minWidth: 140,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#818cf8' }}>DMX Out POP</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Envoie les données via Art-Net sur le réseau</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#0f0f0f', borderRadius: 6 }}>
          💡 Un seul <span style={mono}>DMX Out POP</span> peut gérer toutes vos barres. 
          Créez un <span style={mono}>DMX Fixture POP</span> par barre LED.
        </div>
      </div>

      {/* ── Section 2 : Adressage Art-Net ── */}
      <div style={card}>
        <div style={cardTitle}>2. Comprendre l'adressage Art-Net</div>

        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          Art-Net utilise trois niveaux pour identifier un univers DMX.
          Le numéro d'univers absolu utilisé par l'ESP32 se calcule ainsi :
        </p>

        <div style={{
          background: '#0a0a0a', borderRadius: 8, padding: 14,
          marginBottom: 12, fontFamily: 'monospace', fontSize: 12,
        }}>
          <div style={{ color: '#60a5fa', marginBottom: 8 }}>
            Univers absolu = (Net × 256) + (Subnet × 16) + Universe
          </div>
          <div style={{ color: '#555', fontSize: 11 }}>Exemples :</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
            Net=0, Sub=0, U=0 → absolu = <span style={{ color: '#4ade80' }}>0</span>
          </div>
          <div style={{ color: '#888', fontSize: 11 }}>
            Net=0, Sub=0, U=1 → absolu = <span style={{ color: '#4ade80' }}>1</span>
          </div>
          <div style={{ color: '#888', fontSize: 11 }}>
            Net=0, Sub=1, U=0 → absolu = <span style={{ color: '#4ade80' }}>16</span>
          </div>
          <div style={{ color: '#888', fontSize: 11 }}>
            Net=0, Sub=1, U=3 → absolu = <span style={{ color: '#4ade80' }}>19</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#1c1000', borderRadius: 6, border: '1px solid #713f12' }}>
          ⚠ Le numéro d'univers dans l'ESP32 doit correspondre à l'univers absolu calculé depuis Net/Subnet/Universe dans TouchDesigner.
          Si TD est configuré en Sub=1 U=0, l'ESP32 doit avoir l'univers absolu 16, pas 0.
        </div>
      </div>

      {/* ── Section 3 : Config DMX Fixture POP ── */}
      <div style={card}>
        <div style={cardTitle}>3. Configuration du DMX Fixture POP</div>

        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          Créez un <span style={mono}>DMX Fixture POP</span> par barre LED.
          Voici les paramètres à configurer dans chaque onglet :
        </p>

        {/* Onglet Setup */}
        <div style={{
          background: '#0f0f0f', borderRadius: 8,
          overflow: 'hidden', marginBottom: 10,
        }}>
          <div style={{
            background: '#1a1a2a', padding: '6px 12px',
            fontSize: 11, color: '#818cf8', fontWeight: 500,
          }}>
            Onglet Setup
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={row}>
              <span style={label}>Net</span>
              <span style={mono}>0 à 127</span>
              <span style={{ fontSize: 10, color: '#555' }}>Groupe de 256 univers</span>
            </div>
            <div style={row}>
              <span style={label}>Subnet</span>
              <span style={mono}>0 à 15</span>
              <span style={{ fontSize: 10, color: '#555' }}>Groupe de 16 univers</span>
            </div>
            <div style={row}>
              <span style={label}>Universe</span>
              <span style={mono}>0 à 15</span>
              <span style={{ fontSize: 10, color: '#555' }}>Univers dans le subnet</span>
            </div>
            <div style={row}>
              <span style={label}>Channel</span>
              <span style={mono}>1</span>
              <span style={{ fontSize: 10, color: '#555' }}>Canal de départ (même que dans l'ESP32)</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={label}>Quantize Universe</span>
              <span style={monoOrange}>By Components</span>
              <span style={{ fontSize: 10, color: '#555' }}>Pixel aligné automatique</span>
            </div>
          </div>
        </div>

        {/* Onglet Channels */}
        <div style={{
          background: '#0f0f0f', borderRadius: 8,
          overflow: 'hidden', marginBottom: 10,
        }}>
          <div style={{
            background: '#1a2a1a', padding: '6px 12px',
            fontSize: 11, color: '#4ade80', fontWeight: 500,
          }}>
            Onglet Channels (profil DMX)
          </div>
          <div style={{ padding: '10px 12px' }}>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
              Définit le profil DMX de la fixture — pour des LEDs WS2812B RGB :
            </p>
            <div style={row}>
              <span style={label}>Attribute</span>
              <span style={monoGreen}>Cd</span>
              <span style={{ fontSize: 10, color: '#555' }}>Couleur diffuse (Color attribute)</span>
            </div>
            <div style={row}>
              <span style={label}>Components</span>
              <span style={monoGreen}>r g b</span>
              <span style={{ fontSize: 10, color: '#555' }}>3 composantes RGB</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={label}>Resolution</span>
              <span style={monoGreen}>8 bit</span>
              <span style={{ fontSize: 10, color: '#555' }}>Valeurs 0-255</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#0f0f0f', borderRadius: 6 }}>
          💡 Avec <span style={monoOrange}>Quantize Universe = By Components</span>, TouchDesigner 
          garantit que R, G, B d'un même pixel restent dans le même univers.
          Cela correspond au mode <strong style={{ color: '#e0e0e0' }}>Pixel aligné</strong> dans la config ESP32.
        </div>
      </div>

      {/* ── Section 4 : Config DMX Out POP ── */}
      <div style={card}>
        <div style={cardTitle}>4. Configuration du DMX Out POP</div>

        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          Un seul <span style={mono}>DMX Out POP</span> suffit pour toutes les barres.
          Connectez tous vos <span style={mono}>DMX Fixture POPs</span> à son entrée.
        </p>

        <div style={{
          background: '#0f0f0f', borderRadius: 8,
          overflow: 'hidden', marginBottom: 10,
        }}>
          <div style={{
            background: '#1a1a2a', padding: '6px 12px',
            fontSize: 11, color: '#818cf8', fontWeight: 500,
          }}>
            Paramètres principaux
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={row}>
              <span style={label}>Active</span>
              <span style={monoGreen}>On</span>
              <span style={{ fontSize: 10, color: '#555' }}>Active l'envoi</span>
            </div>
            <div style={row}>
              <span style={label}>Interface</span>
              <span style={monoOrange}>Art-Net</span>
              <span style={{ fontSize: 10, color: '#555' }}>Protocole réseau</span>
            </div>
            <div style={row}>
              <span style={label}>Rate</span>
              <span style={mono}>40</span>
              <span style={{ fontSize: 10, color: '#555' }}>FPS — max 44Hz recommandé</span>
            </div>
            <div style={row}>
              <span style={label}>Network Address</span>
              <span style={mono}>255.255.255.255</span>
              <span style={{ fontSize: 10, color: '#555' }}>Broadcast — atteint tous les ESP32</span>
            </div>
            <div style={row}>
              <span style={label}>Net</span>
              <span style={mono}>0</span>
              <span style={{ fontSize: 10, color: '#555' }}>Doit correspondre aux fixtures</span>
            </div>
            <div style={row}>
              <span style={label}>Subnet</span>
              <span style={mono}>0</span>
              <span style={{ fontSize: 10, color: '#555' }}>Doit correspondre aux fixtures</span>
            </div>
            <div style={row}>
              <span style={label}>Universe</span>
              <span style={mono}>0</span>
              <span style={{ fontSize: 10, color: '#555' }}>Univers de départ</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={label}>Send ArtSync</span>
              <span style={monoGreen}>On</span>
              <span style={{ fontSize: 10, color: '#555' }}>Synchronisation multi-univers</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#666', padding: '8px 10px', background: '#0f0f0f', borderRadius: 6 }}>
          💡 Le <span style={mono}>Network Address</span> à <span style={mono}>255.255.255.255</span> envoie 
          en broadcast — tous les ESP32 sur le réseau reçoivent les paquets et filtrent 
          leur propre univers. Pour de meilleures performances avec beaucoup de barres, 
          utiliser l'IP spécifique de chaque ESP32 dans la Routing Table.
        </div>
      </div>

      {/* ── Section 5 : Config par barre ── */}
      <div style={card}>
        <div style={cardTitle}>5. Configuration par barre — depuis vos barres détectées</div>

        {onlineBars.length === 0 ? (
          <div style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>
            Aucune barre en ligne — démarrez vos ESP32 pour voir la configuration ici
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
              Voici la configuration exacte à saisir dans chaque <span style={mono}>DMX Fixture POP</span> 
              pour vos {onlineBars.length} barre{onlineBars.length > 1 ? 's' : ''} détectée{onlineBars.length > 1 ? 's' : ''} :
            </p>

            {onlineBars.map(bar => {
              const u1 = fromAbsolute(bar.dmxUniverse || 0)
              const u2 = bar.universe2 ? fromAbsolute(bar.universe2) : null
              const modeLabel = ['Full Pixel (RGB)', 'Grouped', 'Full Bar'][bar.dmxMode] || '—'
              const univMode  = ['Manuel', 'Continuation (QLC+)', 'Pixel aligné (Resolume)'][bar.universeMode] || '—'

              return (
                <div key={bar.ip} style={{
                  background: '#0f0f0f', borderRadius: 8,
                  border: '1px solid #2a2a2a',
                  overflow: 'hidden', marginBottom: 10,
                }}>
                  {/* Header barre */}
                  <div style={{
                    background: '#1a1a1a', padding: '8px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0' }}>
                        {bar.name || bar.ip}
                      </span>
                      <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>
                        {bar.ip}
                      </span>
                    </div>
                    <span style={tag('#4ade80')}>En ligne</span>
                  </div>

                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
                      DMX Fixture POP — Onglet Setup
                    </p>

                    <div style={row}>
                      <span style={label}>Net</span>
                      <span style={mono}>{u1.net}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Subnet</span>
                      <span style={mono}>{u1.subnet}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Universe</span>
                      <span style={mono}>{u1.universe}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Channel</span>
                      <span style={mono}>{bar.dmxStartChannel || 1}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Univers absolu ESP32</span>
                      <span style={{ ...mono, color: '#fb923c' }}>{bar.dmxUniverse}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Nombre de LEDs</span>
                      <span style={mono}>{bar.ledCount}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Mode DMX</span>
                      <span style={monoGreen}>{modeLabel}</span>
                    </div>
                    <div style={row}>
                      <span style={label}>Quantize Universe</span>
                      <span style={monoOrange}>By Components</span>
                    </div>

                    {/* Univers 2 */}
                    {u2 && bar.universe2 > 0 && (
                      <>
                        <div style={{
                          marginTop: 8, marginBottom: 4,
                          fontSize: 11, color: '#4ade80',
                        }}>
                          2ème univers (mode : {univMode})
                        </div>
                        <div style={row}>
                          <span style={label}>Net U2</span>
                          <span style={monoGreen}>{u2.net}</span>
                        </div>
                        <div style={row}>
                          <span style={label}>Subnet U2</span>
                          <span style={monoGreen}>{u2.subnet}</span>
                        </div>
                        <div style={row}>
                          <span style={label}>Universe U2</span>
                          <span style={monoGreen}>{u2.universe}</span>
                        </div>
                        <div style={row}>
                          <span style={label}>Canal départ U2</span>
                          <span style={monoGreen}>{bar.universe2StartCh || 1}</span>
                        </div>
                        <div style={{ ...row, borderBottom: 'none' }}>
                          <span style={label}>Univers absolu U2</span>
                          <span style={{ ...mono, color: '#fb923c' }}>{bar.universe2}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ── Section 6 : Outils ── */}
      <div style={card}>
        <div style={cardTitle}>6. Outils — génération automatique</div>

        <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
          Génère automatiquement les fichiers de configuration depuis vos barres détectées.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Table de routage */}
          <div style={{
            background: '#0f0f0f', borderRadius: 8,
            border: '1px solid #2a2a2a', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>
                  Routing Table — DMX Out POP
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  Table DAT à coller dans le paramètre Routing Table du DMX Out POP
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => copyToClipboard(generateRoutingTable(), 'routing')}
                  style={{
                    padding: '5px 10px', borderRadius: 5, border: '1px solid #333',
                    background: '#1a1a1a', color: copied === 'routing' ? '#4ade80' : '#aaa',
                    fontSize: 11, cursor: 'pointer',
                  }}>
                  {copied === 'routing' ? '✓ Copié' : 'Copier'}
                </button>
                <button
                  onClick={() => downloadFile(generateRoutingTable(), 'routing_table.txt')}
                  style={{
                    padding: '5px 10px', borderRadius: 5, border: '1px solid #333',
                    background: '#1a1a1a', color: '#aaa', fontSize: 11, cursor: 'pointer',
                  }}>
                  ↓ Télécharger
                </button>
              </div>
            </div>
            <pre style={{
              margin: 0, padding: '10px 12px',
              background: '#0a0a0a', color: '#60a5fa',
              fontSize: 10, fontFamily: 'monospace',
              borderTop: '1px solid #1a1a1a',
              overflowX: 'auto',
            }}>
              {generateRoutingTable()}
            </pre>
          </div>

          {/* Script Python */}
          <div style={{
            background: '#0f0f0f', borderRadius: 8,
            border: '1px solid #2a2a2a', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>
                  Script Python — Configuration automatique
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  Coller dans un Text DAT et exécuter dans TouchDesigner
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => copyToClipboard(generatePythonScript(), 'python')}
                  style={{
                    padding: '5px 10px', borderRadius: 5, border: '1px solid #333',
                    background: '#1a1a1a', color: copied === 'python' ? '#4ade80' : '#aaa',
                    fontSize: 11, cursor: 'pointer',
                  }}>
                  {copied === 'python' ? '✓ Copié' : 'Copier'}
                </button>
                <button
                  onClick={() => downloadFile(generatePythonScript(), 'led_setup.py')}
                  style={{
                    padding: '5px 10px', borderRadius: 5, border: '1px solid #333',
                    background: '#1a1a1a', color: '#aaa', fontSize: 11, cursor: 'pointer',
                  }}>
                  ↓ Télécharger .py
                </button>
              </div>
            </div>
            <pre style={{
              margin: 0, padding: '10px 12px',
              background: '#0a0a0a', color: '#888',
              fontSize: 10, fontFamily: 'monospace',
              borderTop: '1px solid #1a1a1a',
              overflowX: 'auto',
              maxHeight: 200,
              overflow: 'auto',
            }}>
              {generatePythonScript()}
            </pre>
          </div>

        </div>
      </div>

      {/* ── Section 7 : Note sur .tox ── */}
      <div style={{
        ...card,
        background: '#0f1a0f',
        border: '1px solid #1a3a1a',
      }}>
        <div style={{ ...cardTitle, color: '#4ade80' }}>Note sur la génération de fichier .tox</div>
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
          Le format <span style={monoGreen}>.tox</span> est un format binaire propriétaire de TouchDesigner — 
          il n'est pas possible de le générer directement depuis une application externe.
        </p>
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginTop: 8 }}>
          La méthode recommandée est d'utiliser le script Python ci-dessus, 
          ou de créer manuellement un composant dans TD et de le sauvegarder en <span style={monoGreen}>.tox</span> 
          pour le réutiliser dans d'autres projets.
        </p>
      </div>

    </div>
  )
}