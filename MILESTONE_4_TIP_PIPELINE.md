# GSD Milestone 4 — Redesigned Around TIP
## Toolbase Interoperability Protocol (TIP/1.0) + Pipeline Builder

> **Mission:** Design and implement a universal communication protocol that any Toolbase tool
> speaks — making every tool automatically chainable with every other tool, forever,
> without writing custom adapters.
>
> **Protocol Name:** TIP — Toolbase Interoperability Protocol
> **Protocol Version:** 1.0
> **Core Promise:** Privacy. Security. Free for all. Premium-rich UX.
> **Status:** IN PROGRESS
> **Depends On:** Milestone 1 (Foundation) ✅, Milestone 3 (Wow Factor) ✅

---

## SPEC STATUS: FINALIZED
> ⚠️ No code may be written until this spec is FINALIZED.

---

## The Big Idea

Most tool platforms are a collection of islands. Tools don't know about each other.
Every integration is custom. Every chain is hand-wired.

TIP makes Toolbase an **ocean** those tools float in.

Every tool speaks one language. The protocol handles discovery, compatibility,
type negotiation, and execution. A contributor adding Tool #50 gets chaining
with all 49 existing tools for free — without writing a single adapter.

```
Before TIP:                         After TIP:

magic-pdf ←→ pixel-axe              magic-pdf
  (custom adapter)                  pixel-axe       ← all speak TIP
                                    data-lens        ← all auto-chainable
magic-pdf ←→ data-lens              redact-secrets   ← forever
  (another custom adapter)          [any future tool]
  
  O(n²) complexity                  O(n) complexity
  Breaks with every new tool        Scales to infinity
```

---

## Protocol Philosophy

1. **Blobs are the universal currency.** Every payload carries a `Blob`.
   Binary-safe, lazy, transferable, File extends Blob — zero-cost uploads.

2. **MIME types are the universal language.** `application/pdf`, `image/png`,
   `text/csv` — every developer already knows them. No new vocabulary.

3. **Bundles, not singles.** Every invocation receives and returns a `TIPBundle`
   (always an array). Single file = bundle of one. Tools never branch on
   "am I getting one file or many?" — they always get a bundle.

4. **The protocol is pure.** No UI. No workers. No Next.js. Just TypeScript
   interfaces and logic. It could power a CLI, a Node script, or a future
   desktop app without changing a line.

5. **Tools are dumb, the engine is smart.** Tools declare what they consume
   and produce. The engine figures out routing, compatibility, and coercions.

6. **Contributor-first design.** A new contributor should be able to read
   `TIP.md` and implement a compliant tool in under an hour.

---

## Folder Structure

```
src/
  tip/                              ← The Protocol (framework-agnostic)
    protocol.ts                     ← Core types: TIPPayload, TIPBundle, TIPTool
    bundle.ts                       ← Bundle creation helpers
    registry.ts                     ← TIPToolRegistry — register + discover tools
    engine.ts                       ← TIPEngine — execute pipelines
    transformers.ts                 ← TIPTransformer — type coercion registry
    validators.ts                   ← Validate bundles, configs, pipeline defs
    errors.ts                       ← TIPError — standard error shapes
    version.ts                      ← TIP_VERSION constant
    index.ts                        ← Public API barrel export
    TIP.md                          ← Human-readable protocol spec for contributors

  tip-tools/                        ← TIP-compliant tool implementations
    magic-pdf/
      compress.tip.ts
      split.tip.ts
      merge.tip.ts
      protect.tip.ts
      pdf-to-images.tip.ts
      html-to-pdf.tip.ts
      index.ts
    pixel-axe/
      compress.tip.ts
      resize.tip.ts
      upscale.tip.ts
      index.ts
    base64/
      encode.tip.ts
      decode.tip.ts
      index.ts
    redact-secrets/
      redact.tip.ts
      index.ts
    index.ts                        ← Registers ALL tip-tools into the registry

  app/tools/pipeline/
    page.tsx
    layout.tsx
    README.md

  components/features/pipeline/
    PipelineBuilder.tsx
    PipelineStep.tsx
    StepConfigPanel.tsx
    StepSelector.tsx
    PipelineProgress.tsx
    PipelineOutput.tsx
    PipelineGraph.tsx               ← Visual read-only graph of the pipeline
    PresetSelector.tsx

  config/
    pipeline-presets.ts             ← Preset pipeline definitions

  hooks/
    usePipelineEngine.ts            ← React hook wrapping TIPEngine
    usePipelines.ts                 ← Save/load/export/import pipelines

  types/
    pipeline.ts                     ← PipelineDefinition, PipelineStep, etc.
```

