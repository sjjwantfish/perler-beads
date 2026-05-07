import { MappedPixel } from './types';

export const TRANSPARENT_KEY = 'ERASE';

export const transparentColorData: MappedPixel = {
  key: TRANSPARENT_KEY,
  color: '#FFFFFF',
  isExternal: true,
};

/** Recalculate color statistics from grid data */
export function recalculateColorStats(
  grid: MappedPixel[][]
): { colorCounts: Record<string, { count: number; color: string }>; totalCount: number } {
  const colorCounts: Record<string, { count: number; color: string }> = {};
  let totalCount = 0;
  for (const cell of grid.flat()) {
    if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
      const hex = cell.color.toUpperCase();
      if (!colorCounts[hex]) colorCounts[hex] = { count: 0, color: hex };
      colorCounts[hex].count++;
      totalCount++;
    }
  }
  return { colorCounts, totalCount };
}
