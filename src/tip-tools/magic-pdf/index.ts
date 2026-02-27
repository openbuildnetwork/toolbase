/**
 * magic-pdf TIPTools — index
 * Export all 6 tools and a combined array for registration.
 */

export { compressPdfTool }  from './compress.tip';
export { splitPdfTool }     from './split.tip';
export { mergePdfTool }     from './merge.tip';
export { protectPdfTool }   from './protect.tip';
export { pdfToImagesTool }  from './pdf-to-images.tip';
export { htmlToPdfTool }    from './html-to-pdf.tip';

import { compressPdfTool }  from './compress.tip';
import { splitPdfTool }     from './split.tip';
import { mergePdfTool }     from './merge.tip';
import { protectPdfTool }   from './protect.tip';
import { pdfToImagesTool }  from './pdf-to-images.tip';
import { htmlToPdfTool }    from './html-to-pdf.tip';
import type { TIPTool }     from '../../tip';

export const magicPdfTools: TIPTool[] = [
  compressPdfTool,
  splitPdfTool,
  mergePdfTool,
  protectPdfTool,
  pdfToImagesTool,
  htmlToPdfTool,
];