---

## Phase 1 — The TIP Protocol Core

**Goal:** Define the complete protocol. Pure TypeScript. No dependencies. No UI.

---

### 1a — `src/tip/version.ts`

```typescript
export const TIP_VERSION = '1.0' as const;
export type TIPVersion = typeof TIP_VERSION;
```

---

### 1b — `src/tip/protocol.ts` — The Heart of TIP

```typescript
import { TIP_VERSION, TIPVersion } from './version';

// ─── Content Types ───────────────────────────────────────────────────────────
// Standard MIME types. Every developer already knows these.
// Add new types here as Toolbase grows.

export const TIP_CONTENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/zip',
  'application/octet-stream', // binary fallback
] as const;

export type TIPContentType = (typeof TIP_CONTENT_TYPES)[number];

// ─── Payload ─────────────────────────────────────────────────────────────────
// A single unit of data flowing through the protocol.
// Always a Blob. Always has a contentType. Always has meta.

export interface TIPPayload {
  /** What kind of data this is */
  contentType: TIPContentType;

  /** The data itself — always a Blob */
  data: Blob;

  /** Metadata about this payload */
  meta: TIPPayloadMeta;
}

export interface TIPPayloadMeta {
  /** Original or derived filename */
  filename: string;

  /** File size in bytes */
  sizeBytes: number;

  /** Full MIME type (may include charset etc.) */
  mimeType: string;

  /** Which TIP tool produced this payload */
  producedBy?: string;

  /** How long the producing tool took in ms */
  durationMs?: number;

  /** Protocol version that produced this */
  tipVersion?: TIPVersion;

  /** Arbitrary extra metadata — for tool-specific needs */
  extra?: Record<string, unknown>;
}

// ─── Bundle ──────────────────────────────────────────────────────────────────
// Tools always receive and return a TIPBundle.
// Single file = bundle of one. This eliminates all "one vs many" branching.

export interface TIPBundle {
  /** Always an array. Single file = array of length 1. */
  payloads: TIPPayload[];

  /** Convenience: the dominant content type in this bundle */
  contentType: TIPContentType;

  /** Bundle-level metadata */
  meta: TIPBundleMeta;
}

export interface TIPBundleMeta {
  /** Total number of payloads */
  count: number;

  /** Total bytes across all payloads */
  totalSizeBytes: number;

  /** Protocol version */
  tipVersion: TIPVersion;

  /** When this bundle was created */
  createdAt: string;
}

// ─── Config Schema ───────────────────────────────────────────────────────────
// A minimal JSON-Schema-inspired config system.
// Simple enough for contributors to write, rich enough for the UI to auto-render.

export type TIPConfigFieldType = 'number' | 'string' | 'boolean' | 'select' | 'password';

export interface TIPConfigField {
  key: string;
  label: string;
  type: TIPConfigFieldType;
  default: string | number | boolean;
  required?: boolean;
  description?: string;

  // For 'number' type
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // e.g. 'DPI', '%', 'px'

  // For 'select' type
  options?: Array<{ label: string; value: string | number }>;
}

export interface TIPConfigSchema {
  fields: TIPConfigField[];
}

export type TIPConfig = Record<string, string | number | boolean>;

// ─── Hooks ───────────────────────────────────────────────────────────────────
// Standard hooks every tool receives during invocation.
// Progress, logging, and cancellation — the same for every tool.

export interface TIPHooks {
  /** Report progress 0-100 */
  onProgress: (percent: number, message?: string) => void;

  /** Structured logging */
  onLog: (message: string, level: 'info' | 'warn' | 'error') => void;

  /** Cancellation signal — tools should respect this */
  signal: AbortSignal;
}

// ─── The Tool Interface ───────────────────────────────────────────────────────
// Every tool in Toolbase implements this interface.
// This is the entire contract. Nothing more is required.

export interface TIPTool {
  /** Unique identifier — kebab-case, matches adapterId in pipelines */
  id: string;

  /** Human-readable name */
  name: string;

  /** One-sentence description */
  description: string;

  /** Content types this tool can receive */
  consumes: TIPContentType[];

  /** Content types this tool will produce */
  produces: TIPContentType[];

  /** Config schema — drives the auto-rendered UI */
  configSchema: TIPConfigSchema;

  /**
   * The invocation function.
   * Receives a bundle, returns a bundle.
   * Always async. Always cancellable via hooks.signal.
   */
  invoke(
    input: TIPBundle,
    config: TIPConfig,
    hooks: TIPHooks
  ): Promise<TIPBundle>;
}
```

