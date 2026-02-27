'use client';

/**
 * usePipelineEngine — React hook that wraps executeTIPPipeline.
 *
 * Connects the pure TIPEngine to React state so the Pipeline Builder UI
 * can observe real-time execution progress for every step.
 *
 * Usage:
 *   const { state, run, cancel, reset } = usePipelineEngine();
 *   await run(pipeline.steps, file);   // kicks off the pipeline
 *   state.status                       // 'idle' | 'running' | 'complete' | 'error'
 *   state.steps[i].progress            // 0–100 per step
 *   state.output                       // TIPBundle when complete
 */

import { useCallback, useRef, useState } from 'react';
import { executeTIPPipeline } from '@/tip/engine';
import { bundleFromFile } from '@/tip/bundle';
import type { TIPBundle } from '@/tip/protocol';
import type { TIPPipelineStep } from '@/tip/engine';
import type { TIPError } from '@/tip/errors';
import type { PipelineEngineState, StepState, PipelineStep } from '@/types/pipeline';

// ─── Extended state with output ───────────────────────────────────────────────

interface UsePipelineEngineReturn {
  state: PipelineEngineState;
  /** The final TIPBundle produced after successful completion */
  output: TIPBundle | null;
  /** Start the pipeline. Accepts a PipelineDefinition's steps + the user's file. */
  run: (steps: PipelineStep[], file: File) => Promise<void>;
  /** Abort the running pipeline (honours AbortSignal in each TIPTool) */
  cancel: () => void;
  /** Reset to idle state (clears output and error) */
  reset: () => void;
}

// ─── Initial state factory ────────────────────────────────────────────────────

function makeInitialStepStates(count: number): StepState[] {
  return Array.from({ length: count }, () => ({
    status: 'idle' as const,
    progress: 0,
    message: '',
    durationMs: 0,
    error: null,
  }));
}

const IDLE_STATE: PipelineEngineState = {
  status: 'idle',
  currentStepIndex: -1,
  steps: [],
  error: null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePipelineEngine(): UsePipelineEngineReturn {
  const [state, setState] = useState<PipelineEngineState>(IDLE_STATE);
  const [output, setOutput] = useState<TIPBundle | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const updateStep = useCallback(
    (index: number, patch: Partial<StepState>) => {
      setState((prev) => {
        const steps = [...prev.steps];
        steps[index] = { ...steps[index], ...patch };
        return { ...prev, steps };
      });
    },
    []
  );

  // ── run ───────────────────────────────────────────────────────────────────────

  const run = useCallback(
    async (steps: PipelineStep[], file: File) => {
      // Cancel any in-flight run
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      // Seed initial state
      const stepStates = makeInitialStepStates(steps.length);
      setState({
        status: 'running',
        currentStepIndex: 0,
        steps: stepStates,
        error: null,
      });
      setOutput(null);

      // Build the initial bundle from the file
      const initialBundle = bundleFromFile(file);

      // Map PipelineStep (UI type) → TIPPipelineStep (engine type)
      const engineSteps: TIPPipelineStep[] = steps.map((s) => ({
        toolId: s.toolId,
        config: s.config,
      }));

      try {
        const result = await executeTIPPipeline(
          engineSteps,
          initialBundle,
          {
            onStepStart: (i, _toolId) => {
              setState((prev) => ({
                ...prev,
                currentStepIndex: i,
                steps: prev.steps.map((s, idx) =>
                  idx === i ? { ...s, status: 'running', progress: 0 } : s
                ),
              }));
            },

            onStepProgress: (i, percent, message) => {
              updateStep(i, {
                progress: percent,
                message: message ?? '',
              });
            },

            onStepComplete: (i, _toolId, durationMs) => {
              updateStep(i, {
                status: 'complete',
                progress: 100,
                durationMs,
                error: null,
              });
            },

            onStepError: (i, _toolId, error) => {
              updateStep(i, {
                status: 'error',
                error: error.message,
              });
            },
          },
          controller.signal
        );

        setOutput(result);
        setState((prev) => ({ ...prev, status: 'complete', error: null }));
      } catch (err) {
        const tipError = err as TIPError;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: tipError.message ?? 'Pipeline failed',
        }));
      }
    },
    [updateStep]
  );

  // ── cancel ────────────────────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setState((prev) => ({
      ...prev,
      status: 'idle',
      error: 'Cancelled by user',
    }));
  }, []);

  // ── reset ─────────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(IDLE_STATE);
    setOutput(null);
  }, []);

  return { state, output, run, cancel, reset };
}
