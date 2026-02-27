/**
 * TIPTool: magic-pdf/split
 * Splits a PDF into individual pages (or custom ranges), returning a bundle of PDFs.
 * Consumes: application/pdf → Produces: application/pdf (bundle of N)
 */

import type { TIPTool } from '../../tip';
import { createBundle, createPayload } from '../../tip/bundle';
import { TIPError } from '../../tip/errors';
import { magicPdfBridge } from '../shared/magic-pdf-bridge';

export const splitPdfTool: TIPTool = {
  id: 'magic-pdf/split',
  name: 'Split PDF',
  description: 'Split a PDF into individual pages or custom page ranges.',
  consumes: ['application/pdf'],
  produces: ['application/pdf'],

  configSchema: {
    fields: [
      {
        key: 'pageRanges',
        label: 'Page Ranges',
        type: 'string',
        default: '',
        description:
          'Comma-separated ranges e.g. "1-3,5,7-9". Leave blank to split every page.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Preparing split...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No PDF payload to split');
    }

    const payload = input.payloads[0];
    const buffer = await payload.data.arrayBuffer();

    hooks.onProgress(20, 'Splitting PDF...');

    const result = await magicPdfBridge.execute('split', {
      file_bytes: new Uint8Array(buffer),
      page_ranges: config['pageRanges'] as string || '',
    }) as { data?: Array<Uint8Array | number[]>; error?: string };

    // The worker may return a list of page byte arrays or a single combined result
    const pages: Array<Uint8Array | number[]> = Array.isArray(result?.data)
      ? (result.data as Array<Uint8Array | number[]>)
      : result?.data
        ? [result.data as unknown as Uint8Array]
        : [];

    if (pages.length === 0) {
      throw new TIPError('EXECUTION_FAILED', result?.error ?? 'Split returned no pages');
    }

    hooks.onProgress(80, `Wrapping ${pages.length} page(s)...`);

    const baseName = payload.meta.filename.replace(/\.pdf$/i, '');
    const payloads = pages.map((page, i) => {
      const raw = page instanceof Uint8Array ? page : new Uint8Array(page);
      const blob = new Blob([raw.buffer as ArrayBuffer], { type: 'application/pdf' });
      return createPayload(blob, 'application/pdf', `${baseName}-page-${i + 1}.pdf`);
    });

    hooks.onProgress(100, 'Done');
    return createBundle(payloads, 'application/pdf');
  },
};
