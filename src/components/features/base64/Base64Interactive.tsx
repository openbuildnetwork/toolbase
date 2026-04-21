'use client';

import React, { useState } from 'react';
import { Binary, CheckCircle } from 'lucide-react';
import { Base64Workspace } from './Base64Workspace';
import { Button } from '@/components/ui/Button';
import type { TIPInteractionProps } from '@/tip/protocol';

/**
 * TIP Interaction Component for Base64 Tool.
 * Provides an interactive UI to configure Base64 encoding/decoding
 * within the pipeline.
 */
export default function Base64Interactive({
    files,
    config,
    onConfirm,
    onCancel,
}: TIPInteractionProps) {
    const [lastResult, setLastResult] = useState<any>(null);

    const handleConfirm = () => {
        if (!lastResult?.success) {
            // If no result yet, just close if they want to keep previous state, 
            // or we could show a warning. Here we allow it if there's original files.
            onCancel();
            return;
        }

        let finalFile: File;
        if (typeof lastResult.result === 'string') {
            const blob = new Blob([lastResult.result], { type: 'text/plain' });
            finalFile = new File([blob], 'base64_result.txt', { type: 'text/plain' });
        } else {
            const uint8 = new Uint8Array(lastResult.result);
            const blob = new Blob([uint8 as any], { type: 'application/octet-stream' });
            finalFile = new File([blob], 'base64_result.bin', { type: 'application/octet-stream' });
        }

        onConfirm({
            files: [finalFile],
            config: {
                operation: lastResult.mode?.includes('encode') ? 'encode' : 'decode',
                urlSafe: lastResult.urlSafe,
                mimeType: lastResult.mimeType,
            },
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden font-display p-6 space-y-6 bg-white">
            <header className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Binary className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-gray-900">Base64 Conversion</h2>
                        <p className="text-xs text-gray-500 font-medium italic">Adjust parameters and preview the result before continuing</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden">
                <Base64Workspace
                    initialFile={files?.[0]}
                    initialMode={files?.length ? 'file' : 'text'}
                    initialOperation={config?.operation === 'decode' ? 'decode' : 'encode'}
                    onResultUpdate={setLastResult}
                />
            </div>

            <footer className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 shrink-0">
                <Button variant="ghost" onClick={onCancel} className="h-12 px-6 rounded-xl text-gray-500 hover:text-gray-900 border-none font-bold">
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={!lastResult?.success}
                    className="macos-primary-button h-12 px-10 rounded-xl font-bold"
                >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Apply & Continue
                </Button>
            </footer>
        </div>
    );
}
