
export interface SpeedTestResult {
    ping: number; // ms
    download: number; // Mbps
    upload: number; // Mbps
}

/**
 * Measures latency to a target URL.
 * Uses Cloudflare trace endpoint which is lightweight and edge-cached.
 */
export async function measurePing(url: string = 'https://www.cloudflare.com/cdn-cgi/trace', samples: number = 5): Promise<number> {
    const latencies: number[] = [];

    // Warmup request to establish connection (DNS, TCP, TLS)
    try {
        await fetch(`${url}?t=${Date.now()}_warmup`, { mode: 'no-cors' });
    } catch {
        // quiet fail on warmup
    }

    // Use a unique query param for every request to strictly avoid cache
    for (let i = 0; i < samples; i++) {
        const start = performance.now();
        try {
            await fetch(`${url}?t=${Date.now()}_${Math.floor(Math.random() * 10000)}`, { mode: 'no-cors' });
            const end = performance.now();
            latencies.push(end - start);
        } catch (e) {
            console.error('Ping failed', e);
        }
    }

    if (latencies.length === 0) return 0;
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return Math.round(avg);
}

/**
 * Measures download speed by fetching a static asset using parallel streams.
 * Returns speed in Mbps.
 */
export async function measureDownload(
    signal?: AbortSignal,
    onProgress?: (mbps: number) => void
): Promise<number> {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Snake_River_%285mb%29.jpg';
    const TARGET_DURATION = 10000; // 10 seconds
    const CONCURRENCY = 6;

    const start = performance.now();
    let totalBytesReceived = 0;

    // We launch N workers
    const workers = Array.from({ length: CONCURRENCY }).map(async (_, index) => {
        let loopCount = 0;
        while (performance.now() - start < TARGET_DURATION) {
            if (signal?.aborted) break;

            try {
                const response = await fetch(`${url}?t=${Date.now()}_${index}_${loopCount}`, { signal });
                if (!response.body) throw new Error('No response body');

                const reader = response.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    totalBytesReceived += value.length;
                }
                loopCount++;
            } catch (e) {
                if (signal?.aborted) return;
                console.warn(`Download stream ${index} failed`, e);
                // Slight backoff on error to avoid hammering
                await new Promise(r => setTimeout(r, 100));
            }
        }
    });

    // Monitor progress
    const progressInterval = setInterval(() => {
        if (signal?.aborted) {
            clearInterval(progressInterval);
            return;
        }
        const now = performance.now();
        const durationSec = (now - start) / 1000;
        if (durationSec > 0.1 && onProgress) {
            const bitsLoaded = totalBytesReceived * 8;
            const mbps = (bitsLoaded / durationSec) / 1000000;
            onProgress(Math.round(mbps * 10) / 10);
        }
    }, 100);

    try {
        await Promise.all(workers);
    } finally {
        clearInterval(progressInterval);
    }

    const end = performance.now();
    const durationSec = (end - start) / 1000;
    const bitsLoaded = totalBytesReceived * 8;
    const mbps = (bitsLoaded / durationSec) / 1000000;

    return Math.round(mbps * 100) / 100;
}

/**
 * Measures upload speed by sending random data to an echo service using parallel streams.
 * Returns speed in Mbps.
 */
export async function measureUpload(
    signal?: AbortSignal,
    onProgress?: (mbps: number) => void
): Promise<number> {
    // 2MB random payload
    const size = 2 * 1024 * 1024;
    // Optimized: Fill buffer with constant value instead of random loop
    const buffer = new Uint8Array(size);
    buffer.fill(1);
    const blob = new Blob([buffer]);

    // Reverting to httpbin as postman-echo failed CORS.
    const url = 'https://httpbin.org/post';

    const TARGET_DURATION = 10000; // 10 seconds
    const CONCURRENCY = 4; // Reduced to 4 for better stability on unstable/mobile networks

    const start = performance.now();
    let totalBytesUploaded = 0;

    const workers = Array.from({ length: CONCURRENCY }).map(async (_, index) => {
        let loopCount = 0;
        while (performance.now() - start < TARGET_DURATION) {
            if (signal?.aborted) break;

            try {
                await fetch(`${url}?t=${index}_${loopCount}`, {
                    method: 'POST',
                    body: blob,
                    signal,
                    mode: 'cors'
                });
                totalBytesUploaded += size;
                loopCount++;
            } catch (e) {
                if (signal?.aborted) return;
                console.warn(`Upload stream ${index} failed`, e);
                await new Promise(r => setTimeout(r, 200));
            }
        }
    });

    // Monitor progress
    const progressInterval = setInterval(() => {
        if (signal?.aborted) {
            clearInterval(progressInterval);
            return;
        }
        const now = performance.now();
        const durationSec = (now - start) / 1000;
        if (durationSec > 0.1 && onProgress) {
            const bitsLoaded = totalBytesUploaded * 8;
            const mbps = (bitsLoaded / durationSec) / 1000000;
            onProgress(Math.round(mbps * 10) / 10);
        }
    }, 100);

    try {
        await Promise.all(workers);
    } finally {
        clearInterval(progressInterval);
    }

    const end = performance.now();
    const durationSec = (end - start) / 1000;
    const bitsLoaded = totalBytesUploaded * 8;
    const mbps = (bitsLoaded / durationSec) / 1000000;

    return Math.round(mbps * 100) / 100;
}
