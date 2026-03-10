import { PERLER_COLORS } from '../constants/perler-colors';
import { PerlerColor, ColorStats } from '../types';
import { 
  applyCLAHE, 
  toGrayscale, 
  sobel, 
  dilate, 
  applyGamma, 
  reducePalette, 
  sharpenGrid,
  convertScaleAbs,
  sharpenImage,
  pixelateImage
} from './image-processing';

/**
 * Converts hex color string to RGB object
 */
export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Converts RGB to Lab color space
 */
export const rgbToLab = (r: number, g: number, b: number) => {
  // Normalize RGB values
  let nr = r / 255;
  let ng = g / 255;
  let nb = b / 255;

  // Gamma correction
  nr = nr > 0.04045 ? Math.pow((nr + 0.055) / 1.055, 2.4) : nr / 12.92;
  ng = ng > 0.04045 ? Math.pow((ng + 0.055) / 1.055, 2.4) : ng / 12.92;
  nb = nb > 0.04045 ? Math.pow((nb + 0.055) / 1.055, 2.4) : nb / 12.92;

  nr *= 100;
  ng *= 100;
  nb *= 100;

  // RGB to XYZ
  const x = nr * 0.4124 + ng * 0.3576 + nb * 0.1805;
  const y = nr * 0.2126 + ng * 0.7152 + nb * 0.0722;
  const z = nr * 0.0193 + ng * 0.1192 + nb * 0.9505;

  // XYZ to Lab
  let nx = x / 95.047;
  let ny = y / 100.0;
  let nz = z / 108.883;

  nx = nx > 0.008856 ? Math.pow(nx, 1 / 3) : (7.787 * nx) + (16 / 116);
  ny = ny > 0.008856 ? Math.pow(ny, 1 / 3) : (7.787 * ny) + (16 / 116);
  nz = nz > 0.008856 ? Math.pow(nz, 1 / 3) : (7.787 * nz) + (16 / 116);

  const L = (116 * ny) - 16;
  const a = 500 * (nx - ny);
  const l_b = 200 * (ny - nz);

  return { L, a, b: l_b };
};

/**
 * Calculates Delta E 2000 between two Lab colors
 * Implementation based on: http://www.brucelindbloom.com/index.html?Eqn_DeltaE_CIE2000.html
 */
export const calculateDeltaE2000 = (lab1: { L: number, a: number, b: number }, lab2: { L: number, a: number, b: number }) => {
  const L1 = lab1.L;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const L2 = lab2.L;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2;

  let h1p = Math.atan2(b1, a1p) * 180 / Math.PI;
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * 180 / Math.PI;
  if (h2p < 0) h2p += 360;

  let dHp = h2p - h1p;
  if (Math.abs(dHp) > 180) {
    if (h2p <= h1p) dHp += 360;
    else dHp -= 360;
  }

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHPp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dHp * Math.PI / 360);

  let avgHp = h1p + h2p;
  if (Math.abs(h1p - h2p) > 180) {
    if (h1p + h2p < 360) avgHp += 360;
    else avgHp -= 360;
  }
  avgHp /= 2;

  const T = 1 - 0.17 * Math.cos((avgHp - 30) * Math.PI / 180) +
    0.24 * Math.cos((2 * avgHp) * Math.PI / 180) +
    0.32 * Math.cos((3 * avgHp + 6) * Math.PI / 180) -
    0.20 * Math.cos((4 * avgHp - 63) * Math.PI / 180);

  const sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const sc = 1 + 0.045 * avgCp;
  const sh = 1 + 0.015 * avgCp * T;

  const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const rt = -rc * Math.sin(2 * dTheta * Math.PI / 180);

  const de00 = Math.sqrt(
    Math.pow(dLp / sl, 2) +
    Math.pow(dCp / sc, 2) +
    Math.pow(dHPp / sh, 2) +
    rt * (dCp / sc) * (dHPp / sh)
  );

  return de00;
};

// Cache Lab values for Perler colors
const PERLER_LAB_COLORS = PERLER_COLORS.map(color => {
  const rgb = hexToRgb(color.hex);
  return {
    ...color,
    lab: rgb ? rgbToLab(rgb.r, rgb.g, rgb.b) : { L: 0, a: 0, b: 0 }
  };
});

/**
 * Finds the closest Perler color for a given RGB color
 */
