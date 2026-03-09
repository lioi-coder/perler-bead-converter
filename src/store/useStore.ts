import { create } from 'zustand';
import { ProjectState, ColorStats, ConversionOptions } from '../types';
import { processImage } from '../utils/color-matcher';
import { PERLER_COLORS } from '../constants/perler-colors';

interface AppStore extends ProjectState {
  options: ConversionOptions;
  setOriginalImage: (image: string | null) => void;
  setOptions: (options: Partial<ConversionOptions>) => void;
  updateCell: (x: number, y: number, colorHex: string) => void;
  startProcessing: () => Promise<void>;
  resetProject: () => void;
}

const initialState: ProjectState = {
  originalImage: null,
  grid: [],
  colorStats: [],
  isProcessing: false,
};

const initialOptions: ConversionOptions = {
  algorithm: 'precise',
  transparency: true,
  gridSize: 52,
};

export const useStore = create<AppStore>((set, get) => ({
  ...initialState,
  options: initialOptions,

  setOriginalImage: (image) => set({ originalImage: image }),

  setOptions: (newOptions) => set((state) => ({
    options: { ...state.options, ...newOptions }
  })),

  updateCell: (x, y, colorHex) => set((state) => {
    const newGrid = [...state.grid];
    newGrid[y] = [...newGrid[y]];
    newGrid[y][x] = colorHex;

    // Recalculate stats
    const statsMap: Map<string, number> = new Map();
    let totalBeads = 0;
    
    newGrid.forEach(row => {
      row.forEach(cell => {
        if (cell !== 'transparent') {
          const color = PERLER_COLORS.find(c => c.hex === cell);
          if (color) {
            statsMap.set(color.id, (statsMap.get(color.id) || 0) + 1);
            totalBeads++;
          }
        }
      });
    });

    const newStats: ColorStats[] = PERLER_COLORS
      .filter(c => statsMap.has(c.id))
      .map(c => ({
        ...c,
        count: statsMap.get(c.id) || 0,
        percentage: totalBeads > 0 ? ((statsMap.get(c.id) || 0) / totalBeads) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    return { grid: newGrid, colorStats: newStats };
  }),

  startProcessing: async () => {
    const { originalImage, options } = get();
    if (!originalImage) return;

    set({ isProcessing: true });
    try {
      const { grid, stats } = await processImage(originalImage, options.gridSize, {
        transparency: options.transparency,
        algorithm: options.algorithm
      });
      set({ grid, colorStats: stats, isProcessing: false });
    } catch (error) {
      console.error('Processing failed:', error);
      set({ isProcessing: false });
    }
  },

  resetProject: () => set({ ...initialState, options: initialOptions }),
}));
