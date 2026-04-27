import { PERLER_COLORS } from '../constants/perler-colors';
import { PerlerColor, ColorStats } from '../types';

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
 * Reduce the grid to at most maxColors distinct Perler colors.
 * Strategy: keep the maxColors most-used colors, remap any other cell
 * to the nearest kept color in CIE Lab (Delta E 2000) space.
 */
const limitPalette = (
  grid: string[][],
  maxColors: number,
  algorithm: 'precise' | 'approximate'
): string[][] => {
  // Count usage per hex
  const counts = new Map<string, number>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell === 'transparent') continue;
      counts.set(cell, (counts.get(cell) || 0) + 1);
    }
  }
  if (counts.size <= maxColors) return grid;

  const kept = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([hex]) => hex);
  const keptSet = new Set(kept);

  // Pre-compute Lab for kept colors
  const keptLab = kept.map(hex => {
    const rgb = hexToRgb(hex)!;
    return { hex, lab: rgbToLab(rgb.r, rgb.g, rgb.b) };
  });

  // Cache remap decisions to avoid repeated work
  const cache = new Map<string, string>();

  return grid.map(row => row.map(cell => {
    if (cell === 'transparent' || keptSet.has(cell)) return cell;
    const cached = cache.get(cell);
    if (cached) return cached;

    const rgb = hexToRgb(cell)!;
    const targetLab = rgbToLab(rgb.r, rgb.g, rgb.b);
    let best = keptLab[0].hex;
    let bestDist = Infinity;
    for (const k of keptLab) {
      const dist = algorithm === 'precise'
        ? calculateDeltaE2000(targetLab, k.lab)
        : Math.pow(targetLab.L - k.lab.L, 2)
          + Math.pow(targetLab.a - k.lab.a, 2)
          + Math.pow(targetLab.b - k.lab.b, 2);
      if (dist < bestDist) { bestDist = dist; best = k.hex; }
    }
    cache.set(cell, best);
    return best;
  }));
};

/**
 * Convert an image into a gridSize × gridSize chart of Perler bead hex codes.
 *
 * Pipeline (deliberately simple to keep colors faithful):
 *  1. Cover-fit the source image to a square gridSize × gridSize canvas using
 *     the browser's high-quality downscaler (effectively a box filter).
 *  2. For each of the gridSize² pixels, find the nearest Perler color via
 *     CIE Lab Delta E 2000 (or CIE76 for the fast path).
 *  3. Optional palette reduction to at most options.maxColors distinct beads.
 */
export const processImage = async (
  imageSrc: string,
  gridSize: number = 52,
  options: {
    transparency: boolean;
    algorithm: 'precise' | 'approximate';
    maxColors?: number;
    alphaThreshold?: number;
    enhance?: boolean;
  } = { transparency: true, algorithm: 'precise' }
): Promise<{ grid: string[][], stats: ColorStats[] }> => {
  const alphaThreshold = options.alphaThreshold ?? 128;
  const maxColors = options.maxColors ?? 0; // 0 ⇒ unlimited
  const enhance = options.enhance ?? false;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = gridSize;
      canvas.height = gridSize;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // High-quality downscale (browser native Lanczos/box filter)
      ctx.imageSmoothingEnabled = true;
      // @ts-ignore - imageSmoothingQuality is supported in modern browsers
      ctx.imageSmoothingQuality = 'high';

      // Optional gentle saturation+contrast boost. Helps photo input where
      // subtle off-whites would otherwise quantize to a noisy mass of nearly
      // identical pale grays. Browsers (Chrome/Firefox/Safari ≥ 18) all
      // support ctx.filter; if not, this is a silent no-op.
      if (enhance) {
        // @ts-ignore - filter is widely supported on 2D contexts
        ctx.filter = 'saturate(1.3) contrast(1.1)';
      }

      // Cover-fit: preserve aspect ratio, crop to square (matches user's mental
      // model that the chart is square; padding would waste beads).
      const srcSize = Math.min(img.width, img.height);
      const sx = (img.width - srcSize) / 2;
      const sy = (img.height - srcSize) / 2;
      ctx.clearRect(0, 0, gridSize, gridSize);
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, gridSize, gridSize);

      // Reset filter so it doesn't leak into any subsequent canvas usage.
      // @ts-ignore
      ctx.filter = 'none';

      const { data } = ctx.getImageData(0, 0, gridSize, gridSize);

      // Build the grid
      const grid: string[][] = [];
      for (let y = 0; y < gridSize; y++) {
        const row: string[] = [];
        for (let x = 0; x < gridSize; x++) {
          const i = (y * gridSize + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (options.transparency && a < alphaThreshold) {
            row.push('transparent');
          } else {
            const closest = findClosestPerlerColor(r, g, b, options.algorithm);
            row.push(closest.hex);
          }
        }
        grid.push(row);
      }

      // Optional palette reduction
      const finalGrid = maxColors > 0 ? limitPalette(grid, maxColors, options.algorithm) : grid;

      // Compute stats
      const statsMap = new Map<string, number>();
      for (const row of finalGrid) {
        for (const cell of row) {
          if (cell !== 'transparent') statsMap.set(cell, (statsMap.get(cell) || 0) + 1);
        }
      }
      const total = Array.from(statsMap.values()).reduce((s, n) => s + n, 0) || 1;
      const stats: ColorStats[] = Array.from(statsMap.entries())
        .map(([hex, count]) => {
          const color = PERLER_COLORS.find(c => c.hex === hex)!;
          return { ...color, count, percentage: (count / total) * 100 };
        })
        .sort((a, b) => b.count - a.count);

      resolve({ grid: finalGrid, stats });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
};
