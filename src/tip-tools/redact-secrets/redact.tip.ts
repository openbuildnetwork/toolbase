/**
 * TIPTool: redact-secrets/redact
 * Scans a text or JSON payload for secrets/PII and redacts them.
 *
 * Consumes: text/plain | application/json
 * Produces: text/plain | application/json  (mirrors input contentType)
 *
 * This tool proves TIP works for non-WASM pure-JS tools — the redact
 * worker is also Python/Pyodide but the TIPTool interface is identical.
 */

import type { TIPTool } from '../../tip';
import { createBundle, createPayload } from '../../tip/bundle';
import { TIPError } from '../../tip/errors';
import { redactBridge } from '../shared/redact-bridge';
import type { MaskingStyle } from '../../types/redact';

export const redactSecretsTool: TIPTool = {
  id: 'redact-secrets/redact',
  name: 'Redact Secrets',
  description: 'Scan and redact secrets, API keys, PII, and sensitive data from text or JSON.',
  consumes: ['text/plain', 'application/json'],
  produces: ['text/plain', 'application/json'],

  configSchema: {
    fields: [
      {
        key: 'maskingStyle',
        label: 'Masking Style',
        type: 'select',
        default: 'partial',
        options: [
          { label: 'Partial (show first/last chars)', value: 'partial' },
          { label: 'Full (replace entirely)',         value: 'full'    },
          { label: 'Hash (SHA-256 digest)',            value: 'hash'   },
        ],
        description: 'How redacted values are replaced in the output.',
      },
    ],
  },

  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Reading content...');

    if (input.payloads.length === 0) {
      throw new TIPError('EMPTY_BUNDLE', 'No content to redact');
    }

    const payload = input.payloads[0];
    const contentText = await payload.data.text();

    // Determine content type for the redact worker
    const isJson = payload.contentType === 'application/json';

    hooks.onProgress(20, 'Scanning for secrets...');

    const result = await redactBridge.redact({
      content: contentText,
      contentType: isJson ? 'file' : 'text',
      customConfigurations: {
        style: config['maskingStyle'] as MaskingStyle,
        userHints: {
          keys: [],
          literalTexts: [],
          regexPatterns: [],
        },
      },
    });

    if (!result.maskedContent) {
      throw new TIPError('EXECUTION_FAILED', 'Redaction returned no content');
    }

    hooks.onProgress(80, 'Wrapping redacted content...');

    // Mirror the input contentType in the output
    const outType = payload.contentType;
    const blob = new Blob([result.maskedContent], { type: outType });
    const baseName = payload.meta.filename.replace(/(\.[^.]+)$/, '-redacted$1');

    hooks.onProgress(100, `Done — ${result.summary.totalMasked} item(s) redacted`);
    return createBundle(
      [createPayload(blob, outType, baseName, { summary: result.summary })],
      outType
    );
  },
};
