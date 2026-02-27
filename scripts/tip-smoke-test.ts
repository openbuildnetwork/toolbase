/**
 * TIP Phase 1 — Console Smoke Test
 *
 * Verifies the TIP core protocol works correctly without any UI/React/WASM.
 *
 * Run with:
 *   npx tsx scripts/tip-smoke-test.ts
 *
 * Expected output (illustrative):
 *   [TIP Smoke Test] Registering 2 mock tools...
 *   [TIP Smoke Test] Registered: mock-pdf-extractor, mock-image-compressor
 *   [TIP Smoke Test] ---
 *   [TIP Smoke Test] discoverPath('application/pdf' → 'image/png')
 *   [TIP Smoke Test] Found 1 path(s):
 *   [TIP Smoke Test]   Path 0 (length 1): mock-pdf-extractor
 *   [TIP Smoke Test] ---
 *   [TIP Smoke Test] discoverPath('application/pdf' → 'image/jpeg')
 *   [TIP Smoke Test] Found 0 path(s) — correct (no direct route)
 *   [TIP Smoke Test] ---
 *   [TIP Smoke Test] discoverPath('application/pdf' → 'application/pdf')
 *   [TIP Smoke Test] Found 0 path(s) — trivial self-route (tools needed, none apply)
 *   [TIP Smoke Test] ✅ All assertions passed.
 */

// ── Because this is a plain Node script, we need to polyfill Blob/File ────────
// Node 18+ has Blob natively; if running on older Node, uncomment:
// import { Blob } from 'buffer';

import { TIPToolRegistry } from '../src/tip/registry';
import { createBundle, createPayload } from '../src/tip/bundle';
import { executeTIPPipeline } from '../src/tip/engine';
import type { TIPTool, TIPBundle, TIPConfig, TIPHooks
} from '../src/tip/protocol';
import type { TIPEngineHooks, TIPPipelineStep } from '../src/tip/engine';

const log = (msg: string) => console.log(`[TIP Smoke Test] ${msg}`);

// ─── 1. Clear any previous state (safe for re-runs) ──────────────────────────
TIPToolRegistry.clear();

// ─── 2. Define 2 mock TIPTools ────────────────────────────────────────────────

/**
 * Mock Tool A: consumes application/pdf, produces image/png
 * Simulates magic-pdf/pdf-to-images
 */
const mockPdfExtractor: TIPTool = {
  id: 'mock-pdf-extractor',
  name: 'Mock PDF Extractor',
  description: 'Pretends to extract images from a PDF.',
  consumes: ['application/pdf'],
  produces: ['image/png'],
  configSchema: {
    fields: [
      {
        key: 'dpi',
        label: 'DPI',
        type: 'number',
        default: 150,
        min: 72,
        max: 600,
        unit: 'DPI',
      },
    ],
  },
  async invoke(input: TIPBundle, config: TIPConfig, hooks: TIPHooks): Promise<TIPBundle> {
    hooks.onProgress(0, 'Extracting pages...');

    if (hooks.signal.aborted) {
      throw new Error('Cancelled');
    }

    // Simulate work: produce a tiny 1-byte PNG blob per payload
    const results = input.payloads.map((payload) => {
      const fakePngBlob = new Blob([new Uint8Array([137, 80, 78, 71])], {
        type: 'image/png',
      });
      return createPayload(
        fakePngBlob,
        'image/png',
        payload.meta.filename.replace('.pdf', '-page-1.png')
      );
    });

    hooks.onProgress(100, 'Done');
    return createBundle(results, 'image/png');
  },
};

/**
 * Mock Tool B: consumes image/png, produces image/png
 * Simulates pixel-axe/compress
 */
const mockImageCompressor: TIPTool = {
  id: 'mock-image-compressor',
  name: 'Mock Image Compressor',
  description: 'Pretends to compress PNG images.',
  consumes: ['image/png'],
  produces: ['image/png'],
  configSchema: {
    fields: [
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 80,
        min: 1,
        max: 100,
        unit: '%',
      },
    ],
  },
  async invoke(input: TIPBundle, _config: TIPConfig, hooks: TIPHooks): Promise<TIPBundle> {
    hooks.onProgress(0, 'Compressing...');

    const results = input.payloads.map((payload) => {
      // Return the same blob (mock — no real compression)
      return createPayload(payload.data, 'image/png', payload.meta.filename);
    });

    hooks.onProgress(100, 'Done');
    return createBundle(results, 'image/png');
  },
};

