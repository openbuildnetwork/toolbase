/**
 * TIPTool: base64/encode
 * Encodes any binary data (octet-stream) or text/plain into Base64 text.
 * Consumes: application/octet-stream | text/plain → Produces: text/plain
 */

import type { TIPTool } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { base64Bridge } from '../../base64-bridge';

export const base64EncodeTool: TIPTool = {
  id: 'base64/encode',
  name: 'Base64 Encode',
  description: 'Encode binary or text data as a Base64 string.',
  consumes: ['application/octet-stream', 'text/plain'],
  produces: ['text/plain'],

  configSchema: {
    fields: [
      {
        key: 'urlSafe',
        label: 'URL-Safe Encoding',
        type: 'boolean',
        default: false,
        description: 'Use URL-safe Base64 alphabet (replaces + and / with - and _).',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Encoding to Base64...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No data to encode');
    }

    const payload = input.payloads[0];
    const buffer = await payload.data.arrayBuffer();
    const bytes = Array.from(new Uint8Array(buffer));

    hooks.onProgress(20, 'Sending to Base64 engine...');

    const isText = payload.contentType === 'text/plain';
    const mode = isText ? 'text_encode' : 'file_encode';

    const result = await base64Bridge.process({
      mode,
      data: isText ? new TextDecoder().decode(new Uint8Array(bytes)) : bytes,
      url_safe: config['urlSafe'] as boolean,
    });

    if (!result.success || result.result === undefined) {
      throw new TIPError('EXECUTION_FAILED', result.error ?? 'Base64 encode failed');
    }

    hooks.onProgress(80, 'Wrapping result...');

    const encoded = typeof result.result === 'string'
      ? result.result
      : new TextDecoder().decode(new Uint8Array(result.result as number[]));

    const blob = new Blob([encoded], { type: 'text/plain' });
    const outName = `${payload.meta.filename}.b64.txt`;

    hooks.onProgress(100, 'Done');
    return createBundle([createPayload(blob, 'text/plain', outName)]);
  },
};