---

### 1c — `src/tip/bundle.ts` — Bundle Helpers

```typescript
import { TIPBundle, TIPContentType, TIPPayload, TIP_VERSION } from './protocol';

/** Create a TIPPayload from a Blob */
export function createPayload(
  data: Blob,
  contentType: TIPContentType,
  filename: string,
  extra?: Record<string, unknown>
): TIPPayload {
  return {
    contentType,
    data,
    meta: {
      filename,
      sizeBytes: data.size,
      mimeType: data.type || contentType,
      tipVersion: TIP_VERSION,
      extra,
    },
  };
}

/** Wrap one or more payloads into a TIPBundle */
export function createBundle(
  payloads: TIPPayload[],
  contentType?: TIPContentType
): TIPBundle {
  const dominant = contentType ?? payloads[0]?.contentType ?? 'application/octet-stream';
  return {
    payloads,
    contentType: dominant,
    meta: {
      count: payloads.length,
      totalSizeBytes: payloads.reduce((sum, p) => sum + p.meta.sizeBytes, 0),
      tipVersion: TIP_VERSION,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Create a bundle from a single File (from a file input / drop zone) */
export function bundleFromFile(file: File): TIPBundle {
  const contentType = file.type as TIPContentType || 'application/octet-stream';
  return createBundle([
    createPayload(file, contentType, file.name)
  ]);
}

/** Create a bundle from multiple Files */
export function bundleFromFiles(files: File[]): TIPBundle {
  const payloads = files.map(f =>
    createPayload(f, (f.type as TIPContentType) || 'application/octet-stream', f.name)
  );
  return createBundle(payloads);
}

/** Extract the single Blob from a bundle (asserts count === 1) */
export function unwrapSingle(bundle: TIPBundle): Blob {
  if (bundle.payloads.length !== 1) {
    throw new Error(`Expected single payload, got ${bundle.payloads.length}`);
  }
  return bundle.payloads[0].data;
}

/** Stamp a bundle with producer info and timing */
export function stampBundle(
  bundle: TIPBundle,
  producedBy: string,
  durationMs: number
): TIPBundle {
  return {
    ...bundle,
    payloads: bundle.payloads.map(p => ({
      ...p,
      meta: { ...p.meta, producedBy, durationMs },
    })),
  };
}
```

---

### 1d — `src/tip/errors.ts` — Standard Error Shapes

```typescript
export type TIPErrorCode =
  | 'TYPE_MISMATCH'        // tool cannot consume the bundle's contentType
  | 'CONFIG_INVALID'       // required config field missing or out of range
  | 'EXECUTION_FAILED'     // tool's invoke() threw
  | 'CANCELLED'            // AbortSignal was triggered
  | 'TOOL_NOT_FOUND'       // pipeline references unknown tool ID
  | 'EMPTY_BUNDLE'         // bundle has zero payloads
  | 'COERCION_FAILED'      // type transformer failed
  | 'PIPELINE_INVALID';    // pipeline definition is malformed

export class TIPError extends Error {
  constructor(
    public readonly code: TIPErrorCode,
    message: string,
    public readonly stepIndex?: number,
    public readonly toolId?: string,
  ) {
    super(message);
    this.name = 'TIPError';
  }
}
```

---

### 1e — `src/tip/transformers.ts` — Type Coercion Registry

```typescript
import { TIPBundle, TIPContentType } from './protocol';

// A transformer converts a bundle of one type into another
// e.g. text/csv → application/json for tools that need JSON
export interface TIPTransformer {
  from: TIPContentType;
  to: TIPContentType;
  transform: (bundle: TIPBundle) => Promise<TIPBundle>;
}

const transformers: TIPTransformer[] = [];

export function registerTransformer(t: TIPTransformer): void {
  transformers.push(t);
}

export function findTransformer(
  from: TIPContentType,
  to: TIPContentType
): TIPTransformer | undefined {
  return transformers.find(t => t.from === from && t.to === to);
}

export function canTransform(from: TIPContentType, to: TIPContentType): boolean {
  return !!findTransformer(from, to);
}
```

