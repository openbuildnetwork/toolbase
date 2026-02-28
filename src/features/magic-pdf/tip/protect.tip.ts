/**
 * TIPTool: magic-pdf/protect
 * Password-protects a PDF using the magic-pdf worker.
 * Consumes: application/pdf → Produces: application/pdf
 */

import type { TIPTool } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { magicPdfBridge } from '../../magic-pdf-bridge';

export const protectPdfTool: TIPTool = {
  id: 'magic-pdf/protect',
  name: 'Protect PDF',
  description: 'Password-protect a PDF so it requires a password to open.',
  consumes: ['application/pdf'],
  produces: ['application/pdf'],

  configSchema: {
    fields: [
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        default: '',
        required: true,
        description: 'The password required to open the protected PDF.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Preparing PDF protection...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No PDF payload to protect');
    }

    const password = config['password'] as string;
    if (!password || password.trim() === '') {
      throw new TIPError('CONFIG_INVALID', 'A non-empty password is required for protect');
    }

    const payload = input.payloads[0];
    const buffer = await payload.data.arrayBuffer();

    hooks.onProgress(20, 'Applying password protection...');

    const result = await magicPdfBridge.execute('protect', {
      file_bytes: new Uint8Array(buffer),
      password: password.trim(),
    }) as { data?: Uint8Array | number[]; error?: string };

    if (!result?.data) {
      throw new TIPError('EXECUTION_FAILED', result?.error ?? 'Protect returned no data');
    }

    hooks.onProgress(90, 'Finalising...');

    const raw = result.data instanceof Uint8Array
      ? result.data
      : new Uint8Array(result.data as number[]);
    const blob = new Blob([raw.buffer as ArrayBuffer], { type: 'application/pdf' });

    const baseName = payload.meta.filename.replace(/\.pdf$/i, '');
    const outName = `${baseName}-protected.pdf`;

    hooks.onProgress(100, 'Done');
    return createBundle([createPayload(blob, 'application/pdf', outName)]);
  },
};
