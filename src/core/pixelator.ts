import { MappedPixel, PaletteColor, PixelationMode, RgbColor } from './types';
import { TRANSPARENT_KEY } from './pixelEditingCompat';
import { findClosestPaletteColor } from './colorMapper';

const MODE_DOMINANT = 'dominant';
const MODE_AVERAGE = 'average';

interface RawImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Extract dominant or average color from a region of raw pixel data.
 */
function extractCellColor(
  img: RawImageData,
  startX: number, startY: number,
  width: number, height: number,
  mode: PixelationMode
): RgbColor | null {
  const { data, width: imgW } = img;
  const endX = Math.min(imgW, startX + width);
  const endY = Math.min(img.height, startY + height);
  let rSum = 0, gSum = 0, bSum = 0, pixelCount = 0;
  const colorCounts: Record<string, { rgb: RgbColor; count: number }> = {};

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * imgW + x) * 4;
      if (data[idx + 3] < 128) continue; // skip transparent
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      pixelCount++;
      if (mode === MODE_AVERAGE) {
        rSum += r; gSum += g; bSum += b;
      } else {
        const key = `${r},${g},${b}`;
        if (!colorCounts[key]) colorCounts[key] = { rgb: { r, g, b }, count: 0 };
        colorCounts[key].count++;
      }
    }
  }

  if (pixelCount === 0) return null;

  if (mode === MODE_AVERAGE) {
    return { r: Math.round(rSum / pixelCount), g: Math.round(gSum / pixelCount), b: Math.round(bSum / pixelCount) };
  }
  // Dominant: find most frequent
  let maxCount = 0, dominant: RgbColor = { r: 0, g: 0, b: 0 };
  for (const entry of Object.values(colorCounts)) {
    if (entry.count > maxCount) { maxCount = entry.count; dominant = entry.rgb; }
  }
  return dominant;
}

/**
 * Pixelate an image and map colors to the given palette.
 * Returns M[][] of MappedPixel.
 */
export function pixelateImage(
  img: RawImageData,
  N: number, // horizontal cell count
  M: number, // vertical cell count
  palette: PaletteColor[],
  mode: PixelationMode,
  fallbackColor: PaletteColor
): MappedPixel[][] {
  const cellW = img.width / N;
  const cellH = img.height / M;

  const result: MappedPixel[][] = Array.from({ length: M }, () =>
    Array.from({ length: N }, () => ({
      key: fallbackColor.key, color: fallbackColor.hex, isExternal: false,
    }))
  );

  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const sx = Math.floor(i * cellW);
      const sy = Math.floor(j * cellH);
      const ew = Math.max(1, Math.min(img.width, Math.ceil((i + 1) * cellW)) - sx);
      const eh = Math.max(1, Math.min(img.height, Math.ceil((j + 1) * cellH)) - sy);

      const rgb = extractCellColor(img, sx, sy, ew, eh, mode);
      if (rgb) {
        const closest = findClosestPaletteColor(rgb, palette);
        result[j][i] = { key: closest.key, color: closest.hex, isExternal: false };
      }
    }
  }
  return result;
}

/**
 * Merge similar adjacent colors based on Oklab distance threshold.
 * Colors with lower frequency are merged into higher frequency neighbors.
 */
export function mergeSimilarColors(
  grid: MappedPixel[][],
  M: number, N: number,
  palette: PaletteColor[],
  threshold: number
): MappedPixel[][] {
  // Build key -> rgb map
  const keyToRgb = new Map<string, { r: number; g: number; b: number }>();
  const keyToPalette = new Map<string, PaletteColor>();
  for (const p of palette) {
    keyToRgb.set(p.key, p.rgb);
    keyToPalette.set(p.key, p);
  }

  // Count initial colors
  const counts: Record<string, number> = {};
  for (let r = 0; r < M; r++)
    for (let c = 0; c < N; c++) {
      const k = grid[r][c].key;
      if (k !== TRANSPARENT_KEY && !grid[r][c].isExternal)
        counts[k] = (counts[k] || 0) + 1;
    }

  // Sort by frequency descending
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const replaced = new Set<string>();
  const merged: MappedPixel[][] = grid.map(row => row.map(cell => ({ ...cell })));

  for (let i = 0; i < sorted.length; i++) {
    const curKey = sorted[i];
    if (replaced.has(curKey)) continue;
    const curRgb = keyToRgb.get(curKey);
    if (!curRgb) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const lowKey = sorted[j];
      if (replaced.has(lowKey)) continue;
      const lowRgb = keyToRgb.get(lowKey);
      if (!lowRgb) continue;

      const dist = Math.sqrt(
        (curRgb.r - lowRgb.r) ** 2 +
        (curRgb.g - lowRgb.g) ** 2 +
        (curRgb.b - lowRgb.b) ** 2
      );

      if (dist < threshold) {
        replaced.add(lowKey);
        const pal = keyToPalette.get(curKey);
        for (let r = 0; r < M; r++)
          for (let c = 0; c < N; c++)
            if (merged[r][c].key === lowKey)
              merged[r][c] = { key: curKey, color: pal?.hex ?? merged[r][c].color, isExternal: false };
      }
    }
  }
  return merged;
}
