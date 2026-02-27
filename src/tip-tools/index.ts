/**
 * TIP Master Registration
 *
 * Registers ALL TIP-compliant tools into TIPToolRegistry.
 * Call this once at app startup (src/app/layout.tsx).
 *
 * After this call:
 *   - TIPToolRegistry.getAll()  → returns all 12 tools
 *   - TIPToolRegistry.discoverPath('application/pdf', 'image/png') → works
 *   - Pipeline Builder step selector → shows only compatible tools
 */

import { TIPToolRegistry } from '../tip';
import { magicPdfTools }      from './magic-pdf';
import { pixelAxeTools }      from './pixel-axe';
import { base64Tools }        from './base64';
import { redactSecretsTools } from './redact-secrets';

let registered = false;

/**
 * Register all TIPTools. Safe to call multiple times —
 * subsequent calls are no-ops (guards against double-registration
 * from Next.js hot reload or React StrictMode).
 */
export function registerAllTIPTools(): void {
  if (registered) return;

  TIPToolRegistry.registerAll([
    ...magicPdfTools,      // 6 tools
    ...pixelAxeTools,      // 3 tools
    ...base64Tools,        // 2 tools
    ...redactSecretsTools, // 1 tool
  ]);

  registered = true;

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[TIP] Registered ${TIPToolRegistry.size()} tools:`,
      TIPToolRegistry.getAll().map((t) => t.id)
    );
  }
}

// Re-export tool arrays for consumers that want to import specific subsets
export { magicPdfTools, pixelAxeTools, base64Tools, redactSecretsTools };
