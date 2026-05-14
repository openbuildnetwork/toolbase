/**
 * Base64 Tool Types
 */

export type Base64Mode = 'text_encode' | 'text_decode' | 'file_encode' | 'file_decode';

export interface Base64Request {
    mode: Base64Mode;
    data: string | number[] | Uint8Array;
    url_safe?: boolean;
    mime_type?: string;
}

export interface Base64Response {
    success: boolean;
    result?: string | number[];
    preview?: string;
    size?: number;
    original_size?: number;
    is_large?: boolean;
    error?: string;
}

export interface Base64Options {
    urlSafe: boolean;
    mimeType: string;
    addMimeHeader: boolean;
}