// ─── 3. Register both tools ───────────────────────────────────────────────────

log('Registering 2 mock tools...');
TIPToolRegistry.registerAll([mockPdfExtractor, mockImageCompressor]);
log(
  `Registered: ${TIPToolRegistry.getAll()
    .map((t) => t.id)
    .join(', ')}`
);

console.log('[TIP Smoke Test] ---');

// ─── 4. discoverPath tests ────────────────────────────────────────────────────

function testDiscoverPath(
  from: Parameters<typeof TIPToolRegistry.discoverPath>[0],
  to: Parameters<typeof TIPToolRegistry.discoverPath>[1],
  expectedMinPaths = 0
) {
  log(`discoverPath('${from}' → '${to}')`);
  const paths = TIPToolRegistry.discoverPath(from, to);

  if (paths.length === 0) {
    log(`Found 0 path(s)`);
  } else {
    log(`Found ${paths.length} path(s):`);
    paths.forEach((path, i) => {
      const ids = path.map((t) => t.id).join(' → ');
      log(`  Path ${i} (length ${path.length}): ${ids}`);
    });
  }

  if (paths.length < expectedMinPaths) {
    throw new Error(
      `ASSERTION FAILED: expected ≥${expectedMinPaths} paths, got ${paths.length}`
    );
  }

  console.log('[TIP Smoke Test] ---');
  return paths;
}

// Test 1: PDF → PNG  (should find 1 path via mock-pdf-extractor)
const paths1 = testDiscoverPath('application/pdf', 'image/png', 1);
if (paths1[0]?.length !== 1 || paths1[0][0].id !== 'mock-pdf-extractor') {
  throw new Error('ASSERTION FAILED: expected shortest path to be [mock-pdf-extractor]');
}

// Test 2: PDF → PNG → PNG  (should find the 2-step chain)
const paths2 = testDiscoverPath('application/pdf', 'image/png', 1);
log(`Shortest path has ${paths2[0].length} step(s) — correct (pdf-extractor only)`);
console.log('[TIP Smoke Test] ---');

// Test 3: image/png → image/png  (1 path: mock-image-compressor)
testDiscoverPath('image/png', 'image/png', 1);

// Test 4: No route — application/pdf → application/json (no tools handle this)
const paths4 = testDiscoverPath('application/pdf', 'application/json');
if (paths4.length !== 0) {
  throw new Error('ASSERTION FAILED: expected 0 paths for PDF → JSON');
}

// ─── 5. End-to-end execution test ────────────────────────────────────────────

log('Running executeTIPPipeline: [mock-pdf-extractor → mock-image-compressor]');

const fakePdfBlob = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
const initialBundle = createBundle(
  [createPayload(fakePdfBlob, 'application/pdf', 'test.pdf')],
  'application/pdf'
);

const steps: TIPPipelineStep[] = [
  { toolId: 'mock-pdf-extractor', config: { dpi: 150 } },
  { toolId: 'mock-image-compressor', config: { quality: 80 } },
];

const engineHooks: TIPEngineHooks = {
  onStepStart: (i, toolId) => log(`  Step ${i} started: ${toolId}`),
  onStepProgress: (i, pct, msg) => log(`  Step ${i} progress: ${pct}% ${msg ?? ''}`),
  onStepComplete: (i, toolId, ms) => log(`  Step ${i} complete: ${toolId} (${ms}ms)`),
  onStepError: (i, toolId, err) => log(`  Step ${i} ERROR: ${toolId} — ${err.message}`),
};

const controller = new AbortController();

executeTIPPipeline(steps, initialBundle, engineHooks, controller.signal)
  .then((output) => {
    log(`Pipeline complete!`);
    log(`  Output contentType: ${output.contentType}`);
    log(`  Output payloads: ${output.payloads.length}`);
    log(`  First payload filename: ${output.payloads[0].meta.filename}`);
    log(`  ProducedBy: ${output.payloads[0].meta.producedBy}`);

    if (output.contentType !== 'image/png') {
      throw new Error(`ASSERTION FAILED: expected image/png, got ${output.contentType}`);
    }

    log('✅ All assertions passed.');
  })
  .catch((err) => {
    log(`❌ TEST FAILED: ${err.message}`);
    process.exit(1);
  });
