import { create } from 'zustand'

export const useStore = create((set) => ({
  bars: [],
  selectedBar: null,

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

  selectBar: (ip) => set((state) => ({
    selectedBar: state.bars.find(b => b.ip === ip) || null
  })),

  clearSelection: () => set({ selectedBar: null }),
}))