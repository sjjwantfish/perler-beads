#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { runPipeline } from '../core';
import { ColorSystem, PixelationMode, GenerateOptions } from '../core/types';

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

const program = new Command();

program
  .name('perler-cli')
  .description('Perler bead pattern generator CLI')
  .version(pkg.version);

const PALETTES = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝'] as const;
const MODES = ['dominant', 'average'] as const;

program
  .command('generate')
  .description('Generate a perler bead pattern from an image')
  .argument('<image>', 'Path to input image (local file or URL)')
  .option('-o, --output <dir>', 'Output directory', '.')
  .option('--prefix <name>', 'Output file prefix', path.basename(process.cwd()))
  .option('-w, --width <n>', 'Horizontal cell count', '50')
  .option('--aspect', 'Maintain original aspect ratio, auto-calculate height')
  .option('-m, --mode <mode>', `Pixelation mode: ${MODES.join(' | ')}`, 'dominant')
  .option('-c, --palette <name>', `Color palette: ${PALETTES.join(' | ')}`, 'MARD')
  .option('--colors <hexes>', 'Custom color whitelist (comma-separated hex values, no #)', '')
  .option('--exclude <hexes>', 'Colors to exclude (comma-separated hex values, no #)', '')
  .option('-t, --threshold <n>', 'Color merge threshold (0-100)', '30')
  .option('--remove-bg', 'Enable background removal via flood fill')
  .option('--bg-colors <hexes>', 'Background colors (comma-separated hex values, no #)', '')
  .option('--no-grid', 'Hide grid lines in output')
  .option('-i, --grid-interval <n>', 'Grid line interval', '10')
  .option('--no-coords', 'Hide X/Y coordinate labels')
  .option('--no-numbers', 'Hide color codes in cells')
  .option('--grid-color <hex>', 'Grid line color (default: 000000)', '000000')
  .option('--no-stats', 'Exclude color legend from output')
  .option('--csv', 'Also export grid as CSV')
  .option('--cell-size <n>', 'Cell pixel size in output PNG', '0')
  .action(async (image: string, opts: Record<string, string | boolean>) => {
    // Validate palette
    const palette = (opts.palette as string)?.toUpperCase();
    if (!PALETTES.map(p => p.toUpperCase()).includes(palette)) {
      console.error(`Invalid palette "${palette}". Must be one of: ${PALETTES.join(', ')}`);
      process.exit(1);
    }
    const paletteKey = PALETTES.find(p => p.toUpperCase() === palette) as ColorSystem;

    // Validate mode
    const mode = (opts.mode as string)?.toLowerCase();
    if (!MODES.includes(mode as 'dominant' | 'average')) {
      console.error(`Invalid mode "${mode}". Must be one of: ${MODES.join(', ')}`);
      process.exit(1);
    }

    const options: GenerateOptions = {
      imagePath: image.startsWith('http') ? undefined : image,
      imageUrl: image.startsWith('http') ? image : undefined,
      outputDir: opts.output as string,
      outputPrefix: opts.prefix as string,
      width: parseInt(opts.width as string, 10) || 50,
      aspect: opts.aspect === true,
      mode: mode as PixelationMode,
      palette: paletteKey,
      colors: opts.colors ? (opts.colors as string).split(',').map(c => '#' + c.trim()).filter(Boolean) : undefined,
      excludeColors: opts.exclude ? (opts.exclude as string).split(',').map(c => '#' + c.trim()).filter(Boolean) : undefined,
      mergeThreshold: parseInt(opts.threshold as string, 10) || 30,
      removeBackground: opts.removeBg === true,
      backgroundColors: opts.bgColors ? (opts.bgColors as string).split(',').map(c => '#' + c.trim()).filter(Boolean) : undefined,
      showGrid: opts.grid !== false,
      gridInterval: parseInt(opts.gridInterval as string, 10) || 10,
      showCoordinates: opts.coords !== false,
      showCellNumbers: opts.numbers !== false,
      gridLineColor: '#' + ((opts.gridColor as string) || '000000'),
      includeStats: opts.stats !== false,
      exportCsv: opts.csv === true,
    };

    console.log('⚙️  Generating perler bead pattern...');
    console.log(`   Image: ${image}`);
    console.log(`   Grid: ${options.width}×${options.aspect ? 'auto' : options.width}`);
    console.log(`   Palette: ${options.palette}`);
    console.log(`   Mode: ${options.mode}`);
    console.log(`   Merge threshold: ${options.mergeThreshold}`);

    try {
      const output = await runPipeline(options);

      console.log('\n✅ Done! Output files:');
      if (output.previewPath) console.log(`   📄 Pattern: ${output.previewPath}`);
      if (output.statsPath) console.log(`   📊 Stats:   ${output.statsPath}`);
      if (output.csvPath) console.log(`   📋 CSV:     ${output.csvPath}`);
      if (output.jsonPath) console.log(`   📦 JSON:    ${output.jsonPath}`);

      console.log(`\n📊 Total beads: ${output.result.totalCount}`);
      console.log('🎨 Colors used:');
      for (const [hex, data] of Object.entries(output.result.colorCounts)) {
        console.log(`   ${data.displayKey} (${hex}) — ${data.count}颗`);
      }
    } catch (err) {
      console.error('❌ Error:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
