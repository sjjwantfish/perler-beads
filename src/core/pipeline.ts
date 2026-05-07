import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import {
  GenerateOptions, GenerateResult, GenerateOutput,
  MappedPixel, ColorStats, PaletteColor, PixelationMode, ColorSystem,
} from './types';
import { buildActivePalette, getDisplayColorKey } from './colorMapper';
import { pixelateImage, mergeSimilarColors } from './pixelator';
import { removeBackground } from './backgroundRemover';
import { recalculateColorStats, TRANSPARENT_KEY } from './pixelEditingCompat';
import { renderGridToPng, setColorStats } from './imageExporter';

interface RawImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

async function loadImageAsRawData(input: string): Promise<RawImageData> {
  let buf: Buffer;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const res = await fetch(input);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    buf = fs.readFileSync(input);
  }
  const img = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(img.data),
    width: img.info.width,
    height: img.info.height,
  };
}

function buildColorCounts(
  stats: ColorStats,
  colorSystem: ColorSystem
): Record<string, { displayKey: string; count: number }> {
  const result: Record<string, { displayKey: string; count: number }> = {};
  for (const [hex, data] of Object.entries(stats)) {
    result[hex] = {
      displayKey: getDisplayColorKey(hex, colorSystem),
      count: data.count,
    };
  }
  return result;
}

/**
 * Main processing pipeline:
 * 1. Load image
 * 2. Pixelate
 * 3. Merge similar colors
 * 4. Remove background
 * 5. Calculate stats
 * 6. Export outputs
 */
export async function runPipeline(options: GenerateOptions): Promise<GenerateOutput> {
  // Validate image input
  if (!options.imagePath && !options.imageUrl) {
    throw new Error('Either imagePath or imageUrl must be provided');
  }
  const imageInput = options.imagePath ?? options.imageUrl!;

  // Load image
  const img = await loadImageAsRawData(imageInput);

  // Determine grid dimensions
  const N = options.width;
  const aspectRatio = img.height / img.width;
  const M = options.aspect
    ? Math.max(1, Math.round(N * aspectRatio))
    : N;

  // Build palette
  const palette = buildActivePalette({
    palette: options.palette,
    colors: options.colors,
    excludeColors: options.excludeColors,
  });

  if (palette.length === 0) {
    throw new Error('Active palette is empty. Check colors/excludeColors options.');
  }

  const fallbackColor = palette.find(p => p.key === 'T1') ?? palette[0];

  // Step 1: Pixelate
  let grid = pixelateImage(
    img, N, M,
    palette,
    options.mode as PixelationMode,
    fallbackColor
  );

  // Step 2: Merge similar colors
  if (options.mergeThreshold > 0) {
    grid = mergeSimilarColors(grid, M, N, palette, options.mergeThreshold);
  }

  // Step 3: Remove background
  if (options.removeBackground) {
    grid = removeBackground(grid, N, M, {
      backgroundColors: options.backgroundColors,
    });
  }

  // Step 4: Stats
  const { colorCounts, totalCount } = recalculateColorStats(grid);

  // Build result
  const result: GenerateResult = {
    grid,
    dimensions: { N, M },
    stats: colorCounts,
    totalCount,
    palette: options.palette,
    colorCounts: buildColorCounts(colorCounts, options.palette),
  };

  // Step 5: Export outputs
  const outputDir = options.outputDir ?? '.';
  const prefix = options.outputPrefix ?? path.basename(imageInput, path.extname(imageInput));
  fs.mkdirSync(outputDir, { recursive: true });

  setColorStats(colorCounts);

  const previewPath = path.join(outputDir, `${prefix}_preview.png`);
  const statsPath = path.join(outputDir, `${prefix}_stats.png`);

  const exportOpts = {
    showGrid: options.showGrid ?? true,
    gridInterval: options.gridInterval ?? 10,
    showCoordinates: options.showCoordinates ?? true,
    showCellNumbers: options.showCellNumbers ?? true,
    gridLineColor: options.gridLineColor ?? '#000000',
    includeStats: options.includeStats ?? true,
    cellSize: Math.max(10, Math.min(40, Math.floor(800 / Math.max(N, M)))),
  };

  // Render pattern PNG
  renderGridToPng(grid, { N, M }, options.palette, exportOpts, previewPath);

  // Render stats PNG
  renderGridToPng(grid, { N, M }, options.palette, { ...exportOpts, showCellNumbers: false, showGrid: false, includeStats: true, cellSize: 30 }, statsPath);

  const output: GenerateOutput = {
    result,
    previewPath,
    patternPath: previewPath,
    statsPath,
  };

  // CSV export
  if (options.exportCsv) {
    const csvPath = path.join(outputDir, `${prefix}.csv`);
    const csvLines: string[] = [];
    for (let r = 0; r < M; r++) {
      csvLines.push(grid[r].map(c => c.isExternal ? 'TRANSPARENT' : c.color).join(','));
    }
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    output.csvPath = csvPath;
  }

  // JSON export
  const jsonPath = path.join(outputDir, `${prefix}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({
    dimensions: { N, M },
    palette: options.palette,
    totalCount,
    colorCounts: result.colorCounts,
    grid: grid.map(row => row.map(c => ({ key: c.key, color: c.color, isExternal: c.isExternal }))),
  }, null, 2));
  output.jsonPath = jsonPath;

  return output;
}
