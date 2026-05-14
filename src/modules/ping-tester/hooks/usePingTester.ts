import { useState, useRef, useCallback } from 'react';
import { pingHost, PingResult, PingOptions } from '@/modules/ping-tester/lib/ping';

export function usePingTester() {
    const [results, setResults] = useState<PingResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [target, setTarget] = useState('');
    const [options, setOptions] = useState<PingOptions>({
        packetCount: 4,
        interval: 1000,
    });

    const stopRef = useRef<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clearResults = useCallback(() => {
        setResults([]);
    }, []);

    const stopPing = useCallback(() => {
        stopRef.current = true;
        setIsRunning(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const startPing = useCallback(async (host: string, opts: PingOptions) => {
        if (!host) return;

        setResults([]);
        setIsRunning(true);
        stopRef.current = false;

        const count = opts.packetCount;
        const interval = opts.interval;

        for (let i = 0; i < count; i++) {
            if (stopRef.current) break;

            const result = await pingHost(host);
            setResults((prev) => [...prev, result]);

            if (i < count - 1 && !stopRef.current) {
                await new Promise((resolve) => {
                    timeoutRef.current = setTimeout(resolve, interval);
                });
            }
        }

        setIsRunning(false);
    }, []);

    const stats = {
        sent: results.length,
        received: results.filter((r) => r.status === 'success').length,
        lost: results.filter((r) => r.status !== 'success').length,
        lossRate: results.length > 0
            ? Math.round((results.filter((r) => r.status !== 'success').length / results.length) * 100)
            : 0,
        min: results.length > 0 && results.some(r => r.latency !== null)
            ? Math.min(...results.filter(r => r.latency !== null).map(r => r.latency!))
            : 0,
        max: results.length > 0 && results.some(r => r.latency !== null)
            ? Math.max(...results.filter(r => r.latency !== null).map(r => r.latency!))
            : 0,
        avg: results.length > 0 && results.some(r => r.latency !== null)
            ? Math.round(
                results.filter(r => r.latency !== null).reduce((acc, r) => acc + r.latency!, 0) /
                results.filter(r => r.latency !== null).length
            )
            : 0,
    };

    return {
        results,
        isRunning,
        startPing,
        stopPing,
        clearResults,
        stats,
        target,
        setTarget,
        options,
        setOptions,
    };
}
