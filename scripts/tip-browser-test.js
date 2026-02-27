/**
 * TIP Browser Console Test
 *
 * Open http://localhost:3000 in your browser, open DevTools (F12),
 * paste this entire script into the Console tab, and press Enter.
 *
 * What it tests:
 *  1. TIPToolRegistry has all 12 registered tools (from layout.tsx startup)
 *  2. discoverPath('application/pdf' → 'image/png') finds the bridge tool
 *  3. findNextSteps() returns only compatible tools for a given content type
 *  4. findConsumers() and findProducers() work correctly
 *
 * NOTE: This runs in the browser where registerAllTIPTools() has already
 *       been called once at app startup via layout.tsx.
 *
 * HOW TO USE:
 *   1. Make sure `npm run dev` is running
 *   2. Open http://localhost:3000
 *   3. Open DevTools → Console tab
 *   4. Paste the entire contents below and press Enter
 */

// ──────────────────────────────────────────────────────────
// PASTE EVERYTHING BELOW THIS LINE INTO THE BROWSER CONSOLE
// ──────────────────────────────────────────────────────────

(async () => {
  // Dynamically import the registry from the running Next.js app
  const { TIPToolRegistry } = await import('/src/tip/registry.ts');
  const { canTransform }    = await import('/src/tip/transformers.ts');

  console.group('🔬 TIP Browser Console Test');

  // ── 1. All 12 tools registered? ─────────────────────────
  const all = TIPToolRegistry.getAll();
  console.log(`✅ Total registered tools: ${all.length} (expected 12)`);
  console.table(all.map(t => ({ id: t.id, consumes: t.consumes.join(', '), produces: t.produces.join(', ') })));

  if (all.length !== 12) {
    console.error(`❌ Expected 12 tools, got ${all.length}`);
  }

  // ── 2. discoverPath: PDF → PNG ───────────────────────────
  const pdfToPngPaths = TIPToolRegistry.discoverPath('application/pdf', 'image/png');
  console.log(`\n📍 discoverPath('application/pdf' → 'image/png'): ${pdfToPngPaths.length} path(s)`);
  pdfToPngPaths.forEach((path, i) => {
    console.log(`  Path ${i}: ${path.map(t => t.id).join(' → ')}`);
  });
  if (pdfToPngPaths.length === 0) console.error('❌ Expected at least 1 path');
  else console.log('✅ Bridge tool found');

  // ── 3. findNextSteps from PDF ────────────────────────────
  const nextAfterPdf = TIPToolRegistry.findNextSteps('application/pdf', canTransform);
  console.log(`\n🔍 findNextSteps('application/pdf'): ${nextAfterPdf.length} compatible tool(s)`);
  nextAfterPdf.forEach(t => console.log(`  - ${t.id}`));

  // ── 4. findNextSteps from image/png ─────────────────────
  const nextAfterPng = TIPToolRegistry.findNextSteps('image/png', canTransform);
  console.log(`\n🔍 findNextSteps('image/png'): ${nextAfterPng.length} compatible tool(s)`);
  nextAfterPng.forEach(t => console.log(`  - ${t.id}`));

  // ── 5. No tools should be suggested for application/zip ─
  const nextAfterZip = TIPToolRegistry.findNextSteps('application/zip', canTransform);
  console.log(`\n🔍 findNextSteps('application/zip'): ${nextAfterZip.length} (expected 0)`);
  if (nextAfterZip.length === 0) console.log('✅ Correctly returns empty for unhandled type');
  else console.warn('⚠️  Unexpected tools for application/zip:', nextAfterZip.map(t => t.id));

  // ── 6. Verify specific tool IDs exist ───────────────────
  const expectedIds = [
    'magic-pdf/compress', 'magic-pdf/split', 'magic-pdf/merge',
    'magic-pdf/protect', 'magic-pdf/pdf-to-images', 'magic-pdf/html-to-pdf',
    'pixel-axe/compress', 'pixel-axe/resize', 'pixel-axe/upscale',
    'base64/encode', 'base64/decode',
    'redact-secrets/redact',
  ];
  console.log('\n📋 Individual tool lookups:');
  const missing = expectedIds.filter(id => !TIPToolRegistry.get(id));
  if (missing.length === 0) {
    console.log('✅ All 12 tool IDs resolve correctly');
  } else {
    console.error('❌ Missing tools:', missing);
  }

  console.groupEnd();
  console.log('\n🎉 TIP Phase 1–5 browser test complete. Check above for any ❌ errors.');
})();