---

### 1f — `src/tip/registry.ts` — Tool Registry

```typescript
import { TIPTool, TIPContentType } from './protocol';

const tools = new Map<string, TIPTool>();

export const TIPToolRegistry = {
  /** Register a TIP-compliant tool */
  register(tool: TIPTool): void {
    if (tools.has(tool.id)) {
      console.warn(`TIP: Tool "${tool.id}" is already registered. Overwriting.`);
    }
    tools.set(tool.id, tool);
  },

  /** Register multiple tools at once */
  registerAll(toolList: TIPTool[]): void {
    toolList.forEach(t => this.register(t));
  },

  /** Get a tool by ID */
  get(id: string): TIPTool | undefined {
    return tools.get(id);
  },

  /** Get all registered tools */
  getAll(): TIPTool[] {
    return Array.from(tools.values());
  },

  /** Find all tools that can consume a given content type */
  findConsumers(contentType: TIPContentType): TIPTool[] {
    return this.getAll().filter(t => t.consumes.includes(contentType));
  },

  /** Find all tools that produce a given content type */
  findProducers(contentType: TIPContentType): TIPTool[] {
    return this.getAll().filter(t => t.produces.includes(contentType));
  },

  /**
   * THE MAGIC FUNCTION.
   * Given the current bundle's contentType, what tools can come next?
   * Checks direct compatibility AND available transformers.
   */
  findNextSteps(
    currentContentType: TIPContentType,
    canTransform: (from: TIPContentType, to: TIPContentType) => boolean
  ): TIPTool[] {
    return this.getAll().filter(tool =>
      tool.consumes.some(
        accepted =>
          accepted === currentContentType ||
          canTransform(currentContentType, accepted)
      )
    );
  },

  /**
   * AUTO-DISCOVER PIPELINE.
   * Given a start type and target type, find a valid path through tools.
   * BFS — finds the shortest valid chain.
   */
  discoverPath(
    from: TIPContentType,
    to: TIPContentType,
    maxDepth = 5
  ): TIPTool[][] {
    const queue: Array<{ path: TIPTool[]; currentType: TIPContentType }> = [
      { path: [], currentType: from },
    ];
    const results: TIPTool[][] = [];

    while (queue.length > 0) {
      const { path, currentType } = queue.shift()!;
      if (path.length >= maxDepth) continue;

      const candidates = this.findConsumers(currentType);
      for (const tool of candidates) {
        const newPath = [...path, tool];
        for (const outputType of tool.produces) {
          if (outputType === to) {
            results.push(newPath);
          } else {
            queue.push({ path: newPath, currentType: outputType });
          }
        }
      }
    }

    // Sort by path length — shortest first
    return results.sort((a, b) => a.length - b.length);
  },
};
```

---

### 1g — `src/tip/engine.ts` — The Execution Engine

