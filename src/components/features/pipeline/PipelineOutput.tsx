'use client';

/**
 * PipelineOutput — shows the result of a completed pipeline execution.
 * Displays stats (file size before/after, step count, total time) and download button.
 */

import React, { useCallback } from 'react';
import {
    Download, CheckCircle2, Zap, Clock, Files, ArrowDownToLine,
} from 'lucide-react';
import type { TIPBundle } from '@/tip/protocol';
import type { StepState } from '@/types/pipeline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface PipelineOutputProps {
    output: TIPBundle;
    initialSizeBytes: number;
    stepStates: StepState[];
    onReset: () => void;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

export function PipelineOutput({
    output,
    initialSizeBytes,
    stepStates,
    onReset,
}: PipelineOutputProps) {
    const outputSizeBytes = output.meta.totalSizeBytes;
    const savedBytes = initialSizeBytes - outputSizeBytes;
    const savedPct = initialSizeBytes > 0
        ? Math.round((savedBytes / initialSizeBytes) * 100)
        : 0;
    const totalMs = stepStates.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
    const completedSteps = stepStates.filter((s) => s.status === 'complete').length;

    const downloadAll = useCallback(() => {
        if (output.payloads.length === 1) {
            const payload = output.payloads[0];
            const url = URL.createObjectURL(payload.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = payload.meta.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } else {
            // Multiple payloads — download each individually
            output.payloads.forEach((payload, i) => {
                setTimeout(() => {
                    const url = URL.createObjectURL(payload.data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = payload.meta.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                }, i * 200);
            });
        }
    }, [output]);

    return (
        <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/60 to-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-emerald-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Pipeline Complete</h3>
                    <p className="text-xs text-gray-500">
                        {output.payloads.length} file{output.payloads.length !== 1 ? 's' : ''} ready to download
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4">
                <Stat
                    icon={<Files className="w-4 h-4 text-violet-500" />}
                    label="Steps"
                    value={`${completedSteps}`}
                />
                <Stat
                    icon={<Clock className="w-4 h-4 text-blue-500" />}
                    label="Total Time"
                    value={formatMs(totalMs)}
                />
                <Stat
                    icon={<ArrowDownToLine className="w-4 h-4 text-gray-400" />}
                    label="Output Size"
                    value={formatBytes(outputSizeBytes)}
                />
                <Stat
                    icon={<Zap className="w-4 h-4 text-amber-500" />}
                    label={savedPct > 0 ? 'Saved' : 'Change'}
                    value={`${savedPct > 0 ? '-' : '+'}${Math.abs(savedPct)}%`}
                    highlight={savedPct > 0}
                />
            </div>

            {/* Size comparison */}
            {initialSizeBytes > 0 && (
                <div className="px-5 pb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Before: {formatBytes(initialSizeBytes)}</span>
                        <span>After: {formatBytes(outputSizeBytes)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-700',
                                savedPct > 0 ? 'bg-emerald-400' : 'bg-amber-400'
                            )}
                            style={{ width: `${Math.min(100, (outputSizeBytes / initialSizeBytes) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Engine badge */}
            <div className="px-5 pb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-100 rounded-full text-xs text-violet-600 font-medium">
                    <Zap className="w-3 h-3" />
                    {completedSteps} step{completedSteps !== 1 ? 's' : ''} · {formatMs(totalMs)} · WebAssembly (TIP/1.0)
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-emerald-100 bg-emerald-50/30">
                <Button onClick={downloadAll} className="gap-2 flex-1 sm:flex-none">
                    <Download className="w-4 h-4" />
                    Download {output.payloads.length > 1 ? `${output.payloads.length} Files` : 'File'}
                </Button>
                <Button variant="outline" onClick={onReset} size="sm">
                    New Pipeline
                </Button>
            </div>
        </div>
    );
}

function Stat({
    icon,
    label,
    value,
    highlight = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {icon}
                <span>{label}</span>
            </div>
            <span className={cn('text-base font-bold', highlight ? 'text-emerald-600' : 'text-gray-800')}>
                {value}
            </span>
        </div>
    );
}
