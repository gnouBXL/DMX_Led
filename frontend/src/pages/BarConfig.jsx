import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fromAbsolute(abs) {
  abs = parseInt(abs) || 0
  return { net: Math.floor(abs / 256), subnet: Math.floor((abs % 256) / 16), universe: abs % 16 }
}

function toAbsolute(net, subnet, universe) {
  return (parseInt(net) || 0) * 256 + (parseInt(subnet) || 0) * 16 + (parseInt(universe) || 0)
}

function ArtNetFields({ value, onChange, label, color = '#60a5fa' }) {
  const parts = fromAbsolute(value)
  const update = (field, val) => {
    const next = { ...parts, [field]: parseInt(val) || 0 }
    onChange(toAbsolute(next.net, next.subnet, next.universe))
  }
  return (
    <div style={{ background: '#0d1a2e', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
      <div style={{ fontSize: 10, color, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
        <Field label="Net (0-127)">
          <input type="number" min={0} max={127} defaultValue={parts.net}
            onChange={e => update('net', e.target.value)} style={inp} />
        </Field>
        <Field label="Subnet (0-15)">
          <input type="number" min={0} max={15} defaultValue={parts.subnet}
            onChange={e => update('subnet', e.target.value)} style={inp} />
        </Field>
        <Field label="Universe (0-15)">
          <input type="number" min={0} max={15} defaultValue={parts.universe}
            onChange={e => update('universe', e.target.value)} style={inp} />
        </Field>
        <Field label="Absolu">
          <div style={{ ...inp, background: '#0a0a0a', color, fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
            {toAbsolute(parts.net, parts.subnet, parts.universe)}
          </div>
        </Field>
      </div>
    </div>
  )
}

export default function BarConfig({ bar, stripIndex }) {
  const strip = bar.strips?.[stripIndex] || {
    enabled: false, pin: [4,5,6,7][stripIndex] || 4,
    name: `bande-${stripIndex+1}`, ledCount: 100,
    dmxUniverse: 0, dmxStartChannel: 1, dmxMode: 0, dmxGroupSize: 5,
    universe2: 0, universe2StartCh: 1, universe2LedStart: 0, universeMode: 0,
  }

  const [form, setForm] = useState({
    enabled:           strip.enabled || false,
    pin:               strip.pin || [4,5,6,7][stripIndex],
    name:              strip.name || `bande-${stripIndex+1}`,
    ledCount:          strip.ledCount || 100,
    dmxUniverse:       strip.dmxUniverse || 0,
    dmxStartChannel:   strip.dmxStartChannel || 1,
    dmxMode:           strip.dmxMode || 0,
    dmxGroupSize:      strip.dmxGroupSize || 5,
    brightness:        bar.brightness || 255,
    universe2:         strip.universe2 || 0,
    universe2StartCh:  strip.universe2StartCh || 1,
    universe2LedStart: strip.universe2LedStart || 0,
    universeMode:      strip.universeMode || 0,
  })
  const [msg, setMsg] = useState(null)
  const [rebootOffer, setRebootOffer] = useState(false)
  const rebootSessionRef = useRef(0)

  const PINS = [4, 5, 6, 7]

  // Reset formulaire + invalide le polling reboot si barre / bande change
  useEffect(() => {
    const s = bar.strips?.[stripIndex] || {}
    setForm({
      enabled:           s.enabled || false,
      pin:               s.pin || [4,5,6,7][stripIndex],
      name:              s.name || `bande-${stripIndex+1}`,
      ledCount:          s.ledCount || 100,
      dmxUniverse:       s.dmxUniverse || 0,
      dmxStartChannel:   s.dmxStartChannel || 1,
      dmxMode:           s.dmxMode || 0,
      dmxGroupSize:      s.dmxGroupSize || 5,
      brightness:        bar.brightness || 255,
      universe2:         s.universe2 || 0,
      universe2StartCh:  s.universe2StartCh || 1,
      universe2LedStart: s.universe2LedStart || 0,
      universeMode:      s.universeMode || 0,
    })
    return () => {
      rebootSessionRef.current++
    }
  }, [bar.ip, stripIndex])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const chInU1  = 512 - form.dmxStartChannel + 1
  const totalCh = form.dmxMode === 0 ? form.ledCount * 3
                : form.dmxMode === 1 ? Math.ceil(form.ledCount / form.dmxGroupSize) * 3
                : 3
  const lastU1  = form.dmxStartChannel + Math.min(totalCh, chInU1) - 1
  const needsU2 = totalCh > chInU1
  const u2Active = form.universe2 > 0

  const configNeedsReboot = (allStrips) => {
    const prev = bar.strips || []
    const newCount = allStrips.filter(s => s.enabled).length
    const oldCount = bar.stripCount ?? prev.filter(s => s.enabled).length
    if (newCount !== oldCount) return true
    for (let i = 0; i < 4; i++) {
      const n = allStrips[i]
      const o = prev[i] || {}
      if (!!n.enabled !== !!o.enabled) return true
      if ((n.pin ?? PINS[i]) !== (o.pin ?? PINS[i])) return true
      if ((n.ledCount ?? 100) !== (o.ledCount ?? 100)) return true
    }
    return false
  }

  const save = async () => {
    setRebootOffer(false)
    try {
      const allStrips = Array.from({ length: 4 }, (_, i) => {
        if (i === stripIndex) return { index: i, ...form }
        const s = bar.strips?.[i] || {}
        return { index: i, ...s }
      })

      await fetch(`${API}/api/bars/${bar.ip}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: bar.name,
          brightness: form.brightness,
          stripCount: allStrips.filter(s => s.enabled).length,
          strips: allStrips,
        }),
      })
      if (configNeedsReboot(allStrips)) {
        setMsg({ ok: true, text: 'Configuration enregistrée' })
        setRebootOffer(true)
      } else {
        setMsg({ ok: true, text: 'Enregistré — paramètres DMX actifs' })
        setTimeout(() => setMsg(null), 5000)
      }
    } catch {
      setMsg({ ok: false, text: 'Erreur de connexion' })
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const test = async (mode, r = 255, g = 0, b = 0) => {
    await fetch(`${API}/api/bars/${bar.ip}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strip: stripIndex, mode, r, g, b }),
    }).catch(() => {})
  }

  /** Clic explicite (onClick) — évite la propagation vers la carte / autres handlers */
  const handleTestClick = (e, fn) => {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }

  const waitForEspAfterReboot = async () => {
    const sid = rebootSessionRef.current
    try {
      await fetch(`${API}/api/bars/${bar.ip}/reboot`, { method: 'POST' })
    } catch {
      /* la connexion peut couper avant la réponse HTTP */
    }
    await sleep(8000)
    if (rebootSessionRef.current !== sid) return
    const statusUrl = `http://${bar.ip}/api/status`
    const maxTries = 120
    for (let i = 0; i < maxTries; i++) {
      if (rebootSessionRef.current !== sid) return
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 2000)
        const r = await fetch(statusUrl, { method: 'GET', signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) {
          setMsg({ ok: true, text: 'ESP32 reconnecté ✓' })
          setTimeout(() => setMsg(null), 5000)
          return
        }
      } catch {
        /* encore hors ligne */
      }
      await sleep(1000)
    }
    if (rebootSessionRef.current !== sid) return
    setMsg({ ok: false, text: 'Reconnexion impossible (timeout)' })
    setTimeout(() => setMsg(null), 8000)
  }

  const doReboot = async () => {
    setRebootOffer(false)
    setMsg({ ok: true, text: 'Redémarrage en cours…' })
    await waitForEspAfterReboot()
  }

  const reboot = async () => {
    if (!confirm('Redémarrer cette barre ?')) return
    setMsg({ ok: true, text: 'Redémarrage en cours…' })
    await waitForEspAfterReboot()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

{/* Header bande */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div
          onClick={() => set('enabled', !form.enabled)}
          style={{
            position: 'relative', width: 32, height: 18, flexShrink: 0,
            background: form.enabled ? '#2563eb' : '#333',
            borderRadius: 9, cursor: 'pointer', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', width: 14, height: 14,
            left: form.enabled ? 16 : 2, top: 2,
            background: '#fff', borderRadius: '50%', transition: 'left 0.2s',
          }} />
        </div>
        <span style={{ fontSize: 12, color: form.enabled ? '#e0e0e0' : '#555' }}>
          {form.enabled ? 'Active' : 'Inactive'}
        </span>
        <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>
          Bande {stripIndex + 1} — {bar.name}
        </span>
      </div>

      {/* Nom + GPIO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Nom">
          <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
        </Field>
        <Field label="GPIO">
          <select value={form.pin} onChange={e => set('pin', +e.target.value)} style={inp}>
            {PINS.map(p => (
              <option key={p} value={p}>GPIO {p} — Bande {PINS.indexOf(p)+1}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* LEDs + Mode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Nombre de LEDs">
          <input type="number" value={form.ledCount}
            onChange={e => set('ledCount', +e.target.value)} style={inp} />
        </Field>
        <Field label="Mode DMX">
          <select value={form.dmxMode} onChange={e => set('dmxMode', +e.target.value)} style={inp}>
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

      <Field label="Canal de départ (1-512)">
        <input type="number" min={1} max={512} value={form.dmxStartChannel}
          onChange={e => set('dmxStartChannel', +e.target.value)} style={inp} />
      </Field>

      {/* Résumé patch */}
      <div style={{ background: '#0f1a2e', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', fontSize: 11 }}>
        <SummaryRow label="Premier canal" value={`abs:${form.dmxUniverse} · ch.${form.dmxStartChannel}`} />
        <SummaryRow label="Dernier canal U1" value={`abs:${form.dmxUniverse} · ch.${Math.min(lastU1, 512)}`} />
        <SummaryRow label="Canaux totaux" value={`${totalCh}`} />
      </div>

      {needsU2 && !u2Active && (
        <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: '#1c1600', color: '#ca8a04', border: '1px solid #713f12' }}>
          ⚠ {totalCh} canaux dépassent 512 — configurer le 2ème univers
        </div>
      )}

      {/* Multi-univers */}
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          2ème univers
        </div>
        <Field label="Mode univers">
          <select value={form.universeMode} onChange={e => set('universeMode', +e.target.value)} style={inp}>
            <option value={0}>Manuel (TouchDesigner)</option>
            <option value={1}>Continuation (QLC+)</option>
            <option value={2}>Pixel aligné (Resolume)</option>
          </select>
        </Field>
        <div style={{ marginTop: 8 }}>
          <ArtNetFields
            label="Art-Net — 2ème univers (0/0/0 = désactivé)"
            value={form.universe2}
            onChange={v => set('universe2', v)}
            color="#4ade80"
          />
        </div>
        {u2Active && (
          <Field label="Canal de départ U2">
            <input type="number" min={1} max={512} value={form.universe2StartCh}
              onChange={e => set('universe2StartCh', +e.target.value)} style={inp} />
          </Field>
        )}
        {u2Active && form.universeMode === 0 && (
          <Field label="LED de départ dans U2">
            <input type="number" min={1} max={300} value={form.universe2LedStart}
              onChange={e => set('universe2LedStart', +e.target.value)} style={inp} />
          </Field>
        )}
      </div>

      {msg && (
        <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, background: msg.ok ? '#14532d' : '#7f1d1d', color: msg.ok ? '#86efac' : '#fca5a5' }}>
          {msg.text}
        </div>
      )}

      {rebootOffer && (
        <div style={{ fontSize: 12, padding: '10px 12px', borderRadius: 6, background: '#1c1600', border: '1px solid #713f12', color: '#fde68a' }}>
          <div style={{ marginBottom: 8, lineHeight: 1.5 }}>
            GPIO, bandes actives ou nombre de LEDs modifiés — un redémarrage est
            nécessaire pour que FastLED applique les changements.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={doReboot} style={{ ...btn, background: '#2563eb', color: '#fff' }}>
              Redémarrer maintenant
            </button>
            <button type="button" onClick={() => setRebootOffer(false)} style={{ ...btn, background: '#1e1e1e', color: '#aaa' }}>
              Plus tard
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={save} style={{ ...btn, background: '#2563eb', color: '#fff' }}>
        Enregistrer
      </button>

      {/* Tests — type="button" + onClick uniquement (pas mouseup/mousedown) */}
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>TEST</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" onClick={(e) => handleTestClick(e, () => void test('color', 255, 0, 0))} style={{ ...btnTest, background: '#7f1d1d', color: '#fca5a5' }}>Rouge</button>
          <button type="button" onClick={(e) => handleTestClick(e, () => void test('color', 0, 255, 0))} style={{ ...btnTest, background: '#14532d', color: '#86efac' }}>Vert</button>
          <button type="button" onClick={(e) => handleTestClick(e, () => void test('color', 0, 0, 255))} style={{ ...btnTest, background: '#1e3a5f', color: '#93c5fd' }}>Bleu</button>
          <button type="button" onClick={(e) => handleTestClick(e, () => void test('rainbow'))} style={{ ...btnTest, background: '#1e1e1e', color: '#a0a0a0' }}>🌈 Rainbow</button>
          <button type="button" onClick={(e) => handleTestClick(e, () => void test('off'))} style={{ ...btnTest, background: '#1e1e1e', color: '#555' }}>Éteindre</button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
        <button type="button" onClick={reboot} style={{ ...btn, background: '#1c1c1c', color: '#ef4444', border: '1px solid #7f1d1d' }}>
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

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

const inp = {
  width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a',
  borderRadius: 6, color: '#e0e0e0', padding: '7px 10px', fontSize: 12,
}

const btn = {
  padding: '7px 12px', borderRadius: 6, border: 'none',
  fontSize: 12, fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation',
}

const btnTest = {
  ...btn,
  userSelect: 'none',
  WebkitUserSelect: 'none',
}