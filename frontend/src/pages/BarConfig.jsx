import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── Conversion Art-Net ────────────────────────────────────────────────────────
function toAbsolute(net, subnet, universe) {
  return (parseInt(net) || 0) * 256 + (parseInt(subnet) || 0) * 16 + (parseInt(universe) || 0)
}

function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return {
    net:      Math.floor(abs / 256),
    subnet:   Math.floor((abs % 256) / 16),
    universe: abs % 16,
  }
}

// ── Composant champs Art-Net ──────────────────────────────────────────────────
function ArtNetFields({ prefix, value, onChange, label, color = '#60a5fa' }) {
  const parts = fromAbsolute(value)
  const abs   = toAbsolute(parts.net, parts.subnet, parts.universe)

  const update = (field, val) => {
    const next = { ...parts, [field]: parseInt(val) || 0 }
    onChange(toAbsolute(next.net, next.subnet, next.universe))
  }

  return (
    <div style={{
      background: '#0d1a2e', border: `1px solid #1e3a5f`,
      borderRadius: 6, padding: '8px 10px', marginBottom: 8,
    }}>
      <div style={{ fontSize: 10, color, marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        <Field label="Net (0-127)">
          <input type="number" min={0} max={127}
            defaultValue={parts.net}
            onChange={e => update('net', e.target.value)}
            style={inp} />
        </Field>
        <Field label="Subnet (0-15)">
          <input type="number" min={0} max={15}
            defaultValue={parts.subnet}
            onChange={e => update('subnet', e.target.value)}
            style={inp} />
        </Field>
        <Field label="Universe (0-15)">
          <input type="number" min={0} max={15}
            defaultValue={parts.universe}
            onChange={e => update('universe', e.target.value)}
            style={inp} />
        </Field>
        <Field label="Absolu">
          <div style={{
            ...inp, background: '#0a0a0a', color,
            fontFamily: 'monospace', display: 'flex',
            alignItems: 'center',
          }}>
            {abs}
          </div>
        </Field>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function BarConfig({ bar }) {
  const u1 = fromAbsolute(bar.dmxUniverse || 0)
  const u2 = fromAbsolute(bar.universe2   || 0)

  const [form, setForm] = useState({
    deviceName:        bar.name || '',
    ledCount:          bar.ledCount || 100,
    dmxUniverse:       bar.dmxUniverse || 0,
    dmxStartChannel:   bar.dmxStartChannel || 1,
    dmxMode:           bar.dmxMode || 0,
    dmxGroupSize:      bar.dmxGroupSize || 5,
    brightness:        bar.brightness || 255,
    universe2:         bar.universe2 || 0,
    universe2StartCh:  bar.universe2StartCh || 1,
    universe2LedStart: bar.universe2LedStart || 0,
    universeMode:      bar.universeMode || 0,
  })
  const [msg, setMsg] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Calculs
  const calcChannels = () => {
    if (form.dmxMode === 0) return form.ledCount * 3
    if (form.dmxMode === 1) return Math.ceil(form.ledCount / form.dmxGroupSize) * 3
    return 3
  }

  const chInU1    = 512 - form.dmxStartChannel + 1
  const totalCh   = calcChannels()
  const lastU1    = form.dmxStartChannel + Math.min(totalCh, chInU1) - 1
  const needsU2   = totalCh > chInU1
  const u2Active  = form.universe2 > 0

  const u2Parts   = fromAbsolute(form.universe2)
  let ledStartU2  = 0
  let skip        = 0
  if (form.universeMode === 0) ledStartU2 = form.universe2LedStart
  else if (form.universeMode === 1) ledStartU2 = Math.floor(chInU1 / 3)
  else {
    ledStartU2 = Math.floor(chInU1 / 3)
    const rem  = chInU1 % 3
    skip       = rem === 0 ? 0 : 3 - rem
  }
  const ledsU2  = form.ledCount - ledStartU2
  const lastU2  = form.universe2StartCh + ledsU2 * 3 - 1

  const save = async () => {
    try {
      await fetch(`${API}/api/bars/${bar.ip}/config`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      setMsg({ ok: true, text: 'Enregistré ✓' })
    } catch {
      setMsg({ ok: false, text: 'Erreur de connexion' })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  const test = async (mode, r=255, g=0, b=0) => {
    await fetch(`${API}/api/bars/${bar.ip}/test`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode, r, g, b }),
    }).catch(() => {})
  }

  const reboot = async () => {
    if (!confirm('Redémarrer cette barre ?')) return
    await fetch(`${API}/api/bars/${bar.ip}/reboot`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Nom */}
      <Field label="Nom">
        <input value={form.deviceName}
          onChange={e => set('deviceName', e.target.value)} style={inp} />
      </Field>

      {/* LEDs + Mode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Nombre de LEDs">
          <input type="number" value={form.ledCount}
            onChange={e => set('ledCount', +e.target.value)} style={inp} />
        </Field>
        <Field label="Mode DMX">
          <select value={form.dmxMode}
            onChange={e => set('dmxMode', +e.target.value)} style={inp}>
            <option value={0}>Full Pixel</option>
            <option value={1}>Grouped</option>
            <option value={2}>Full Bar</option>
          </select>
        </Field>
        {form.dmxMode === 1 && (
          <Field label="LEDs par groupe">
            <input type="number" value={form.dmxGroupSize}
              onChange={e => set('dmxGroupSize', +e.target.value)} style={inp} />
          </Field>
        )}
        <Field label="Luminosité (0-255)">
          <input type="number" min={0} max={255} value={form.brightness}
            onChange={e => set('brightness', +e.target.value)} style={inp} />
        </Field>
      </div>

      {/* Art-Net U1 */}
      <ArtNetFields
        label="Art-Net — Univers principal"
        value={form.dmxUniverse}
        onChange={v => set('dmxUniverse', v)}
      />

      {/* Canal de départ */}
      <Field label="Canal de départ (1-512)">
        <input type="number" min={1} max={512} value={form.dmxStartChannel}
          onChange={e => set('dmxStartChannel', +e.target.value)} style={inp} />
      </Field>

      {/* Résumé patch U1 */}
      <div style={{
        background: '#0f1a2e', border: '1px solid #1e3a5f',
        borderRadius: 6, padding: '8px 10px', fontSize: 11,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ color: '#555' }}>Premier canal</span>
          <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
            abs:{fromAbsolute(form.dmxUniverse) && form.dmxUniverse} · ch.{form.dmxStartChannel}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ color: '#555' }}>Dernier canal U1</span>
          <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
            abs:{form.dmxUniverse} · ch.{Math.min(lastU1, 512)}
          </span>
        </div>
        {u2Active && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#555' }}>Dernier canal U2</span>
            <span style={{ color: '#86efac', fontFamily: 'monospace' }}>
              abs:{form.universe2} · ch.{lastU2}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ color: '#555' }}>Canaux totaux</span>
          <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{totalCh}</span>
        </div>
      </div>

      {needsU2 && !u2Active && (
        <div style={{
          fontSize: 11, padding: '6px 10px', borderRadius: 6,
          background: '#1c1600', color: '#ca8a04',
          border: '1px solid #713f12',
        }}>
          ⚠ {totalCh} canaux dépassent 512 — configurer le 2ème univers
        </div>
      )}

      {/* Multi-univers */}
      <div style={{
        borderTop: '1px solid #2a2a2a',
        paddingTop: 10, marginTop: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          marginBottom: 8, gap: 8,
        }}>
          <span style={{
            fontSize: 11, fontWeight: 500, color: '#666',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            2ème univers
          </span>
        </div>

        <Field label="Mode univers">
          <select value={form.universeMode}
            onChange={e => set('universeMode', +e.target.value)} style={inp}>
            <option value={0}>Manuel (TouchDesigner)</option>
            <option value={1}>Continuation (QLC+)</option>
            <option value={2}>Pixel aligné (Resolume)</option>
          </select>
        </Field>

        {/* Art-Net U2 */}
        <div style={{ marginTop: 8 }}>
          <ArtNetFields
            label="Art-Net — 2ème univers (0/0/0 = désactivé)"
            value={form.universe2}
            onChange={v => set('universe2', v)}
            color="#4ade80"
          />
        </div>

        {u2Active && (
          <>
            <Field label="Canal de départ U2 (1-512)">
              <input type="number" min={1} max={512}
                value={form.universe2StartCh}
                onChange={e => set('universe2StartCh', +e.target.value)}
                style={inp} />
            </Field>

            {form.universeMode === 0 && (
              <Field label="LED de départ dans U2 (manuel)">
                <input type="number" min={1} max={300}
                  value={form.universe2LedStart}
                  onChange={e => set('universe2LedStart', +e.target.value)}
                  style={inp} />
              </Field>
            )}

            <div style={{
              fontSize: 10, color: '#4ade80', padding: '5px 8px',
              background: '#0d1a0d', borderRadius: 5,
              border: '1px solid #1a3a1a', marginTop: 6,
              fontFamily: 'monospace',
            }}>
              abs:{form.universe2} · ch.{form.universe2StartCh}→{lastU2}
              {' · '}{ledsU2} LEDs
              {skip > 0 && ` · skip ${skip} canal${skip > 1 ? 'aux' : ''} fin U1`}
            </div>
          </>
        )}
      </div>

      {/* Message */}
      {msg && (
        <div style={{
          fontSize: 12, padding: '6px 10px', borderRadius: 6,
          background: msg.ok ? '#14532d' : '#7f1d1d',
          color: msg.ok ? '#86efac' : '#fca5a5',
        }}>
          {msg.text}
        </div>
      )}

      <button onClick={save} style={{ ...btn, background: '#2563eb', color: '#fff' }}>
        Enregistrer
      </button>

      {/* Tests */}
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>TEST</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => test('color', 255, 0, 0)}
            style={{ ...btn, background: '#7f1d1d', color: '#fca5a5' }}>Rouge</button>
          <button onClick={() => test('color', 0, 255, 0)}
            style={{ ...btn, background: '#14532d', color: '#86efac' }}>Vert</button>
          <button onClick={() => test('color', 0, 0, 255)}
            style={{ ...btn, background: '#1e3a5f', color: '#93c5fd' }}>Bleu</button>
          <button onClick={() => test('rainbow')}
            style={{ ...btn, background: '#1e1e1e', color: '#a0a0a0' }}>🌈 Rainbow</button>
          <button onClick={() => test('off')}
            style={{ ...btn, background: '#1e1e1e', color: '#555' }}>Éteindre</button>
        </div>
      </div>

      {/* Reboot */}
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
        <button onClick={reboot}
          style={{ ...btn, background: '#1c1c1c', color: '#ef4444', border: '1px solid #7f1d1d' }}>
          Redémarrer
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

const inp = {
  width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a',
  borderRadius: 6, color: '#e0e0e0', padding: '7px 10px', fontSize: 12,
}

const btn = {
  padding: '7px 12px', borderRadius: 6, border: 'none',
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
}