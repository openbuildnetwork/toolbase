/**
 * TIPTool: pixel-axe/resize
 * Resizes images to a specified width × height, processing each payload.
 * Consumes: image/png | image/jpeg | image/webp → Produces: mirrors input type
 */

import type { TIPTool, TIPPayload } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { pixelAxeBridge } from '../../pixel-axe-bridge';

export const resizeImageTool: TIPTool = {
  id: 'pixel-axe/resize',
  name: 'Resize Images',
  description: 'Resize images to a specific width and height.',
  consumes: ['image/png', 'image/jpeg', 'image/webp'],
  produces: ['image/png', 'image/jpeg', 'image/webp'],

  configSchema: {
    fields: [
      {
        key: 'width',
        label: 'Width',
        type: 'number',
        default: 1920,
        min: 1,
        max: 8192,
        step: 1,
        unit: 'px',
      },
      {
        key: 'height',
        label: 'Height',
        type: 'number',
        default: 1080,
        min: 1,
        max: 8192,
        step: 1,
        unit: 'px',
      },
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 85,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        key: 'mode',
        label: 'Resize Mode',
        type: 'select',
        default: 'contain',
        options: [
          { label: 'Contain (letterbox)', value: 'contain' },
          { label: 'Stretch (exact fit)', value: 'stretch' },
        ],
        description: 'Contain = preserve aspect ratio. Stretch = exact dimensions.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Starting resize...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No images to resize');
    }

    const results = await Promise.all(
      input.payloads.map(async (payload: TIPPayload, i: number) => {
        hooks.onProgress(
          Math.round((i / input.payloads.length) * 90),
          `Resizing image ${i + 1} of ${input.payloads.length}...`
        );

        if (hooks.signal.aborted) {
          throw new TIPError('CANCELLED', 'Cancelled during image resize');
        }

        const buffer = await payload.data.arrayBuffer();
        const format = payload.contentType.split('/')[1] ?? 'png';

        const result = await pixelAxeBridge.execute('resize', {
          image_data: new Uint8Array(buffer),
          width:  config['width']   as number,
          height: config['height']  as number,
          quality: config['quality'] as number,
          format,
          mode: config['mode'] as string,
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
          throw new TIPError('EXECUTION_FAILED', `Resize failed for ${payload.meta.filename}`);
        }

        const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: payload.contentType });
        return createPayload(blob, payload.contentType, payload.meta.filename);
      })
    );

    hooks.onProgress(100, 'Done');
    return createBundle(results, input.contentType);
  },
};
