import { PerlerColor } from '../types';

/**
 * Boosts color saturation
 * saturation: 1.0 is original, > 1.0 increases saturation
 */
export const boostSaturation = (data: Uint8ClampedArray, saturation: number = 1.4) => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Convert to HSL (simplified version using grayscale as L)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    data[i] = Math.min(255, Math.max(0, gray + (r - gray) * saturation));
    data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * saturation));
    data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * saturation));
  }
};

/**
 * Adjusts brightness and contrast (OpenCV-like convertScaleAbs)
 * result = alpha * pixel + beta
 */
export const convertScaleAbs = (data: Uint8ClampedArray, alpha: number = 1.3, beta: number = 20) => {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] * alpha + beta));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * alpha + beta));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * alpha + beta));
  }
};

/**
 * 3x3 Sharpening Kernel Convolution
 */
export const sharpenImage = (data: Uint8ClampedArray, width: number, height: number) => {
  const original = new Uint8ClampedArray(data);
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
          r += original[idx] * kVal;
          g += original[idx + 1] * kVal;
          b += original[idx + 2] * kVal;
        }
      }
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }
};

/**
 * SLIC (Simple Linear Iterative Clustering) Superpixels
 * Optimized for 52x52 output
 */
export const runSLIC = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  k: number = 2704, // 52x52
  m: number = 20, // Compactness
  iterations: number = 5
) => {
  const n = width * height;
  const s = Math.sqrt(n / k); // Grid interval
  const labels = new Int32Array(n).fill(-1);
  const distances = new Float32Array(n).fill(Infinity);

  // 1. Initialize cluster centers
  interface Center { l: number, a: number, b: number, x: number, y: number }
  let centers: Center[] = [];

  // Convert image to Lab for SLIC
  const labData = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    
    // Simple RGB to Lab inline for speed
    let nr = r / 255, ng = g / 255, nb = b / 255;
    nr = nr > 0.04045 ? Math.pow((nr + 0.055) / 1.055, 2.4) : nr / 12.92;
    ng = ng > 0.04045 ? Math.pow((ng + 0.055) / 1.055, 2.4) : ng / 12.92;
    nb = nb > 0.04045 ? Math.pow((nb + 0.055) / 1.055, 2.4) : nb / 12.92;
    const x = nr * 0.4124 + ng * 0.3576 + nb * 0.1805;
    const y = nr * 0.2126 + ng * 0.7152 + nb * 0.0722;
    const z = nr * 0.0193 + ng * 0.1192 + nb * 0.9505;
    let nx = x / 0.95047, ny = y / 1.0, nz = z / 1.08883;
    nx = nx > 0.008856 ? Math.pow(nx, 1/3) : (7.787 * nx) + (16/116);
    ny = ny > 0.008856 ? Math.pow(ny, 1/3) : (7.787 * ny) + (16/116);
    nz = nz > 0.008856 ? Math.pow(nz, 1/3) : (7.787 * nz) + (16/116);
    labData[i * 3] = (116 * ny) - 16;
    labData[i * 3 + 1] = 500 * (nx - ny);
    labData[i * 3 + 2] = 200 * (ny - nz);
  }

  for (let y = s / 2; y < height; y += s) {
    for (let x = s / 2; x < width; x += s) {
      const idx = Math.floor(y) * width + Math.floor(x);
      centers.push({
        l: labData[idx * 3],
        a: labData[idx * 3 + 1],
        b: labData[idx * 3 + 2],
        x: Math.floor(x),
        y: Math.floor(y)
      });
    }
  }

  const sInv = 1 / s;
  const mDivSSq = (m * sInv) * (m * sInv);

  // 2. Iterative assignment and update
  for (let iter = 0; iter < iterations; iter++) {
    distances.fill(Infinity);
    
    for (let i = 0; i < centers.length; i++) {
      const c = centers[i];
      const xStart = Math.max(0, Math.floor(c.x - s));
      const xEnd = Math.min(width, Math.floor(c.x + s));
      const yStart = Math.max(0, Math.floor(c.y - s));
      const yEnd = Math.min(height, Math.floor(c.y + s));

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const idx = y * width + x;
          const dl = c.l - labData[idx * 3];
          const da = c.a - labData[idx * 3 + 1];
          const db = c.b - labData[idx * 3 + 2];
          const dx = c.x - x;
          const dy = c.y - y;
          
          const dist = dl * dl + da * da + db * db + (dx * dx + dy * dy) * mDivSSq;
          
          if (dist < distances[idx]) {
            distances[idx] = dist;
            labels[idx] = i;
          }
        }
      }
    }

    // Update centers
    const newCenters: Center[] = centers.map(() => ({ l: 0, a: 0, b: 0, x: 0, y: 0 }));
    const counts = new Int32Array(centers.length).fill(0);

    for (let i = 0; i < n; i++) {
      const l = labels[i];
      if (l !== -1) {
        newCenters[l].l += labData[i * 3];
        newCenters[l].a += labData[i * 3 + 1];
        newCenters[l].b += labData[i * 3 + 2];
        newCenters[l].x += i % width;
        newCenters[l].y += Math.floor(i / width);
        counts[l]++;
      }
    }

    for (let i = 0; i < centers.length; i++) {
      if (counts[i] > 0) {
        centers[i].l = newCenters[i].l / counts[i];
        centers[i].a = newCenters[i].a / counts[i];
        centers[i].b = newCenters[i].b / counts[i];
        centers[i].x = newCenters[i].x / counts[i];
        centers[i].y = newCenters[i].y / counts[i];
      }
    }
  }

  // Calculate final average colors for each label in RGB
  const finalRgb = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    if (l !== -1) {
      finalRgb[l].r += data[i * 4];
      finalRgb[l].g += data[i * 4 + 1];
      finalRgb[l].b += data[i * 4 + 2];
      finalRgb[l].count++;
    }
  }

  return {
    labels,
    centers: finalRgb.map(c => ({
      r: c.count > 0 ? Math.round(c.r / c.count) : 0,
      g: c.count > 0 ? Math.round(c.g / c.count) : 0,
      b: c.count > 0 ? Math.round(c.b / c.count) : 0
    }))
  };
};

