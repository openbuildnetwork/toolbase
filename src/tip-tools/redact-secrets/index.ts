/**
 * redact-secrets TIPTools — index
 * Export the redact tool and a combined array for registration.
 */

export { redactSecretsTool } from './redact.tip';

import { redactSecretsTool } from './redact.tip';
import type { TIPTool }      from '../../tip';

export const redactSecretsTools: TIPTool[] = [
  redactSecretsTool,
];
