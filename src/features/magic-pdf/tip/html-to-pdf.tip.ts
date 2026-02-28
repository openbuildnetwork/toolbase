/**
 * TIPTool: magic-pdf/html-to-pdf
 * Converts an HTML document into a PDF file.
 * Consumes: text/html → Produces: application/pdf
 */

import type { TIPTool } from '@/tip';
import { createBundle, createPayload } from '@/tip/bundle';
import { TIPError } from '@/tip/errors';
import { magicPdfBridge } from '../../magic-pdf-bridge';

export const htmlToPdfTool: TIPTool = {
  id: 'magic-pdf/html-to-pdf',
  name: 'HTML to PDF',
  description: 'Convert an HTML document into a PDF file.',
  consumes: ['text/html'],
  produces: ['application/pdf'],

  configSchema: {
    fields: [
      {
        key: 'pageSize',
        label: 'Page Size',
        type: 'select',
        default: 'A4',
        options: [
          { label: 'A4', value: 'A4' },
          { label: 'Letter', value: 'Letter' },
          { label: 'Legal', value: 'Legal' },
        ],
        description: 'Paper size for the output PDF.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Reading HTML...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No HTML payload to convert');
    }

    const payload = input.payloads[0];

    // HTML data is text — read as text string
    const htmlText = await payload.data.text();

    // Encode as UTF-8 bytes for the worker
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(htmlText);

    hooks.onProgress(20, 'Converting HTML to PDF...');

    const result = await magicPdfBridge.execute('html_to_pdf', {
      file_bytes: htmlBytes,
      page_size: config['pageSize'] as string,
    }) as { data?: Uint8Array | number[]; error?: string };

    if (!result?.data) {
      throw new TIPError('EXECUTION_FAILED', result?.error ?? 'HTML-to-PDF returned no data');
    }

    hooks.onProgress(90, 'Finalising PDF...');

    const raw = result.data instanceof Uint8Array
      ? result.data
      : new Uint8Array(result.data as number[]);
    const blob = new Blob([raw.buffer as ArrayBuffer], { type: 'application/pdf' });

    // Derive output filename from input (swap .html → .pdf)
    const outName = payload.meta.filename.replace(/\.html?$/i, '') + '.pdf';

    hooks.onProgress(100, 'Done');
    return createBundle([createPayload(blob, 'application/pdf', outName)]);
  },
};
