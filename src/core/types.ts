// Re-exported types from the original codebase
export type ColorSystem = 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝';

export type PixelationMode = 'dominant' | 'average';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor {
  key: string;
  hex: string;
  rgb: RgbColor;
}

export interface MappedPixel {
  key: string;
  color: string;
  isExternal?: boolean;
}

export interface ColorCount {
  count: number;
  color: string;
}

export interface ColorStats {
  [hex: string]: ColorCount;
}

export interface GridDimensions {
  N: number;
  M: number;
}

export interface GenerateOptions {
  // Input
  imagePath?: string;
  imageUrl?: string;

  // Pixelation
  width: number;
  aspect?: boolean; // maintain original aspect ratio, height auto-calculated
  mode: PixelationMode;

  // Palette
  palette: ColorSystem;
  colors?: string[]; // custom hex whitelist (if omitted, use all colors in palette)
  excludeColors?: string[]; // hex colors to exclude

  // Color merging
  mergeThreshold: number; // 0-100, Oklab color distance threshold

  // Background removal
  removeBackground?: boolean;
  backgroundColors?: string[]; // hex colors considered background

  // Export
  showGrid?: boolean;
  gridInterval?: number;
  showCoordinates?: boolean;
  showCellNumbers?: boolean;
  gridLineColor?: string;
  includeStats?: boolean;
  exportCsv?: boolean;

  // Output
  outputDir?: string;
  outputPrefix?: string;
}

export interface GenerateResult {
  grid: MappedPixel[][];
  dimensions: GridDimensions;
  stats: ColorStats;
  totalCount: number;
  palette: ColorSystem;
  colorCounts: { [hex: string]: { displayKey: string; count: number } };
}

export interface GenerateOutput {
  result: GenerateResult;
  previewPath?: string;
  patternPath?: string;
  statsPath?: string;
  csvPath?: string;
  jsonPath?: string;
}
