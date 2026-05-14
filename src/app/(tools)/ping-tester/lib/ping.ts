export interface PingResult {
    host: string;
    timestamp: string;
    latency: number | null;
    status: 'success' | 'timeout' | 'error';
    message?: string;
}

export interface PingOptions {
    packetCount: number;
    interval: number;
}

/**
 * Performs an HTTP-based ping to a host.
 * Note: Real ICMP ping is not possible from the browser.
 */
export async function pingHost(hostUrl: string): Promise<PingResult> {
    let url = hostUrl;

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    const start = performance.now();
    const timestamp = new Date().toLocaleTimeString();

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000); // 10s default timeout

        // We use 'no-cors' mode because we only care about the RTT, 
        // and most hosts won't have CORS enabled for random requests.
        // 'no-cors' will still result in an opaque response if the host is reachable.
        await fetch(url, {
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal,
        });

        clearTimeout(id);
        const end = performance.now();
        const latency = Math.round(end - start);

        return {
            host: hostUrl,
            timestamp,
            latency,
            status: 'success',
        };
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                host: hostUrl,
                timestamp,
                latency: null,
                status: 'timeout',
            };
        }

        return {
            host: hostUrl,
            timestamp,
            latency: null,
            status: 'error',
            message: error instanceof Error ? error.message : 'Network error',
        };
    }
}
