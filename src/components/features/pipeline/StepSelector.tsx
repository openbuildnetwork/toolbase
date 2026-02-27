'use client';

/**
 * StepSelector — shows available next steps given the current output content type.
 * Powered by TIPToolRegistry.findNextSteps() — only shows compatible tools.
 */

import React, { useState } from 'react';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { TIPToolRegistry } from '@/tip/registry';
import { canTransform } from '@/tip/transformers';
import type { TIPContentType, TIPTool } from '@/tip/protocol';
import { cn } from '@/lib/utils';

interface StepSelectorProps {
    currentContentType: TIPContentType;
    onSelect: (tool: TIPTool) => void;
    onClose: () => void;
}

// Group tools by namespace prefix (e.g. "magic-pdf", "pixel-axe")
function groupTools(tools: TIPTool[]): Map<string, TIPTool[]> {
    const map = new Map<string, TIPTool[]>();
    for (const tool of tools) {
        const ns = tool.id.split('/')[0] ?? 'other';
        if (!map.has(ns)) map.set(ns, []);
        map.get(ns)!.push(tool);
    }
    return map;
}

const NS_LABELS: Record<string, string> = {
    'magic-pdf': '📄 Magic PDF',
    'pixel-axe': '🪓 Pixel Axe',
    'base64': '🔤 Base64',
    'redact-secrets': '🔒 Redact Secrets',
};

export function StepSelector({ currentContentType, onSelect, onClose }: StepSelectorProps) {
    const [query, setQuery] = useState('');

    const compatible = TIPToolRegistry.findNextSteps(currentContentType, canTransform);

    const filtered = query.trim()
        ? compatible.filter(
            (t) =>
                t.name.toLowerCase().includes(query.toLowerCase()) ||
                t.id.toLowerCase().includes(query.toLowerCase()) ||
                t.description.toLowerCase().includes(query.toLowerCase())
        )
        : compatible;

    const grouped = groupTools(filtered);

    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search tools…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-400"
                />
                <button
                    onClick={onClose}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-0.5 rounded-md hover:bg-gray-100"
                >
                    ESC
                </button>
            </div>

            {/* Tool list */}
            <div className="max-h-72 overflow-y-auto py-1">
                {filtered.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                        {query
                            ? `No tools matching "${query}"`
                            : `No compatible tools for "${currentContentType}"`}
                    </div>
                )}

                {Array.from(grouped.entries()).map(([ns, tools]) => (
                    <div key={ns}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/80">
                            {NS_LABELS[ns] ?? ns}
                        </div>
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => { onSelect(tool); onClose(); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 text-left transition-colors group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-800 group-hover:text-violet-700">
                                            {tool.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{tool.description}</p>
                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                        {tool.consumes.map((c) => (
                                            <span key={c} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-mono">
                                                {c.split('/')[1]}
                                            </span>
                                        ))}
                                        <ChevronRight className="w-3 h-3 text-gray-300" />
                                        {tool.produces.map((p) => (
                                            <span key={p} className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                                                p !== currentContentType ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {p.split('/')[1]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <Plus className="w-4 h-4 text-gray-300 group-hover:text-violet-500 shrink-0 transition-colors" />
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                Showing {filtered.length} of {TIPToolRegistry.size()} compatible tools for{' '}
                <span className="font-mono text-violet-500">{currentContentType}</span>
            </div>
        </div>
    );
}
