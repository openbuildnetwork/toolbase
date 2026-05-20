import { useState, useCallback } from 'react';
import { noteVaultWorker } from '@/workers/instances';

export function useNoteWorker() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTask = useCallback(async (type: string, payload: unknown): Promise<unknown> => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await noteVaultWorker.execute(type, { payload } as Record<string, unknown>);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { runTask, isProcessing, error };
}
