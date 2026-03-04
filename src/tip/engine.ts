/**
 * TIPEngine — Pipeline Execution
 *
 * The engine is the runtime that executes a TIP pipeline.
 * It takes a sequence of steps (toolId + config) and an initial TIPBundle,
 * then runs each tool in order, passing the output of one as the input to the next.
 *
 * Key responsibilities:
 *  1. Validate each step (tool exists, type is compatible)
 *  2. Apply type transformers when needed
 *  3. Invoke each tool with the standard TIPHooks
 *  4. Stamp each output bundle with producer metadata
 *  5. Fire engine-level hooks so the UI can observe progress
 *  6. Honour AbortSignal — cancel cleanly at any point
 *
 * The engine has NO React dependency. Wrap it in usePipelineEngine (Phase 7)
 * to connect it to React state.
 */

import type { TIPBundle, TIPConfig, TIPHooks } from './protocol';
import { TIPToolRegistry } from './registry';
import { findTransformer } from './transformers';
import { TIPError } from './errors';
import { stampBundle } from './bundle';

// ─── Step Definition ──────────────────────────────────────────────────────────

/**
 * A single step in a TIP pipeline.
 * The engine resolves toolId → TIPTool via TIPToolRegistry.
 */
export interface TIPPipelineStep {
  /** Must match a registered TIPTool.id */
  toolId: string;
  /** Config values for this invocation */
  config: TIPConfig;
  /**
   * INP override: when an interactable node has user-confirmed files,
   * this bundle replaces the upstream output at the start of this step.
   * Injected by usePipelineEngine from node.data.interactionFiles.
   */
  interactionBundle?: TIPBundle;
}

// ─── Engine Hooks ─────────────────────────────────────────────────────────────

/**
 * Callbacks the engine fires as it progresses through the pipeline.
 * The React hook (usePipelineEngine) maps these to setState calls.
 * Non-React consumers (e.g., a CLI) can log to the console instead.
 */
export interface TIPEngineHooks {
  /** Fired immediately before a step's tool.invoke() is called */
  onStepStart:    (stepIndex: number, toolId: string) => void;
  /** Forwarded from tool's hooks.onProgress — 0–100 */
  onStepProgress: (stepIndex: number, percent: number, message?: string) => void;
  /** Fired when tool.invoke() resolves successfully */
  onStepComplete: (stepIndex: number, toolId: string, durationMs: number) => void;
  /** Fired when tool.invoke() rejects or a protocol error occurs */
  onStepError:    (stepIndex: number, toolId: string, error: TIPError) => void;
}

// ─── Pipeline Execution ───────────────────────────────────────────────────────

/**
 * Execute a TIP pipeline.
 *
 * @param steps        - Ordered list of steps to execute
 * @param initialBundle - The starting data (typically the user's uploaded file)
 * @param engineHooks  - Callbacks for observing execution progress
 * @param signal       - AbortSignal — cancel the pipeline from the outside
 *
 * @returns The final TIPBundle produced by the last step
 *
 * @throws TIPError with code 'CANCELLED'       if the signal fires
 * @throws TIPError with code 'TOOL_NOT_FOUND'  if a toolId has no registration
 * @throws TIPError with code 'TYPE_MISMATCH'   if types are incompatible
 * @throws TIPError with code 'EXECUTION_FAILED' if a tool throws a non-TIPError
 */
export async function executeTIPPipeline(
  steps: TIPPipelineStep[],
  initialBundle: TIPBundle,
  engineHooks: TIPEngineHooks,
  signal: AbortSignal
): Promise<TIPBundle> {
  let current = initialBundle;

  for (let i = 0; i < steps.length; i++) {
    // ── Cancellation check (before step) ──────────────────────────────────────
    if (signal.aborted) {
      throw new TIPError('CANCELLED', 'Pipeline cancelled by user', i);
    }

    const step = steps[i];

    // ── INP override: interactable nodes supply their own input bundle ──────────
    if (step.interactionBundle) {
      current = step.interactionBundle;
    }

    // ── Tool resolution ────────────────────────────────────────────────────────
    const tool = TIPToolRegistry.get(step.toolId);

    if (!tool) {
      throw new TIPError(
        'TOOL_NOT_FOUND',
        `Tool "${step.toolId}" is not registered`,
        i,
        step.toolId
      );
    }

    // ── Type compatibility ─────────────────────────────────────────────────────
    const canConsumeDirect = tool.consumes.includes(current.contentType);

    // Try to find a transformer for each accepted type the tool declares
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

    // ── Type coercion (if needed) ──────────────────────────────────────────────
    if (transformer) {
      current = await transformer.transform(current);
    }

    // ── Invocation ────────────────────────────────────────────────────────────
    engineHooks.onStepStart(i, step.toolId);
    const start = performance.now();

    /** Per-step hooks — bridge tool progress reports to engine-level hooks */
    const stepHooks: TIPHooks = {
      onProgress: (percent, message) =>
        engineHooks.onStepProgress(i, percent, message),
      onLog: (message, level) => {
        if (level === 'error') console.error(`[TIP][${tool.id}]`, message);
        else if (level === 'warn') console.warn(`[TIP][${tool.id}]`, message);
        else console.log(`[TIP][${tool.id}]`, message);
      },
      signal,
    };

    try {
      const result = await tool.invoke(current, step.config, stepHooks);
      const durationMs = Math.round(performance.now() - start);

      // Stamp the output with producer info before passing to the next step
      current = stampBundle(result, tool.id, durationMs);

      engineHooks.onStepComplete(i, step.toolId, durationMs);
    } catch (err) {
      const tipError =
        err instanceof TIPError
          ? err
          : new TIPError('EXECUTION_FAILED', String(err), i, step.toolId);

      engineHooks.onStepError(i, step.toolId, tipError);
      throw tipError;
    }
  }

  return current;
}
