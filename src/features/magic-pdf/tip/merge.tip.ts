/**
 * TIPTool: magic-pdf/merge
 * Merges multiple PDFs in the input bundle into one combined PDF.
 * Consumes: application/pdf (bundle of N) → Produces: application/pdf (single)
 */

import type { TIPTool } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { magicPdfBridge } from '../../magic-pdf-bridge';

export const mergePdfTool: TIPTool = {
  id: 'magic-pdf/merge',
  name: 'Merge PDFs',
  description: 'Merge multiple PDF files into a single PDF document.',
  consumes: ['application/pdf'],
  produces: ['application/pdf'],

  configSchema: {
    fields: [], // No configuration required for merge
  },

  async invoke(input, _config, hooks) {
    hooks.onProgress(0, 'Reading PDFs...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No PDFs to merge');
    }

    // Read all payloads into Uint8Arrays
    const bytesArrays = await Promise.all(
      input.payloads.map(async (p, i) => {
        hooks.onProgress(
          Math.round((i / input.payloads.length) * 40),
          `Reading file ${i + 1} of ${input.payloads.length}...`
        );
        const buf = await p.data.arrayBuffer();
        return new Uint8Array(buf);
      })
    );

    hooks.onProgress(40, `Merging ${bytesArrays.length} PDFs...`);

    const result = await magicPdfBridge.execute('merge', {
      files_bytes: bytesArrays,
      file_bytes: bytesArrays[0], // Keep legacy single-file field for compat
    }) as { data?: Uint8Array | number[]; error?: string };

    if (!result?.data) {
      throw new TIPError('EXECUTION_FAILED', result?.error ?? 'Merge returned no data');
    }

    hooks.onProgress(90, 'Wrapping merged PDF...');

    const raw = result.data instanceof Uint8Array
      ? result.data
      : new Uint8Array(result.data as number[]);
    const blob = new Blob([raw.buffer as ArrayBuffer], { type: 'application/pdf' });

    // Derive a sensible output filename from the first input
    const baseName = input.payloads[0].meta.filename.replace(/\.pdf$/i, '');
    const outName = `${baseName}-merged.pdf`;

    hooks.onProgress(100, 'Done');
    return createBundle([createPayload(blob, 'application/pdf', outName)]);
  },
};
