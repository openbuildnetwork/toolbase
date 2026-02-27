/**
 * pixel-axe TIPTools — index
 * Export all 3 tools and a combined array for registration.
 */

export { compressImageTool } from './compress.tip';
export { resizeImageTool }   from './resize.tip';
export { upscaleImageTool }  from './upscale.tip';

import { compressImageTool } from './compress.tip';
import { resizeImageTool }   from './resize.tip';
import { upscaleImageTool }  from './upscale.tip';
import type { TIPTool }      from '../../tip';

export const pixelAxeTools: TIPTool[] = [
  compressImageTool,
  resizeImageTool,
  upscaleImageTool,
];