/**
 * Grayscale conversion
 */
export const toGrayscale = (data: Uint8ClampedArray, width: number, height: number): Float32Array => {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
};

/**
 * Sobel Edge Detection
 */
export const sobel = (gray: Float32Array, width: number, height: number): Float32Array => {
  const edge = new Float32Array(width * height);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0, sy = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const val = gray[(y + i) * width + (x + j)];
          sx += val * gx[(i + 1) * 3 + (j + 1)];
          sy += val * gy[(i + 1) * 3 + (j + 1)];
        }
      }
      edge[y * width + x] = Math.sqrt(sx * sx + sy * sy);
    }
  }
  return edge;
};

/**
 * Gamma correction
 */
export const applyGamma = (r: number, g: number, b: number, gamma: number = 0.8): { r: number, g: number, b: number } => {
  return {
    r: Math.pow(Math.max(0, r) / 255, gamma) * 255,
    g: Math.pow(Math.max(0, g) / 255, gamma) * 255,
    b: Math.pow(Math.max(0, b) / 255, gamma) * 255
  };
};

/**
 * Simple Dilation
 */
export const dilate = (mask: Float32Array, width: number, height: number, radius: number = 1): Float32Array => {
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let max = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            max = Math.max(max, mask[ny * width + nx]);
          }
        }
      }
      result[y * width + x] = max;
    }
  }
  return result;
};

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization)
 */