export const findClosestPerlerColor = (
  r: number, 
  g: number, 
  b: number, 
  algorithm: 'precise' | 'approximate' = 'precise'
): PerlerColor => {
  const targetLab = rgbToLab(r, g, b);
  let minDistance = Infinity;
  let closestColor = PERLER_COLORS[0];

  for (const color of PERLER_LAB_COLORS) {
    let distance: number;
    if (algorithm === 'precise') {
      distance = calculateDeltaE2000(targetLab, color.lab);
    } else {
      // Approximate using simple Lab distance (CIE76)
      distance = Math.sqrt(
        Math.pow(targetLab.L - color.lab.L, 2) +
        Math.pow(targetLab.a - color.lab.a, 2) +
        Math.pow(targetLab.b - color.lab.b, 2)
      );
    }

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
};

/**
 * Processes an image and converts it to a 52x52 grid of Perler colors
 */
export const processImage = async (
  imageSrc: string,
  gridSize: number = 52,
  options: { transparency: boolean, algorithm: 'precise' | 'approximate' } = { transparency: true, algorithm: 'precise' }
): Promise<{ grid: string[][], stats: ColorStats[] }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use a temporary canvas to get original image data
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) {
        reject(new Error('Could not get temp canvas context'));
        return;
      }

      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      tempCtx.drawImage(img, 0, 0);

      const originalImageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = originalImageData.data;

      // 1. Image Enhancement (Pre-processing)
      // First, pixelate the image to simplify details (Box Filter effect)
      // This helps in reducing noise and grouping similar colors
      const pixelSize = Math.max(1, Math.floor(Math.min(img.width, img.height) / 100));
      pixelateImage(data, img.width, img.height, pixelSize);
      
      // 3x3 Sharpening (Keep slight sharpening for definition)
      sharpenImage(data, img.width, img.height);

      // 2. CLAHE Contrast Enhancement
      applyCLAHE(data, img.width, img.height);

      // 3. Calculate Edge Map (Sobel)
      const gray = toGrayscale(data, img.width, img.height);
      const edges = sobel(gray, img.width, img.height);

      const grid: string[][] = [];
      const rawStatsMap: Map<string, number> = new Map();

      // Calculate the size of each block in the original image
      const blockWidth = img.width / gridSize;
      const blockHeight = img.height / gridSize;

      for (let y = 0; y < gridSize; y++) {
        const row: string[] = [];
        for (let x = 0; x < gridSize; x++) {
          const startX = Math.floor(x * blockWidth);
          const startY = Math.floor(y * blockHeight);
          const endX = Math.floor((x + 1) * blockWidth);
          const endY = Math.floor((y + 1) * blockHeight);

          let rSum = 0, gSum = 0, bSum = 0, aSum = 0, weightSum = 0;
          let pixelCount = 0;

          for (let py = startY; py < endY; py++) {
            for (let px = startX; px < endX; px++) {
              const i = (py * img.width + px) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              // 3. Edge-weighted average
              const edgeWeight = 1.0 + (edges[py * img.width + px] / 255.0) * 5.0;
              
              rSum += r * edgeWeight;
              gSum += g * edgeWeight;
              bSum += b * edgeWeight;
              aSum += a;
              weightSum += edgeWeight;
              pixelCount++;
            }
          }

          const rAvg = rSum / weightSum;
          const gAvg = gSum / weightSum;
          const bAvg = bSum / weightSum;
          const aAvg = aSum / pixelCount;

          let colorHex: string;

          if (options.transparency && aAvg < 128) {
            colorHex = 'transparent';
          } else {
            // 4. DeltaE2000 Quantization
            let closest = findClosestPerlerColor(
              Math.round(rAvg), 
              Math.round(gAvg), 
              Math.round(bAvg), 
              options.algorithm
            );

            // 5. Gamma correction (gamma=1.0) - No aggressive gamma
            // We apply it and find the closest Perler color again
            const rgb = hexToRgb(closest.hex);
            if (rgb) {
              const gammaCorrected = applyGamma(rgb.r, rgb.g, rgb.b, 1.0);
              closest = findClosestPerlerColor(
                Math.round(gammaCorrected.r), 
                Math.round(gammaCorrected.g), 
                Math.round(gammaCorrected.b), 
                options.algorithm
              );
            }

            colorHex = closest.hex;
            rawStatsMap.set(closest.id, (rawStatsMap.get(closest.id) || 0) + 1);
          }
          row.push(colorHex);
        }
        grid.push(row);
      }

      // 6. Limit final color count (16~24)
      const initialStats: any[] = Array.from(rawStatsMap.entries()).map(([id, count]) => {
        const color = PERLER_COLORS.find(c => c.id === id)!;
        return {
          ...color,
          count,
          percentage: (count / (gridSize * gridSize)) * 100
        };
      });

      let finalGrid = reducePalette(grid, initialStats, 24);

      // 7. Final sharpening processing
      finalGrid = sharpenGrid(finalGrid);

      // Re-calculate final stats after palette reduction
      const finalStatsMap: Map<string, number> = new Map();
      for (const row of finalGrid) {
        for (const cell of row) {
          if (cell !== 'transparent') {
            const color = PERLER_COLORS.find(c => c.hex === cell)!;
            finalStatsMap.set(color.id, (finalStatsMap.get(color.id) || 0) + 1);
          }
        }
      }

      const finalStats: ColorStats[] = Array.from(finalStatsMap.entries()).map(([id, count]) => {
        const color = PERLER_COLORS.find(c => c.id === id)!;
        return {
          ...color,
          count,
          percentage: (count / (gridSize * gridSize)) * 100
        };
      }).sort((a, b) => b.count - a.count);

      resolve({ grid: finalGrid, stats: finalStats });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};