```typescript
import { TIPBundle, TIPConfig, TIPHooks } from './protocol';
import { TIPToolRegistry } from './registry';
import { findTransformer } from './transformers';
import { TIPError } from './errors';
import { stampBundle } from './bundle';

export interface TIPPipelineStep {
  toolId: string;
  config: TIPConfig;
}

export interface TIPEngineHooks {
  onStepStart:    (stepIndex: number, toolId: string) => void;
  onStepProgress: (stepIndex: number, percent: number, message?: string) => void;
  onStepComplete: (stepIndex: number, toolId: string, durationMs: number) => void;
  onStepError:    (stepIndex: number, toolId: string, error: TIPError) => void;
}

export async function executeTIPPipeline(
  steps: TIPPipelineStep[],
  initialBundle: TIPBundle,
  engineHooks: TIPEngineHooks,
  signal: AbortSignal
): Promise<TIPBundle> {
  let current = initialBundle;

  for (let i = 0; i < steps.length; i++) {
    // Check cancellation before each step
    if (signal.aborted) {
      throw new TIPError('CANCELLED', 'Pipeline cancelled by user', i);
    }

    const step = steps[i];
    const tool = TIPToolRegistry.get(step.toolId);

    if (!tool) {
      throw new TIPError('TOOL_NOT_FOUND', `Tool "${step.toolId}" is not registered`, i, step.toolId);
    }

    // Check type compatibility — direct or via transformer
    const canConsumeDirect = tool.consumes.includes(current.contentType);
    const transformer = !canConsumeDirect
      ? tool.consumes.reduce<ReturnType<typeof findTransformer>>(
          (found, accepted) => found ?? findTransformer(current.contentType, accepted),
          undefined
        )
      : undefined;

    if (!canConsumeDirect && !transformer) {
      throw new TIPError(
        'TYPE_MISMATCH',
        `Tool "${tool.name}" cannot consume "${current.contentType}". ` +
        `It accepts: ${tool.consumes.join(', ')}`,
        i,
        step.toolId
      );
    }

    // Apply transformer if needed
    if (transformer) {
      current = await transformer.transform(current);
    }

    engineHooks.onStepStart(i, step.toolId);
    const start = performance.now();

    // Build per-step hooks
    const stepHooks: TIPHooks = {
      onProgress: (percent, message) => engineHooks.onStepProgress(i, percent, message),
      onLog: (message, level) => {
        if (level === 'error') console.error(`[TIP][${tool.id}]`, message);
        else console.log(`[TIP][${tool.id}]`, message);
      },
      signal,
    };

    try {
      const result = await tool.invoke(current, step.config, stepHooks);
      const durationMs = Math.round(performance.now() - start);

      // Stamp the output with producer info
      current = stampBundle(result, tool.id, durationMs);

      engineHooks.onStepComplete(i, step.toolId, durationMs);
    } catch (err) {
      const tipError = err instanceof TIPError
        ? err
        : new TIPError('EXECUTION_FAILED', String(err), i, step.toolId);
      engineHooks.onStepError(i, step.toolId, tipError);
      throw tipError;
    }
  }

  return current;
}
```

---

### 1h — `src/tip/index.ts` — Public API

```typescript
// Everything a tool implementer or UI component needs
export * from './version';
export * from './protocol';
export * from './bundle';
export * from './errors';
export * from './registry';
export * from './engine';
export * from './transformers';
```

---

### 1i — `src/tip/TIP.md` — The Contributor Spec

This is the human-readable protocol documentation. Every contributor reads this
before implementing a tool. Keep it short, clear, and example-driven.

**Contents:**
1. What is TIP?
2. The 5 core concepts (Payload, Bundle, Tool, Registry, Engine)
3. How to implement a TIPTool (with a complete worked example)
4. How to register your tool
5. How to handle arrays (bundles of > 1 payload)
6. Config schema reference
7. Error handling guide
8. The `TIPHooks` contract (progress, logging, cancellation)

**Acceptance Criteria Phase 1:**
- [ ] All 8 files created (`version`, `protocol`, `bundle`, `errors`, `transformers`, `registry`, `engine`, `index`)
- [ ] `TIP.md` written — a new contributor can implement a tool by reading it alone
- [ ] Zero dependencies on Next.js, React, or any UI framework
- [ ] Zero dependencies on Pyodide or any WASM runtime
- [ ] All types exported cleanly from `src/tip/index.ts`
- [ ] `TIPToolRegistry.discoverPath()` correctly finds routes between content types in a unit test

---

## Phase 2 — TIP-Compliant magic-pdf Tools

**Goal:** Implement all magic-pdf operations as TIPTools.
**Rule:** Each `.tip.ts` file calls the existing worker. Zero new PDF logic.

**File:** `src/tip-tools/magic-pdf/compress.tip.ts`

**Pattern every magic-pdf TIPTool follows:**

```typescript
import { TIPTool } from '../../tip';
import { createBundle, createPayload } from '../../tip/bundle';

export const compressPdfTool: TIPTool = {
  id: 'magic-pdf/compress',
  name: 'Compress PDF',
  description: 'Reduce PDF file size while preserving quality.',
  consumes: ['application/pdf'],
  produces: ['application/pdf'],
  configSchema: {
    fields: [
      {
        key: 'quality',
        label: 'Quality',
        type: 'number',
        default: 75,
        min: 1,
        max: 100,
        unit: '%',
        description: 'Higher = better quality, larger file',
      },
    ],
  },
  async invoke(input, config, hooks) {
    hooks.onProgress(0, 'Starting compression...');

    // Call the existing magic-pdf worker
    // (same call you already make from useMagicPdfWorker)
    const result = await callMagicPdfWorker('compress', {
      file: input.payloads[0].data,
      quality: config.quality as number,
      signal: hooks.signal,
      onProgress: hooks.onProgress,
    });

    hooks.onProgress(100, 'Done');

    return createBundle([
      createPayload(result, 'application/pdf', input.payloads[0].meta.filename)
    ]);
  },
};
```

