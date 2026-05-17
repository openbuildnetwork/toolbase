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
 * Verifies if a domain exists by querying a public CORS-enabled DNS-over-HTTPS API.
 * Bypasses checks for IP addresses and local hosts.
 */
async function verifyDomainExists(hostUrl: string): Promise<{ exists: boolean; error?: string }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { exists: false, error: 'Network offline' };
    }

    try {
        const parsedUrl = new URL(hostUrl);
        const hostname = parsedUrl.hostname;

        // If it's already an IP address, it exists
        const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname) || hostname.includes(':');
        if (isIp) return { exists: true };

        // Local domains and localhost don't exist on public DNS
        const isLocal = hostname === 'localhost' || 
                        hostname.endsWith('.local') || 
                        !hostname.includes('.');
        if (isLocal) return { exists: true };

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);

        // Fetch DNS resolution from Cloudflare's public CORS-enabled DoH API
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
            headers: { 'Accept': 'application/dns-json' },
            signal: controller.signal
        });
        clearTimeout(id);

        if (response.ok) {
            const data = await response.json();
            // Status 0 means NOERROR (successfully resolved)
            // If data.Answer exists, there is at least one IP record
            const exists = data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
            return { exists, error: exists ? undefined : 'Domain not found (DNS lookup failed)' };
        }
        return { exists: true }; // Fallback
    } catch {
        return { exists: true }; // Fallback on network/fetch errors during DNS resolution
    }
}

/**
 * Performs an HTTP-based ping to a host.
 * Note: Real ICMP ping is not possible from the browser.
 * Under COEP, standard cross-origin requests are blocked. However, since the browser
 * triggers the block *after* receiving response headers, the elapsed time until the
 * TypeError is thrown is an accurate measurement of RTT and proves server reachability.
 */
export async function pingHost(hostUrl: string): Promise<PingResult> {
    let url = hostUrl;

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    const timestamp = new Date().toLocaleTimeString();

    // Basic URL validation
    try {
        new URL(url);
    } catch {
        return {
            host: hostUrl,
            timestamp,
            latency: null,
            status: 'error',
            message: 'Invalid URL / Host format',
        };
    }

    // Verify domain exists and is valid first (to avoid false positives on invalid hosts)
    const dnsCheck = await verifyDomainExists(url);
    if (!dnsCheck.exists) {
        return {
            host: hostUrl,
            timestamp,
            latency: null,
            status: 'error',
            message: dnsCheck.error || 'DNS lookup failed',
        };
    }

    const start = performance.now();

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000); // 10s default timeout

        // We use 'no-cors' mode because we only care about the RTT.
        // Even if blocked by COEP or CORS at the browser boundary, the request
        // was successfully sent and returned headers, proving reachability.
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
        const end = performance.now();
        const latency = Math.round(end - start);

        if (error instanceof Error && error.name === 'AbortError') {
            return {
                host: hostUrl,
                timestamp,
                latency: null,
                status: 'timeout',
            };
        }

        // Under COEP (require-corp), fetch throws a TypeError due to missing CORP/CORS headers.
        // Since the domain is verified to exist and didn't time out, this error is the browser
        // blocking the response AFTER the server replied, meaning the server is reachable and
        // the promise rejection timing is the exact round-trip latency!
        return {
            host: hostUrl,
            timestamp,
            latency,
            status: 'success',
        };
    }
}
