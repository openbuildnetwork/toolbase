'use client';

/**
 * PipelineGraph — read-only visual flow diagram of the pipeline.
 * Shows: [input type] → [Step 1] → [Step 2] → ... → [output type]
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { TIPTool } from '@/tip/protocol';
import type { StepState } from '@/types/pipeline';
import { cn } from '@/lib/utils';

interface PipelineGraphProps {
    tools: TIPTool[];
    stepStates: StepState[];
    inputContentType: string;
}

const SHORT: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'text/plain': 'TXT',
    'text/csv': 'CSV',
    'text/html': 'HTML',
    'application/json': 'JSON',
    'application/zip': 'ZIP',
    'application/octet-stream': 'BIN',
};

const TYPE_COLORS: Record<string, string> = {
    'application/pdf': 'bg-red-100 text-red-700 border-red-200',
    'image/png': 'bg-blue-100 text-blue-700 border-blue-200',
    'image/jpeg': 'bg-blue-100 text-blue-700 border-blue-200',
    'image/webp': 'bg-blue-100 text-blue-700 border-blue-200',
    'text/plain': 'bg-amber-100 text-amber-700 border-amber-200',
    'text/csv': 'bg-green-100 text-green-700 border-green-200',
    'text/html': 'bg-orange-100 text-orange-700 border-orange-200',
    'application/json': 'bg-teal-100 text-teal-700 border-teal-200',
};

function TypeBadge({ type }: { type: string }) {
    const label = SHORT[type] ?? type.split('/')[1] ?? type;
    const color = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600 border-gray-200';
    return (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold border', color)}>
            {label}
        </span>
    );
}

export function PipelineGraph({ tools, stepStates, inputContentType }: PipelineGraphProps) {
    if (tools.length === 0) {
        return (
            <div className="flex items-center justify-center h-12 text-sm text-gray-400">
                Add steps to see the pipeline graph
            </div>
        );
    }

    // Build node sequence: input → step1 → step2 → … → output
    const nodes: React.ReactNode[] = [];

    // Input node
    nodes.push(<TypeBadge key="input" type={inputContentType} />);

    let currentType = inputContentType;
    tools.forEach((tool, i) => {
        const state = stepStates[i];
        const status = state?.status ?? 'idle';

        nodes.push(
            <ArrowRight key={`arrow-${i}`} className="w-4 h-4 text-gray-300 shrink-0" />
        );

        nodes.push(
            <div
                key={`tool-${i}`}
                className={cn(
                    'shrink-0 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200',
                    status === 'running' && 'border-violet-300 bg-violet-100 text-violet-700 shadow-sm shadow-violet-200',
                    status === 'complete' && 'border-emerald-300 bg-emerald-100 text-emerald-700',
                    status === 'error' && 'border-red-300 bg-red-100 text-red-700',
                    status === 'idle' && 'border-gray-200 bg-white text-gray-600',
                    status === 'skipped' && 'border-gray-100 bg-gray-50 text-gray-300',
                )}
            >
                {tool.name}
            </div>
        );

        // Advance type to first output type
        currentType = tool.produces[0] ?? currentType;
    });

    // Output node
    nodes.push(
        <ArrowRight key="arrow-out" className="w-4 h-4 text-gray-300 shrink-0" />
    );
    nodes.push(<TypeBadge key="output" type={currentType} />);

    return (
        <div className="flex items-center gap-2 flex-wrap py-1 overflow-x-auto">
            {nodes}
        </div>
    );
}
