/**
 * TIPTool: pixel-axe/compress
 * Compresses images (PNG/JPEG/WebP) in bulk, processing each payload individually.
 * Consumes: image/png | image/jpeg | image/webp → Produces: mirrors input type
 */

import type { TIPTool, TIPPayload } from '../../tip';
import { createBundle, createPayload } from '../../tip/bundle';
import { TIPError } from '../../tip/errors';
import { pixelAxeBridge } from '../shared/pixel-axe-bridge';

export const compressImageTool: TIPTool = {
  id: 'pixel-axe/compress',
  name: 'Compress Images',
  description: 'Compress PNG, JPEG, or WebP images to reduce file size.',
  consumes: ['image/png', 'image/jpeg', 'image/webp'],
  produces: ['image/png', 'image/jpeg', 'image/webp'],

  configSchema: {
    fields: [
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 80,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
        description: 'Higher = better quality, larger file.',
      },
      {
        key: 'enhance',
        label: 'Auto Enhance',
        type: 'boolean',
        default: false,
        description: 'Apply subtle auto-enhancement to contrast and sharpness.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Starting image compression...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No images to compress');
    }

    const quality = config['quality'] as number;
    const enhance = config['enhance'] as boolean;

    const results = await Promise.all(
      input.payloads.map(async (payload: TIPPayload, i: number) => {
        hooks.onProgress(
          Math.round((i / input.payloads.length) * 90),
          `Compressing image ${i + 1} of ${input.payloads.length}...`
        );

        if (hooks.signal.aborted) {
          throw new TIPError('CANCELLED', 'Cancelled during image compression');
        }

        const buffer = await payload.data.arrayBuffer();

        // Derive format from contentType for the Python worker
        const format = payload.contentType.split('/')[1] ?? 'png';

        const result = await pixelAxeBridge.execute('compress', {
          image_data: new Uint8Array(buffer),
          quality,
          format,
          resize_factor: 1.0,
          enhance,
        }) as Uint8Array | number[] | { data?: Uint8Array | number[] };

        // Worker can return raw bytes or wrapped object
        let outBytes: Uint8Array;
        if (result instanceof Uint8Array) {
          outBytes = result;
        } else if (Array.isArray(result)) {
          outBytes = new Uint8Array(result as number[]);
        } else if (result?.data) {
          const d = result.data;
          outBytes = d instanceof Uint8Array ? d : new Uint8Array(d as number[]);
        } else {
          throw new TIPError('EXECUTION_FAILED', `Compression failed for ${payload.meta.filename}`);
        }

        const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: payload.contentType });
        return createPayload(blob, payload.contentType, payload.meta.filename);
      })
    );

    hooks.onProgress(100, 'Done');
    return createBundle(results, input.contentType);
  },
};
