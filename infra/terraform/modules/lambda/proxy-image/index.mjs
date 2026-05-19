// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Toolbase Contributors

/**
 * Image Proxy AWS Lambda Handler
 * Downloads external images and returns them encoded as Base64 with CORS and COEP headers.
 */
export const handler = async (event) => {
    const imageUrl = event.queryStringParameters?.url;

    if (!imageUrl) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
            },
            body: 'Missing URL parameter',
        };
    }

    try {
        const response = await fetch(imageUrl);

        if (!response.ok) {
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                },
                body: `Failed to fetch image: ${response.statusText}`,
            };
        }

        const buffer = await response.arrayBuffer();
        const base64Body = Buffer.from(buffer).toString('base64');

        return {
            statusCode: 200,
            isBase64Encoded: true,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin',
            },
            body: base64Body,
        };
    } catch (error) {
        console.error('Proxy error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
            },
            body: 'Internal Server Error',
        };
    }
};
