/**
 * TIPTool: pixel-axe/upscale
 * Upscales images using AI-enhancement (via Pillow + numpy in WASM).
 * Always outputs PNG regardless of input format (PNG is lossless = best for upscaling).
 *
 * Consumes: image/png | image/jpeg | image/webp → Produces: image/png
 */

import type { TIPTool, TIPPayload } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { pixelAxeBridge } from '../../pixel-axe-bridge';

export const upscaleImageTool: TIPTool = {
  id: 'pixel-axe/upscale',
  name: 'Upscale Images',
  description: 'Upscale images to a larger size with quality enhancement. Always outputs PNG.',
  consumes: ['image/png', 'image/jpeg', 'image/webp'],
  produces: ['image/png'],

  configSchema: {
    fields: [
      {
        key: 'scaleFactor',
        label: 'Scale Factor',
        type: 'select',
        default: 2,
        options: [
          { label: '1.5×', value: 1.5 },
          { label: '2×',   value: 2   },
          { label: '3×',   value: 3   },
          { label: '4×',   value: 4   },
        ],
        description: 'How much larger to make the image.',
      },
      {
        key: 'enhance',
        label: 'Apply Enhancement',
        type: 'boolean',
        default: true,
        description: 'Apply auto-enhancement after upscaling.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Starting upscale...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No images to upscale');
    }

    const scaleFactor = config['scaleFactor'] as number;
    const enhance = config['enhance'] as boolean;

    const results = await Promise.all(
      input.payloads.map(async (payload: TIPPayload, i: number) => {
        hooks.onProgress(
          Math.round((i / input.payloads.length) * 90),
          `Upscaling image ${i + 1} of ${input.payloads.length}...`
        );

        if (hooks.signal.aborted) {
          throw new TIPError('CANCELLED', 'Cancelled during upscale');
        }

        const buffer = await payload.data.arrayBuffer();

        // Use compress action with resize_factor > 1 as the upscale mechanism
        // (pixel-axe Python side supports resize_factor for enlargement)
        const result = await pixelAxeBridge.execute('compress', {
          image_data: new Uint8Array(buffer),
          quality: 95,        // Maximum quality for upscaling
          format: 'png',      // Always output PNG (lossless)
          resize_factor: scaleFactor,
          enhance,
        }) as Uint8Array | number[] | { data?: Uint8Array | number[] };

        let outBytes: Uint8Array;
        if (result instanceof Uint8Array) {
          outBytes = result;
        } else if (Array.isArray(result)) {
          outBytes = new Uint8Array(result as number[]);
        } else if (result?.data) {
          const d = result.data;
          outBytes = d instanceof Uint8Array ? d : new Uint8Array(d as number[]);
        } else {
          throw new TIPError('EXECUTION_FAILED', `Upscale failed for ${payload.meta.filename}`);
        }

        const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'image/png' });
        // Rename: replace extension with .png
        const outName = payload.meta.filename.replace(/\.(jpe?g|webp|gif)$/i, '') + '.png';
        return createPayload(blob, 'image/png', outName);
      })
    );

    hooks.onProgress(100, 'Done');
    return createBundle(results, 'image/png');
  },
};
