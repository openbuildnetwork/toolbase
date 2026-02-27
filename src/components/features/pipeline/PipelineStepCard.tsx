'use client';

/**
 * PipelineStep — a single step card in the pipeline builder.
 * Shows: tool name, description, config panel, live progress during execution.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, GripVertical, CheckCircle, XCircle, Loader2, Circle } from 'lucide-react';
import { StepConfigPanel } from './StepConfigPanel';
import type { TIPTool, TIPConfig } from '@/tip/protocol';
import type { StepState } from '@/types/pipeline';
import { cn } from '@/lib/utils';

interface PipelineStepCardProps {
    index: number;
    tool: TIPTool;
    config: TIPConfig;
    stepState?: StepState;
    onConfigChange: (key: string, value: string | number | boolean) => void;
    onRemove: () => void;
    isRunning: boolean;
    isLast?: boolean;
}

const STATUS_ICON = {
    idle: <Circle className="w-4 h-4 text-gray-300" />,
    running: <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />,
    complete: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
    skipped: <Circle className="w-4 h-4 text-gray-200" />,
};

export function PipelineStepCard({
    index,
    tool,
    config,
    stepState,
    onConfigChange,
    onRemove,
    isRunning,
    isLast,
}: PipelineStepCardProps) {
    const [expanded, setExpanded] = useState(true);
    const status = stepState?.status ?? 'idle';
    const progress = stepState?.progress ?? 0;

    return (
        <div className="relative">
            {/* Connector line */}
            {!isLast && (
                <div className="absolute left-5 top-full w-px h-4 bg-linear-to-b from-violet-200 to-transparent z-10" />
            )}

            <div
                className={cn(
                    'rounded-2xl border transition-all duration-200',
                    status === 'running' && 'border-violet-300 shadow-lg shadow-violet-500/10 bg-violet-50/30',
                    status === 'complete' && 'border-emerald-200 bg-emerald-50/20',
                    status === 'error' && 'border-red-200 bg-red-50/20',
                    status === 'idle' && 'border-gray-200/80 bg-white hover:border-violet-200 hover:shadow-sm',
                    status === 'skipped' && 'border-gray-100 bg-gray-50/50 opacity-60',
                )}
            >
                {/* Progress bar */}
                {status === 'running' && (
                    <div className="h-0.5 rounded-t-2xl overflow-hidden bg-violet-100">
                        <div
                            className="h-full bg-linear-to-r from-violet-400 to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab" />

                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold shrink-0">
                        {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800 truncate">{tool.name}</span>
                            <span className="text-xs text-gray-400 font-mono truncate hidden sm:block">{tool.id}</span>
                        </div>
                        {status === 'running' && stepState?.message && (
                            <p className="text-xs text-violet-500 mt-0.5 truncate">{stepState.message}</p>
                        )}
                        {status === 'complete' && stepState && (
                            <p className="text-xs text-emerald-600 mt-0.5">{stepState.durationMs}ms</p>
                        )}
                        {status === 'error' && stepState?.error && (
                            <p className="text-xs text-red-500 mt-0.5 truncate">{stepState.error}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {STATUS_ICON[status]}
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Toggle config"
                        >
                            {expanded
                                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                : <ChevronDown className="w-4 h-4 text-gray-400" />
                            }
                        </button>
                        {!isRunning && (
                            <button
                                onClick={onRemove}
                                className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                                title="Remove step"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Config */}
                {expanded && (
                    <div className="px-4 pb-4 border-t border-gray-100/80 pt-3">
                        <StepConfigPanel
                            fields={tool.configSchema.fields}
                            config={config}
                            onChange={onConfigChange}
                            disabled={isRunning}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