**Tools to implement:**

| File | TIPTool ID | Consumes | Produces |
|---|---|---|---|
| `compress.tip.ts` | `magic-pdf/compress` | `application/pdf` | `application/pdf` |
| `split.tip.ts` | `magic-pdf/split` | `application/pdf` | `application/pdf` (bundle of N) |
| `merge.tip.ts` | `magic-pdf/merge` | `application/pdf` (bundle) | `application/pdf` |
| `protect.tip.ts` | `magic-pdf/protect` | `application/pdf` | `application/pdf` |
| `pdf-to-images.tip.ts` | `magic-pdf/pdf-to-images` | `application/pdf` | `image/png` ← **THE BRIDGE** |
| `html-to-pdf.tip.ts` | `magic-pdf/html-to-pdf` | `text/html` | `application/pdf` |

**Acceptance Criteria:**
- [ ] All 6 TIPTools implemented
- [ ] Each calls existing worker — no new PDF logic
- [ ] `magic-pdf/pdf-to-images` returns `image/png` bundle with one payload per page
- [ ] All registered in `src/tip-tools/magic-pdf/index.ts`

---

## Phase 3 — TIP-Compliant pixel-axe Tools

**Tools to implement:**

| File | TIPTool ID | Consumes | Produces |
|---|---|---|---|
| `compress.tip.ts` | `pixel-axe/compress` | `image/png`, `image/jpeg`, `image/webp` | mirrors input |
| `resize.tip.ts` | `pixel-axe/resize` | `image/png`, `image/jpeg`, `image/webp` | mirrors input |
| `upscale.tip.ts` | `pixel-axe/upscale` | `image/png`, `image/jpeg`, `image/webp` | `image/png` |

**Key pattern — handling multi-image bundles:**
```typescript
// pixel-axe tools process EACH payload in the bundle
async invoke(input, config, hooks) {
  const results = await Promise.all(
    input.payloads.map(async (payload, i) => {
      hooks.onProgress(
        Math.round((i / input.payloads.length) * 100),
        `Processing image ${i + 1} of ${input.payloads.length}`
      );
      const result = await callPixelAxeWorker('compress', {
        file: payload.data,
        quality: config.quality as number,
        signal: hooks.signal,
      });
      return createPayload(result, payload.contentType, payload.meta.filename);
    })
  );
  return createBundle(results);
}
```

**Acceptance Criteria:**
- [ ] All 3 TIPTools implemented
- [ ] Multi-image bundles processed correctly (one output per input)
- [ ] Progress reported per image in a multi-image bundle
- [ ] All registered in `src/tip-tools/pixel-axe/index.ts`

---

## Phase 4 — TIP-Compliant base64 + redact-secrets Tools

