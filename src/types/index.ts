export interface PerlerColor {
  id: string;
  code: string;
  hex: string;
  name: string;
}

export interface ColorStats extends PerlerColor {
  count: number;
  percentage: number;
}

export interface ConversionOptions {
  algorithm: 'precise' | 'approximate';
  transparency: boolean;
  gridSize: number; // 52
}

export interface ProjectState {
  originalImage: string | null;
  grid: string[][]; // 2D array of hex colors
  colorStats: ColorStats[];
  isProcessing: boolean;
}
