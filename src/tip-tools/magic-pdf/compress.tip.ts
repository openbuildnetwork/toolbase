/**
 * TIPTool: magic-pdf/compress
 * Reduces PDF file size using PyMuPDF via the magic-pdf worker.
 * Consumes: application/pdf → Produces: application/pdf
 */

import type { TIPTool } from '../../tip';
import { createBundle, createPayload } from '../../tip/bundle';
import { TIPError } from '../../tip/errors';
import { magicPdfBridge } from '../shared/magic-pdf-bridge';

export const compressPdfTool: TIPTool = {
  id: 'magic-pdf/compress',
  name: 'Compress PDF',
  description: 'Reduce PDF file size while preserving quality.',
  consumes: ['application/pdf'],
  produces: ['application/pdf'],

  configSchema: {
    fields: [
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 75,
        min: 1,
        max: 100,
        step: 1,
        unit: '%',
        description: 'Higher = better quality, larger file.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Preparing compression...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No PDF payloads to compress');
    }

    const payload = input.payloads[0];
    const buffer = await payload.data.arrayBuffer();

    hooks.onProgress(20, 'Sending to engine...');

    const result = await magicPdfBridge.execute('compress', {
      file_bytes: new Uint8Array(buffer),
      quality: config['quality'] as number,
    }) as { data?: Uint8Array | number[]; error?: string };

    if (!result?.data) {
      throw new TIPError('EXECUTION_FAILED', result?.error ?? 'Compression returned no data');
    }

    hooks.onProgress(90, 'Wrapping result...');

    const raw = result.data instanceof Uint8Array
      ? result.data
      : new Uint8Array(result.data as number[]);
    const blob = new Blob([raw.buffer as ArrayBuffer], { type: 'application/pdf' });

    hooks.onProgress(100, 'Done');
    return createBundle([createPayload(blob, 'application/pdf', payload.meta.filename)]);
  },
};