export const applyCLAHE = (data: Uint8ClampedArray, width: number, height: number, gridSize: number = 8, clipLimit: number = 2.0) => {
  const yuv = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    yuv[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const tileW = Math.floor(width / gridSize);
  const tileH = Math.floor(height / gridSize);
  const histograms: number[][] = [];

  for (let ty = 0; ty < gridSize; ty++) {
    for (let tx = 0; tx < gridSize; tx++) {
      const hist = new Array(256).fill(0);
      for (let y = ty * tileH; y < (ty + 1) * tileH; y++) {
        for (let x = tx * tileW; x < (tx + 1) * tileW; x++) {
          hist[Math.floor(yuv[y * width + x])]++;
        }
      }
      const limit = Math.max(1, (tileW * tileH / 256) * clipLimit);
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      const add = excess / 256;
      for (let i = 0; i < 256; i++) hist[i] += add;

      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += hist[i];
        hist[i] = (sum / (tileW * tileH)) * 255;
      }
      histograms.push(hist);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tx = (x - tileW / 2) / tileW;
      const ty = (y - tileH / 2) / tileH;
      const tx1 = Math.floor(tx);
      const ty1 = Math.floor(ty);
      const tx2 = tx1 + 1;
      const ty2 = ty1 + 1;

      const fx = tx - tx1;
      const fy = ty - ty1;

      const getVal = (gx: number, gy: number, v: number) => {
        if (gx < 0) gx = 0; if (gx >= gridSize) gx = gridSize - 1;
        if (gy < 0) gy = 0; if (gy >= gridSize) gy = gridSize - 1;
        return histograms[gy * gridSize + gx][Math.floor(Math.min(255, Math.max(0, v)))];
      };

      const v = yuv[y * width + x];
      const v11 = getVal(tx1, ty1, v);
      const v12 = getVal(tx2, ty1, v);
      const v21 = getVal(tx1, ty2, v);
      const v22 = getVal(tx2, ty2, v);

      const newVal = (1 - fx) * (1 - fy) * v11 + fx * (1 - fy) * v12 + (1 - fx) * fy * v21 + fx * fy * v22;
      const ratio = newVal / (v || 1);
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, data[idx] * ratio));
      data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] * ratio));
      data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] * ratio));
    }
  }
};

/**
 * Palette reduction using frequency analysis and re-mapping
 */
export const reducePalette = (grid: string[][], stats: any[], maxColors: number = 24) => {
  if (stats.length <= maxColors) return grid;

  // Sort by frequency
  const sortedStats = [...stats].sort((a, b) => b.count - a.count);
  const keptColors = sortedStats.slice(0, maxColors);
  const keptHexes = new Set(keptColors.map(c => c.hex));

  const newGrid = grid.map(row => row.map(cell => {
    if (cell === 'transparent' || keptHexes.has(cell)) return cell;
    
    let minDiff = Infinity;
    let closest = keptColors[0].hex;
    
    const r1 = parseInt(cell.slice(1, 3), 16);
    const g1 = parseInt(cell.slice(3, 5), 16);
    const b1 = parseInt(cell.slice(5, 7), 16);

    for (const kept of keptColors) {
      const r2 = parseInt(kept.hex.slice(1, 3), 16);
      const g2 = parseInt(kept.hex.slice(3, 5), 16);
      const b2 = parseInt(kept.hex.slice(5, 7), 16);
      const diff = Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2);
      if (diff < minDiff) {
        minDiff = diff;
        closest = kept.hex;
      }
    }
    return closest;
  }));

  return newGrid;
};

/**
 * Simple Sharpening for the 52x52 grid
 */
export const sharpenGrid = (grid: string[][]): string[][] => {
  const size = grid.length;
  const newGrid = grid.map(row => [...row]);

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[y][x] === 'transparent') continue;

      const current = grid[y][x];
      const neighbors = [
        grid[y-1][x], grid[y+1][x], grid[y][x-1], grid[y][x+1]
      ];

      // If a pixel is significantly different from its neighbors, we might want to enhance its contrast
      // In pixel art, "sharpening" is more about cleaning up orphan pixels or enhancing edges
      // For now, we return as is, but we could add logic here.
    }
  }
  return newGrid;
};
