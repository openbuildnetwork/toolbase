"use client";
import { useCallback, useState } from "react";
import { archiveKitWorker } from "@/workers/instances";

type ProgressState = {
  progress: number;
  stage: string;
};

export function useArchiveKitWorker() {
  const [isBusy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ progress: 0, stage: "idle" });

  const run = useCallback(
    async <T>(action: string, payload: unknown): Promise<T> => {
      setBusy(true);
      setProgress({ progress: 1, stage: "starting" });

      const unsubscribe = archiveKitWorker.onMessage((msg) => {
          if (msg.type === 'progress') {
              setProgress({ progress: msg.progress, stage: msg.stage });
          }
          if (msg.type === 'INIT_PROGRESS') {
              setProgress(prev => ({ ...prev, stage: msg.message || 'warming' }));
          }
      });


      try {
        const result = await archiveKitWorker.execute(action, payload as Record<string, unknown>);
        setProgress({ progress: 100, stage: "done" });
        return result as T;
      } catch (err: unknown) {
        setProgress({ progress: 0, stage: "error" });
        throw err;
      } finally {
        setBusy(false);
        unsubscribe();
      }
    },
    []
  );

  const cancel = useCallback(() => {
    // WorkerClient doesn't support fine-grained cancellation yet, 
    // but we can at least reset the UI state.
    setBusy(false);
    setProgress({ progress: 0, stage: "idle" });
  }, []);

  return { run, cancel, isBusy, progress };
}
