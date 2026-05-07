import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { MappedPixel, ColorStats, ColorSystem, GridDimensions } from './types';
import { getDisplayColorKey } from './colorMapper';

interface ExportOptions {
  showGrid?: boolean;
  gridInterval?: number;
  showCoordinates?: boolean;
  showCellNumbers?: boolean;
  gridLineColor?: string;
  includeStats?: boolean;
  cellSize?: number;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 128 ? '#000000' : '#FFFFFF';
}

function sortColorKeys(keys: string[]): string[] {
  const regex = /^([A-Z]+)(\d+)$/;
  return [...keys].sort((a, b) => {
    const ma = a.match(regex), mb = b.match(regex);
    if (ma && mb) {
      if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1]);
      return parseInt(ma[2]) - parseInt(mb[2]);
    }
    return a.localeCompare(b);
  });
}

/**
 * Render grid to a PNG and save to file.
 * Returns the file path.
 */
export function renderGridToPng(
  grid: MappedPixel[][],
  dimensions: GridDimensions,
  colorSystem: ColorSystem,
  opts: ExportOptions,
  outputPath: string
): string {
  const { N, M } = dimensions;
  const cellSize = opts.cellSize ?? 30;
  const showGrid = opts.showGrid ?? true;
  const gridInterval = opts.gridInterval ?? 10;
  const showCoords = opts.showCoordinates ?? false;
  const showNumbers = opts.showCellNumbers ?? true;
  const gridLineColor = opts.gridLineColor ?? '#000000';
  const includeStats = opts.includeStats ?? true;

  const axisLabel = showCoords ? Math.max(30, Math.floor(cellSize)) : 0;
  const extraMargin = showCoords ? Math.max(20, Math.floor(cellSize * 2)) : 0;

  // Calculate stats region height
  let statsHeight = 0;
  if (includeStats) {
    // Rough estimate: title(40) + rows + footer(40) + padding
    statsHeight = 120;
  }

  const titleBarH = 60;
  const footerH = 30;
  const gridW = N * cellSize;
  const gridH = M * cellSize;
  const totalW = gridW + axisLabel * 2 + extraMargin * 2;
  const totalH = titleBarH + axisLabel * 2 + gridH + statsHeight + footerH + extraMargin;

  const canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalW, totalH);

  // Title bar
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(0, 0, totalW, titleBarH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 20px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Perler Bead Pattern', extraMargin + axisLabel + 10, titleBarH / 2);
  ctx.font = `14px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`${N}×${M} · ${colorSystem}`, extraMargin + axisLabel + 10, titleBarH * 0.72);

  // Coordinate labels
  if (showCoords) {
    const coordFont = Math.max(10, Math.floor(cellSize * 0.45));
    ctx.font = `${coordFont}px sans-serif`;
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < N; i++) {
      if (i % gridInterval === 0 || i === 0 || i === N - 1) {
        const x = extraMargin + axisLabel + i * cellSize + cellSize / 2;
        ctx.fillText(String(i + 1), x, titleBarH + axisLabel / 2);
        ctx.fillText(String(i + 1), x, titleBarH + axisLabel + gridH + axisLabel / 2);
      }
    }
    for (let j = 0; j < M; j++) {
      if (j % gridInterval === 0 || j === 0 || j === M - 1) {
        const y = titleBarH + axisLabel + j * cellSize + cellSize / 2;
        ctx.fillText(String(j + 1), extraMargin + axisLabel / 2, y);
        ctx.fillText(String(j + 1), extraMargin + axisLabel + gridW + axisLabel / 2, y);
      }
    }
  }

  // Draw grid cells
  const gridX = extraMargin + axisLabel;
  const gridY = titleBarH + axisLabel;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let r = 0; r < M; r++) {
    for (let c = 0; c < N; c++) {
      const cell = grid[r][c];
      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;

      if (!cell.isExternal) {
        ctx.fillStyle = cell.color;
        ctx.fillRect(x, y, cellSize, cellSize);

        if (showNumbers) {
          const displayKey = getDisplayColorKey(cell.color, colorSystem);
          if (displayKey && displayKey !== '?' && displayKey !== 'ERASE') {
            ctx.fillStyle = getContrastColor(cell.color);
            ctx.font = `bold ${Math.max(6, Math.floor(cellSize * 0.35))}px sans-serif`;
            ctx.fillText(displayKey, x + cellSize / 2, y + cellSize / 2);
          }
        }
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, cellSize, cellSize);
      }

      // Cell border
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
    }
  }

  // Grid separator lines
  if (showGrid) {
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1.5;
    for (let c = gridInterval; c < N; c += gridInterval) {
      const x = gridX + c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, gridY);
      ctx.lineTo(x, gridY + gridH);
      ctx.stroke();
    }
    for (let r = gridInterval; r < M; r += gridInterval) {
      const y = gridY + r * cellSize;
      ctx.beginPath();
      ctx.moveTo(gridX, y);
      ctx.lineTo(gridX + gridW, y);
      ctx.stroke();
    }
    // Main border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX + 0.5, gridY + 0.5, gridW, gridH);
  }

  // Stats region
  if (includeStats) {
    const statsY = gridY + gridH + axisLabel + 20;
    const statsPadding = 20;

    ctx.fillStyle = '#333333';
    ctx.font = `bold 14px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Color Legend', statsPadding, statsY + 15);

    ctx.strokeStyle = '#DDDDDD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(statsPadding, statsY + 25);
    ctx.lineTo(totalW - statsPadding, statsY + 25);
    ctx.stroke();

    const swatchSize = 16;
    const statsFontSize = 12;
    const itemH = swatchSize + 8;
    const colW = Math.floor((totalW - statsPadding * 2) / 4);
    let idx = 0;
    const hexKeys = sortColorKeys(Object.keys(colorStats || {}));
    for (const hex of hexKeys) {
      const col = Math.floor(idx / Math.ceil(hexKeys.length / 4));
      const row = idx % Math.ceil(hexKeys.length / 4);
      const sx = statsPadding + col * colW;
      const sy = statsY + 35 + row * itemH;
      const count = colorStats?.[hex]?.count ?? 0;
      const displayKey = getDisplayColorKey(hex, colorSystem);

      ctx.fillStyle = hex;
      ctx.strokeStyle = '#CCCCCC';
      ctx.fillRect(sx, sy - swatchSize / 2, swatchSize, swatchSize);
      ctx.strokeRect(sx + 0.5, sy - swatchSize / 2 + 0.5, swatchSize - 1, swatchSize - 1);

      ctx.fillStyle = '#333333';
      ctx.font = `${statsFontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${displayKey}`, sx + swatchSize + 5, sy);
      ctx.textAlign = 'right';
      ctx.fillText(`${count}`, sx + colW - 10, sy);
      idx++;
    }
  }

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buf);
  return outputPath;
}

// colorStats must be set before calling renderGridToPng
let colorStats: ColorStats | null = null;
export function setColorStats(stats: ColorStats) { colorStats = stats; }