**Why include these now?** Because implementing TIP for base64 and redact-secrets is
trivial (they're pure JS tools) — and it proves TIP works for non-WASM tools too.
This makes TIP credible as a universal protocol.

**base64 tools:**

| TIPTool ID | Consumes | Produces |
|---|---|---|
| `base64/encode` | `application/octet-stream`, `text/plain` | `text/plain` |
| `base64/decode` | `text/plain` | `application/octet-stream` |

**redact-secrets tools:**

| TIPTool ID | Consumes | Produces |
|---|---|---|
| `redact-secrets/redact` | `text/plain`, `application/json` | `text/plain`, `application/json` |

**Acceptance Criteria:**
- [ ] base64 encode + decode implemented as TIPTools
- [ ] redact-secrets/redact implemented as TIPTool
- [ ] All call existing lib/worker logic
- [ ] Registered in their respective index files

---

## Phase 5 — Master Registration

**File:** `src/tip-tools/index.ts`

```typescript
import { TIPToolRegistry } from '../tip';
import { magicPdfTools } from './magic-pdf';
import { pixelAxeTools } from './pixel-axe';
import { base64Tools } from './base64';
import { redactSecretsTools } from './redact-secrets';

export function registerAllTIPTools(): void {
  TIPToolRegistry.registerAll([
    ...magicPdfTools,
    ...pixelAxeTools,
    ...base64Tools,
    ...redactSecretsTools,
  ]);
}

// Call this once in src/app/layout.tsx
// All tools available globally from that point on
```

**`src/app/layout.tsx` addition:**
```typescript
import { registerAllTIPTools } from '@/tip-tools';
registerAllTIPTools(); // runs once on app init
```

**Acceptance Criteria:**
- [ ] `registerAllTIPTools()` registers all implemented tools
- [ ] Called once in app layout
- [ ] `TIPToolRegistry.getAll()` returns all tools after registration
- [ ] `TIPToolRegistry.discoverPath('application/pdf', 'image/png')` returns a valid path

---

## Phase 6 — Pipeline Types + Presets

**File:** `src/types/pipeline.ts`

```typescript
export interface PipelineStep {
  id: string;                // unique instance ID
  toolId: string;            // TIPTool.id e.g. 'magic-pdf/compress'
  config: Record<string, string | number | boolean>;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
  createdAt: string;
  isPreset?: boolean;
  author?: string;           // GitHub username for community sharing
  tipVersion?: string;       // TIP version this was built against
}
```

**File:** `src/config/pipeline-presets.ts`

**3 Presets to ship:**

### Preset 1 — "Compress & Protect PDF"
Steps: `magic-pdf/compress` → `magic-pdf/protect`

### Preset 2 — "PDF to Web-Ready Images"
Steps: `magic-pdf/compress` → `magic-pdf/pdf-to-images` → `pixel-axe/compress`

### Preset 3 — "Shrink Everything"
Steps: `magic-pdf/compress` (quality 60) → `magic-pdf/pdf-to-images` → `pixel-axe/compress` (quality 70)

### Preset 4 — "Sanitize Text File"
Steps: `redact-secrets/redact` → `base64/encode`
*(Proves TIP works across completely different tool families)*

**Acceptance Criteria:**
- [ ] `PipelineDefinition` type defined
- [ ] All 4 presets defined as valid `PipelineDefinition` objects
- [ ] Preset 4 proves cross-family chaining works

---

## Phase 7 — React Hook: `usePipelineEngine`

**File:** `src/hooks/usePipelineEngine.ts`

Wraps `executeTIPPipeline` in React state so the UI can observe execution progress.

```typescript
interface PipelineEngineState {
  status: 'idle' | 'running' | 'complete' | 'error';
  currentStepIndex: number;
  stepStatuses: Array<'idle' | 'running' | 'complete' | 'error'>;
  stepProgress: number[];       // 0-100 per step
  stepDurations: number[];      // ms per completed step
  error: TIPError | null;
  output: TIPBundle | null;
}

// Returns:
const {
  state,
  run,    // (steps: PipelineStep[], file: File) => void
  cancel, // () => void
  reset,  // () => void
} = usePipelineEngine();
```

**Acceptance Criteria:**
- [ ] `run()` executes the pipeline and updates state at each step
- [ ] `cancel()` triggers AbortController → signal → tools respect it
- [ ] `state.output` contains the final TIPBundle on success
- [ ] All step statuses update correctly in real time

---

## Phase 8 — Pipeline Builder UI

**Goal:** A clean, linear pipeline builder. Visual, but not a canvas yet.

**Key UI behaviors:**

**Step Selector Intelligence:**
```
User uploaded PDF → Step 1 selector shows:
  magic-pdf/compress     ✓ (consumes application/pdf)
  magic-pdf/split        ✓
  magic-pdf/protect      ✓
  magic-pdf/pdf-to-images ✓
  pixel-axe/compress     ✗ (consumes image/*, not shown)
  base64/encode          ✗ (not shown)
```
Powered by `TIPToolRegistry.findNextSteps(currentContentType, canTransform)`

**Pipeline Graph (read-only visual):**
Shows the pipeline as a horizontal flow diagram:
```
[PDF] → [Compress] → [PDF to Images] → [Compress Images] → [ZIP]
```
Simple. No drag and drop yet. Just a visual map of the chain.

**Execution Progress:**
Each step shows: idle → running (with live % progress) → complete (with duration) → error

**Output Panel:**
- File size before vs after
- "Saved X MB / X%" stat
- Download button
- WASM performance summary: "3 steps · 2.1s total · WebAssembly"

**Acceptance Criteria:**
- [ ] Step selector only shows TIP-compatible next tools
- [ ] Pipeline graph renders correctly
- [ ] Live progress per step during execution
- [ ] Cancel button works mid-pipeline
- [ ] Output downloadable as single file or ZIP
- [ ] Preset selector loads presets into the builder

---

## Phase 9 — Save, Export, Import

**File:** `src/hooks/usePipelines.ts`

**localStorage key:** `toolbase:pipelines` → `PipelineDefinition[]`

**Export:** JSON file — `toolbase-pipeline-[name].json`

**Import validation:**
1. Parse JSON → validate shape matches `PipelineDefinition`
2. Validate all `toolId` values exist in `TIPToolRegistry`
3. Validate `tipVersion` — warn if pipeline was built against older TIP version
4. Show clear error messages for any validation failures

**Acceptance Criteria:**
- [ ] Save/load/delete pipelines to localStorage
- [ ] Export downloads valid JSON
- [ ] Import validates tool IDs against live registry
- [ ] Version mismatch shows a warning, not a hard error
- [ ] "My Pipelines" section on Pipeline page

---

## Phase 10 — Register Pipeline in Tool Registry

Add to `src/config/tools.registry.ts`:
```typescript
{
  id: 'pipeline',
  name: 'Pipeline Builder',
  description: 'Chain any tools together into an automated workflow. Powered by TIP.',
  category: 'developer',
  route: '/tools/pipeline',
  thumbnail: '/assets/thumbnails/pipeline.png',
  tags: ['pipeline', 'chain', 'workflow', 'automate', 'tip', 'batch'],
  isNew: true,
  isFeatured: true,
  wasmPowered: true,
  pythonPowered: true,
  status: 'beta',
  addedAt: '2025-01-01',
}
```

---

## Milestone 4 Completion Checklist

- [ ] Phase 1: TIP protocol core (8 files + TIP.md)
- [ ] Phase 2: magic-pdf TIPTools (6 tools)
- [ ] Phase 3: pixel-axe TIPTools (3 tools)
- [ ] Phase 4: base64 + redact-secrets TIPTools (3 tools)
- [ ] Phase 5: Master registration, called in app layout
- [ ] Phase 6: Pipeline types + 4 preset pipelines
- [ ] Phase 7: `usePipelineEngine` React hook
- [ ] Phase 8: Pipeline Builder UI
- [ ] Phase 9: Save / export / import pipelines
- [ ] Phase 10: Registered in tool registry

---

## Definition of Done

Milestone 4 is DONE when:

1. `TIPToolRegistry.discoverPath('application/pdf', 'image/png')` returns a valid path
2. Preset 2 (PDF → Web Images) runs end to end with a real PDF
3. Preset 4 (Sanitize Text) proves cross-family chaining works
4. A pipeline can be exported as JSON and re-imported by another user
5. The step selector never shows an incompatible tool
6. `TIP.md` is clear enough for a new contributor to implement a TIPTool in under 1 hour

---

## What TIP Unlocks After This Milestone

| Future Capability | How TIP Enables It |
|---|---|
| Add data-lens to chains | Implement `TIPTool`, register — done |
| AI-suggested pipelines | Feed `TIPToolRegistry.discoverPath()` to an LLM |
| Community-shared pipelines | JSON export is already the format |
| CLI version of Toolbase | TIP has zero UI dependencies |
| Plugin system (external tools) | Implement `TIPTool` interface, register |
| Batch processing 50 files | Bundles already support N payloads |
| Pipeline marketplace | Presets are already `PipelineDefinition` JSON |

---

## Antigravity Execution Order

```
Phase 1 (TIP core)          ← Pure TypeScript, no UI, test in isolation
    ↓
Phase 2 + 3 + 4             ← TIPTools (can run in parallel)
    ↓
Phase 5 (Registration)      ← Wire everything together
    ↓
Phase 6 (Types + Presets)   ← Define the data
    ↓
Phase 7 (Hook)              ← React wrapper around the engine
    ↓
Phase 10 (Registry entry)   ← Gets it in the gallery early
    ↓
Phase 8 (UI)                ← Built last, all logic is ready
    ↓
Phase 9 (Save/Export)       ← Enhancement on top of working UI
```

*Toolbase GSD Milestone 4 | TIP/1.0 + Pipeline Builder*
*Core Promise: Privacy. Security. Free for all. Premium-rich UX.*
