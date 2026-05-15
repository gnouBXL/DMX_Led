import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function BarConfig({ bar }) {
  const [form, setForm] = useState({
    deviceName:      bar.name || '',
    ledCount:        bar.ledCount || 100,
    dmxUniverse:     bar.dmxUniverse || 1,
    dmxStartChannel: bar.dmxStartChannel || 1,
    dmxMode:         bar.dmxMode || 0,
    dmxGroupSize:    bar.dmxGroupSize || 5,
    brightness:      bar.brightness || 255,
  })
  const [msg, setMsg] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const calcChannels = () => {
    if (form.dmxMode === 0) return form.ledCount * 3
    if (form.dmxMode === 1) return Math.ceil(form.ledCount / form.dmxGroupSize) * 3
    return 3
  }

  const save = async () => {
    try {
      await fetch(`${API}/api/bars/${bar.ip}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setMsg({ ok: true, text: 'Enregistré ✓' })
    } catch {
      setMsg({ ok: false, text: 'Erreur de connexion' })
    }
    setTimeout(() => setMsg(null), 3000)
  }

  const test = async (mode, r = 255, g = 0, b = 0) => {
    await fetch(`${API}/api/bars/${bar.ip}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, r, g, b }),
    }).catch(() => {})
  }

  const reboot = async () => {
    if (!confirm('Redémarrer cette barre ?')) return
    await fetch(`${API}/api/bars/${bar.ip}/reboot`, { method: 'POST' }).catch(() => {})
  }

  const ch = calcChannels()
  const lastCh = form.dmxStartChannel + ch - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <Field label="Nom">
        <input value={form.deviceName} onChange={e => set('deviceName', e.target.value)} style={inp} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Univers DMX">
          <input type="number" value={form.dmxUniverse} onChange={e => set('dmxUniverse', +e.target.value)} style={inp} />
        </Field>
        <Field label="Canal départ">
          <input type="number" value={form.dmxStartChannel} onChange={e => set('dmxStartChannel', +e.target.value)} style={inp} />
        </Field>
        <Field label="Nombre LEDs">
          <input type="number" value={form.ledCount} onChange={e => set('ledCount', +e.target.value)} style={inp} />
        </Field>
        <Field label="Mode DMX">
          <select value={form.dmxMode} onChange={e => set('dmxMode', +e.target.value)} style={inp}>
            <option value={0}>Full Pixel</option>
            <option value={1}>Grouped</option>
            <option value={2}>Full Bar</option>
          </select>
        </Field>
        {form.dmxMode === 1 && (
          <Field label="LEDs/groupe">
            <input type="number" value={form.dmxGroupSize} onChange={e => set('dmxGroupSize', +e.target.value)} style={inp} />
          </Field>
        )}
        <Field label="Luminosité">
          <input type="number" min={0} max={255} value={form.brightness} onChange={e => set('brightness', +e.target.value)} style={inp} />
        </Field>
      </div>

      <div style={{ fontSize: 11, color: '#555', padding: '6px 8px', background: '#0f0f0f', borderRadius: 6 }}>
        → {ch} canaux · dernier canal : {lastCh}
      </div>

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

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>TEST</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => test('color', 255, 0, 0)} style={{ ...btn, background: '#7f1d1d', color: '#fca5a5' }}>Rouge</button>
          <button onClick={() => test('color', 0, 255, 0)} style={{ ...btn, background: '#14532d', color: '#86efac' }}>Vert</button>
          <button onClick={() => test('color', 0, 0, 255)} style={{ ...btn, background: '#1e3a5f', color: '#93c5fd' }}>Bleu</button>
          <button onClick={() => test('rainbow')} style={{ ...btn, background: '#1e1e1e', color: '#a0a0a0' }}>🌈 Rainbow</button>
          <button onClick={() => test('off')} style={{ ...btn, background: '#1e1e1e', color: '#555' }}>Éteindre</button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 12 }}>
        <button onClick={reboot} style={{ ...btn, background: '#1c1c1c', color: '#ef4444', border: '1px solid #7f1d1d' }}>
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