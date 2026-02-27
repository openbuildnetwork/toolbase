/**
 * base64 TIPTools — index
 * Export both tools and a combined array for registration.
 */

export { base64EncodeTool } from './encode.tip';
export { base64DecodeTool } from './decode.tip';

import { base64EncodeTool } from './encode.tip';
import { base64DecodeTool } from './decode.tip';
import type { TIPTool }     from '../../tip';

export const base64Tools: TIPTool[] = [
  base64EncodeTool,
  base64DecodeTool,
];
