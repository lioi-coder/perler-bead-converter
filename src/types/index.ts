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
  maxColors: number; // 0 = unlimited
  enhance: boolean; // saturation+contrast boost before quantization
}

export interface ProjectState {
  originalImage: string | null;
  grid: string[][]; // 2D array of hex colors
  colorStats: ColorStats[];
  isProcessing: boolean;
}
