import path from 'path';
import { RgbColor, PaletteColor, ColorSystem, PixelationMode } from './types';

// Load color system mapping from JSON
type ColorMapping = Record<string, Record<ColorSystem, string>>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const colorSystemMapping: ColorMapping = require('../app/colorSystemMapping.json');

export function hexToRgb(hex: string): RgbColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function srgbChannelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

interface OklabColor { l: number; a: number; b: number }

function rgbToOklab(rgb: RgbColor): OklabColor {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(l), mRoot = Math.cbrt(m), sRoot = Math.cbrt(s);
  return {
    l: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot,
  };
}

const oklabCache = new Map<string, OklabColor>();

function getOklabColor(rgb: RgbColor): OklabColor {
  const key = `${rgb.r},${rgb.g},${rgb.b}`;
  const cached = oklabCache.get(key);
  if (cached) return cached;
  const oklab = rgbToOklab(rgb);
  oklabCache.set(key, oklab);
  return oklab;
}

/** Oklab-based color distance (0-100 scale) */
export function colorDistance(rgb1: RgbColor, rgb2: RgbColor): number {
  const o1 = getOklabColor(rgb1), o2 = getOklabColor(rgb2);
  const dl = o1.l - o2.l, da = o1.a - o2.a, db = o1.b - o2.b;
  return Math.sqrt(dl * dl + da * da + db * db) * 100;
}

/** Build the full palette (all 291 colors) as PaletteColor array */
export function buildFullPalette(): PaletteColor[] {
  const result: PaletteColor[] = [];
  for (const [hex, colorData] of Object.entries(colorSystemMapping)) {
    const rgb = hexToRgb(hex);
    if (rgb) result.push({ key: hex, hex, rgb });
  }
  return result;
}

/**
 * Build active palette based on options:
 * - Start with full palette (all 291 colors)
 * - Filter to custom whitelist if `colors` is provided
 * - Convert to target color system keys
 * - Exclude specified colors
 */
export function buildActivePalette(
  options: { palette: ColorSystem; colors?: string[]; excludeColors?: string[] }
): PaletteColor[] {
  let colors: PaletteColor[];

  if (options.colors && options.colors.length > 0) {
    // Custom whitelist
    const whitelist = new Set(options.colors.map(c => c.toUpperCase()));
    colors = buildFullPalette().filter(c => whitelist.has(c.hex.toUpperCase()));
  } else {
    colors = buildFullPalette();
  }

  // Exclude colors
  if (options.excludeColors && options.excludeColors.length > 0) {
    const excluded = new Set(options.excludeColors.map(c => c.toUpperCase()));
    colors = colors.filter(c => !excluded.has(c.hex.toUpperCase()));
  }

  // Convert to target color system keys
  colors = colors.map(c => {
    const mapping = colorSystemMapping[c.hex];
    if (mapping && mapping[options.palette]) {
      return { ...c, key: mapping[options.palette] };
    }
    return c;
  });

  return colors;
}

/** Get display key (color code) for a hex value in a given color system */
export function getDisplayColorKey(hex: string, colorSystem: ColorSystem): string {
  if (hex === 'ERASE' || !hex || hex === '?') return hex;
  const normalized = hex.toUpperCase();
  const mapping = colorSystemMapping[normalized];
  if (mapping && mapping[colorSystem]) return mapping[colorSystem];
  return '?';
}

/** Find the closest palette color to a given RGB value */
export function findClosestPaletteColor(targetRgb: RgbColor, palette: PaletteColor[]): PaletteColor {
  let minDist = Infinity, closest = palette[0];
  for (const pc of palette) {
    const dist = colorDistance(targetRgb, pc.rgb);
    if (dist < minDist) { minDist = dist; closest = pc; }
    if (dist === 0) break;
  }
  return closest;
}
