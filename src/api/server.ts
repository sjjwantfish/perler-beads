import Fastify from 'fastify';
import { runPipeline } from '../core';
import { GenerateOptions, ColorSystem, PixelationMode } from '../core/types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';

const fastify = Fastify({ logger: true });

fastify.post('/generate', async (request, reply) => {
  const body = request.body as Record<string, unknown>;

  // Validate
  if (!body.image && !body.imageUrl) {
    return reply.status(400).send({ error: 'image (base64) or imageUrl must be provided' });
  }

  // Build options
  const options: GenerateOptions = {
    imageUrl: body.imageUrl as string | undefined,
    width: Number(body.width ?? 50),
    aspect: Boolean(body.aspect),
    mode: (body.mode as PixelationMode) ?? 'dominant',
    palette: (body.palette as ColorSystem) ?? 'MARD',
    colors: Array.isArray(body.colors) ? body.colors as string[] : undefined,
    excludeColors: Array.isArray(body.excludeColors) ? body.excludeColors as string[] : undefined,
    mergeThreshold: Number(body.mergeThreshold ?? 30),
    removeBackground: Boolean(body.removeBackground),
    backgroundColors: Array.isArray(body.backgroundColors) ? body.backgroundColors as string[] : undefined,
    showGrid: body.showGrid !== false,
    gridInterval: Number(body.gridInterval ?? 10),
    showCoordinates: body.showCoordinates !== false,
    showCellNumbers: body.showCellNumbers !== false,
    gridLineColor: (body.gridLineColor as string) ?? '#000000',
    includeStats: body.includeStats !== false,
    exportCsv: Boolean(body.exportCsv),
    outputDir: os.tmpdir(),
    outputPrefix: `perler-${Date.now()}`,
  };

  // Handle base64 image
  if (body.image && typeof body.image === 'string') {
    const tmpFile = path.join(os.tmpdir(), `perler-input-${Date.now()}.png`);
    const buf = Buffer.from(body.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    fs.writeFileSync(tmpFile, buf);
    options.imagePath = tmpFile;
  }

  try {
    const output = await runPipeline(options);
    const result = output.result;

    return reply.send({
      success: true,
      data: {
        dimensions: result.dimensions,
        palette: result.palette,
        totalCount: result.totalCount,
        colorCounts: result.colorCounts,
        // Return PNG as base64
        preview: output.previewPath
          ? `data:image/png;base64,${fs.readFileSync(output.previewPath).toString('base64')}`
          : null,
        stats: output.statsPath
          ? `data:image/png;base64,${fs.readFileSync(output.statsPath).toString('base64')}`
          : null,
        csv: output.csvPath ? fs.readFileSync(output.csvPath, 'utf-8') : null,
        json: JSON.stringify({
          dimensions: result.dimensions,
          palette: result.palette,
          totalCount: result.totalCount,
          colorCounts: result.colorCounts,
        }, null, 2),
      },
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ success: false, error: (err as Error).message });
  }
});

fastify.get('/health', async () => ({ status: 'ok' }));

const PORT = Number(process.env.PORT ?? 3002);
const HOST = process.env.HOST ?? '0.0.0.0';

fastify.listen({ port: PORT, host: HOST }, (err, addr) => {
  if (err) { fastify.log.error(err); process.exit(1); }
  fastify.log.info(`Perler Bead API listening on ${addr}`);
});
