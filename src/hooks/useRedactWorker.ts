import { useState, useEffect, useCallback } from 'react';
import { RedactRequest, RedactResponse } from '@/types/redact';
import { redactBridge } from '@/features/redact-bridge';

export function useRedactWorker() {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        redactBridge.init()
            .then(() => {
                setIsReady(true);
            })
            .catch(err => {
                console.error('Failed to initialize redact bridge', err);
                setError('Failed to initialize worker');
            });
    }, []);

    const redact = useCallback(async (request: RedactRequest): Promise<RedactResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await redactBridge.redact(request);
            setIsLoading(false);
            return data;
        } catch (err: any) {
            setIsLoading(false);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, []);

    return { redact, isReady, isLoading, error };
}
