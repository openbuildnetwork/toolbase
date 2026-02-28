/**
 * TIPTool: base64/decode
 * Decodes a Base64-encoded text payload back to binary data.
 * Consumes: text/plain → Produces: application/octet-stream
 */

import type { TIPTool } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { base64Bridge } from '../../base64-bridge';

export const base64DecodeTool: TIPTool = {
  id: 'base64/decode',
  name: 'Base64 Decode',
  description: 'Decode a Base64 string back to its original binary or text data.',
  consumes: ['text/plain'],
  produces: ['application/octet-stream'],

  configSchema: {
    fields: [
      {
        key: 'urlSafe',
        label: 'URL-Safe Decoding',
        type: 'boolean',
        default: false,
        description: 'Use URL-safe Base64 alphabet when decoding (- and _ instead of + and /).',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Decoding Base64...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No Base64 data to decode');
    }

    const payload = input.payloads[0];
    const text = await payload.data.text();

    hooks.onProgress(20, 'Sending to Base64 engine...');

    const result = await base64Bridge.process({
      mode: 'file_decode',
      data: text.trim(),
      url_safe: config['urlSafe'] as boolean,
    });

    if (!result.success || result.result === undefined) {
      throw new TIPError('EXECUTION_FAILED', result.error ?? 'Base64 decode failed');
    }

    hooks.onProgress(80, 'Wrapping decoded data...');

    const bytes = Array.isArray(result.result)
      ? new Uint8Array(result.result as number[])
      : new TextEncoder().encode(result.result as string);

    const blob = new Blob([bytes], { type: 'application/octet-stream' });

    // Strip the .b64.txt suffix if it was added by encode
    const outName = payload.meta.filename
      .replace(/\.b64\.txt$/i, '')
      .replace(/\.txt$/i, '');

    hooks.onProgress(100, 'Done');
    return createBundle([createPayload(blob, 'application/octet-stream', outName)]);
  },
};
