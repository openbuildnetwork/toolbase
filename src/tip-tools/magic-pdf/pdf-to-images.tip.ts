/**
 * TIPTool: magic-pdf/pdf-to-images
 * Converts each page of a PDF to a PNG image.
 * THIS IS THE BRIDGE — it's what makes PDF tools chain into pixel-axe tools.
 *
 * Consumes: application/pdf → Produces: image/png (one payload per page)
 */

import type { TIPTool } from '../../tip';
import { createBundle, createPayload } from '../../tip/bundle';
import { TIPError } from '../../tip/errors';
import { magicPdfBridge } from '../shared/magic-pdf-bridge';

export const pdfToImagesTool: TIPTool = {
  id: 'magic-pdf/pdf-to-images',
  name: 'PDF to Images',
  description: 'Convert each PDF page to a PNG image. Output is one image per page.',
  consumes: ['application/pdf'],
  produces: ['image/png'],

  configSchema: {
    fields: [
      {
        key: 'dpi',
        label: 'Resolution',
        type: 'number',
        default: 150,
        min: 72,
        max: 600,
        step: 1,
        unit: 'DPI',
        description: 'Higher DPI = sharper images, larger files.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Preparing PDF conversion...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No PDF payload to convert');
    }

    const payload = input.payloads[0];
    const buffer = await payload.data.arrayBuffer();

    hooks.onProgress(15, 'Rendering pages...');

    // Worker action for PDF to images is 'to_images' matching PdfAction type
    const result = await magicPdfBridge.execute('to_images', {
      file_bytes: new Uint8Array(buffer),
      dpi: config['dpi'] as number,
      image_format: 'png',
    }) as { images?: Array<Uint8Array | number[]>; data?: Uint8Array | number[]; error?: string };

    // Worker may return an `images` array (preferred) or a single `data` item
    const rawPages: Array<Uint8Array | number[]> = Array.isArray(result?.images)
      ? (result.images as Array<Uint8Array | number[]>)
      : result?.data
        ? [result.data as unknown as Uint8Array]
        : [];

    if (rawPages.length === 0) {
      throw new TIPError('EXECUTION_FAILED', result?.error ?? 'PDF-to-images returned no pages');
    }

    hooks.onProgress(80, `Wrapping ${rawPages.length} image(s)...`);

    const baseName = payload.meta.filename.replace(/\.pdf$/i, '');
    const payloads = rawPages.map((page, i) => {
      const raw = page instanceof Uint8Array ? page : new Uint8Array(page);
      const blob = new Blob([raw.buffer as ArrayBuffer], { type: 'image/png' });
      return createPayload(blob, 'image/png', `${baseName}-page-${i + 1}.png`);
    });

    hooks.onProgress(100, 'Done');
    // The bundle's dominant contentType is image/png — this is what unlocks pixel-axe chaining
    return createBundle(payloads, 'image/png');
  },
};
