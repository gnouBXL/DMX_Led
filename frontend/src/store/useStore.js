import { create } from 'zustand'

export const useStore = create((set, get) => ({
  bars:        [],
  selectedBar: null,
  selectedStrip: null,  // { barIp, stripIndex }
  universes:   {},

  setBars: (bars) => set({ bars }),

  updateBar: (bar) => set((state) => {
    const idx = state.bars.findIndex(b => b.ip === bar.ip)
    if (idx >= 0) {
      const bars = [...state.bars]
      bars[idx] = bar
      return { bars }
    }
    return { bars: [...state.bars, bar] }
  }),

  selectStrip: (barIp, stripIndex) => set((state) => ({
    selectedBar:   state.bars.find(b => b.ip === barIp) || null,
    selectedStrip: { barIp, stripIndex },
  })),

  clearSelection: () => set({
    selectedBar:   null,
    selectedStrip: null,
  }),

  setUniverse: (universe, data) => set((state) => ({
    universes: {
      ...state.universes,
      [universe]: new Uint8Array(data),
    }
  })),

  getBarColors: (bar) => {
    const state    = get()
    const ledCount = bar.ledCount || 100
    const colors   = new Array(ledCount).fill([0, 0, 0])

    if (!bar.dmxUniverse && bar.dmxUniverse !== 0) return colors

    const u1data = state.universes[bar.dmxUniverse]
    const u2data = bar.universe2 ? state.universes[bar.universe2] : null

    if (!u1data) return colors

    const startCh = (bar.dmxStartChannel || 1) - 1
    const mode    = bar.dmxMode || 0

    if (mode === 2) {
      const r = u1data[startCh]     || 0
      const g = u1data[startCh + 1] || 0
      const b = u1data[startCh + 2] || 0
      return new Array(ledCount).fill([r, g, b])
    }

    if (mode === 1) {
      const groupSize = bar.dmxGroupSize || 5
      for (let i = 0; i < ledCount; i++) {
        const group = Math.floor(i / groupSize)
        const ch    = startCh + group * 3
        colors[i]   = [u1data[ch] || 0, u1data[ch+1] || 0, u1data[ch+2] || 0]
      }
      return colors
    }

    const chInU1   = 512 - startCh
    const ledsInU1 = Math.floor(chInU1 / 3)

    for (let i = 0; i < Math.min(ledCount, ledsInU1); i++) {
      const ch  = startCh + i * 3
      colors[i] = [u1data[ch] || 0, u1data[ch+1] || 0, u1data[ch+2] || 0]
    }

    if (u2data && ledCount > ledsInU1) {
      const u2StartCh = (bar.universe2StartCh || 1) - 1
      for (let i = ledsInU1; i < ledCount; i++) {
        const ch  = u2StartCh + (i - ledsInU1) * 3
        colors[i] = [u2data[ch] || 0, u2data[ch+1] || 0, u2data[ch+2] || 0]
      }
    }

    return colors
  },
}))