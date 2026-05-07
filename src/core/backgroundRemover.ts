import { MappedPixel } from './types';
import { TRANSPARENT_KEY } from './pixelEditingCompat';

interface BgRemovalOptions {
  backgroundColors?: string[]; // hex values considered background
}

/**
 * Remove background using boundary flood fill.
 * All cells connected to the boundary via background colors are marked isExternal.
 * If no backgroundColors provided, removes the most common boundary color.
 */
export function removeBackground(
  grid: MappedPixel[][],
  N: number,
  M: number,
  options: BgRemovalOptions = {}
): MappedPixel[][] {
  const bgHexSet = options.backgroundColors
    ? new Set(options.backgroundColors.map(c => c.toUpperCase()))
    : null;

  // If no explicit background colors, detect the most common boundary color
  let defaultBg: string | null = null;
  if (!bgHexSet) {
    const boundaryCounts: Record<string, number> = {};
    for (let c = 0; c < N; c++) {
      for (const row of [0, M - 1]) {
        const hex = grid[row][c].color.toUpperCase();
        if (grid[row][c].isExternal) continue;
        boundaryCounts[hex] = (boundaryCounts[hex] || 0) + 1;
      }
    }
    for (let r = 0; r < M; r++) {
      for (const col of [0, N - 1]) {
        const hex = grid[r][col].color.toUpperCase();
        if (grid[r][col].isExternal) continue;
        boundaryCounts[hex] = (boundaryCounts[hex] || 0) + 1;
      }
    }
    let maxCount = 0;
    for (const [hex, count] of Object.entries(boundaryCounts)) {
      if (count > maxCount) { maxCount = count; defaultBg = hex; }
    }
  }

  const targetHex = bgHexSet
    ? null
    : defaultBg;

  const isBg = (hex: string) => {
    if (bgHexSet) return bgHexSet.has(hex.toUpperCase());
    return hex.toUpperCase() === targetHex?.toUpperCase();
  };

  // BFS flood fill from all boundary cells
  const visited = Array.from({ length: M }, () => new Array(N).fill(false));
  const queue: Array<[number, number]> = [];

  // Initialize: all boundary cells that are background
  for (let c = 0; c < N; c++) {
    for (const row of [0, M - 1]) {
      const hex = grid[row][c].color;
      if (!grid[row][c].isExternal && isBg(hex)) {
        queue.push([row, c]);
        visited[row][c] = true;
      }
    }
  }
  for (let r = 0; r < M; r++) {
    for (const col of [0, N - 1]) {
      if (!visited[r][col] && !grid[r][col].isExternal && isBg(grid[r][col].color)) {
        queue.push([r, col]);
        visited[r][col] = true;
      }
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= M || nc < 0 || nc >= N) continue;
      if (visited[nr][nc]) continue;
      if (grid[nr][nc].isExternal) continue;
      if (!isBg(grid[nr][nc].color)) continue;
      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }

  // Mark all visited cells as external
  const result = grid.map(row => row.map(cell => ({ ...cell })));
  for (let r = 0; r < M; r++)
    for (let c = 0; c < N; c++)
      if (visited[r][c]) result[r][c] = { ...result[r][c], isExternal: true };

  return result;
}
