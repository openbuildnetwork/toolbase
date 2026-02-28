import React from 'react';
import { TIPToolRegistry } from '@/tip/registry';
import type { Node } from '@xyflow/react';
import { SlidersHorizontal, Settings, Info, AlertOctagon, PackageCheck } from 'lucide-react';
import { getTypeColor } from './nodes/ToolNode';
import type { TIPBundle } from '@/tip/protocol';

interface InspectorPanelProps {
    selectedNode: Node | null;
    updateNodeData: (nodeId: string, partialData: any) => void;
}

export function InspectorPanel({ selectedNode, updateNodeData }: InspectorPanelProps) {
    if (!selectedNode) {
        return (
            <aside className="w-80 bg-white border-l border-gray-200 h-full flex flex-col p-6 items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <SlidersHorizontal className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-semibold text-gray-700">Pipeline Config</h3>
                <p className="text-sm text-gray-500 mt-2">
                    Click a node on the canvas to configure its settings and view its flow details.
                </p>
            </aside>
        );
    }

    if (selectedNode.type === 'fileInput') {
        const file = selectedNode.data.file as File | null;
        return (
            <aside className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-800 leading-tight">File Input</h2>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wide">Starting Point</p>
                    </div>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</label>
                        {file ? (
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                <div className="font-medium text-gray-800 break-all">{file.name}</div>
                                <div className="text-gray-500 mt-1 flex justify-between">
                                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                                    <span className="font-mono text-[10px] py-0.5 px-2 bg-gray-200 rounded">{file.type || 'binary'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 text-orange-800 text-sm flex gap-2">
                                <AlertOctagon className="w-5 h-5 shrink-0" />
                                <span>No file selected yet. Select a file on the node.</span>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        );
    }

    if (selectedNode.type === 'output') {
        const bundle = selectedNode.data.bundle as TIPBundle | undefined;
        const totalDurationMs = Number(selectedNode.data.totalDurationMs) || 0;
        return (
            <aside className="w-80 bg-white border-l border-gray-200 h-full flex flex-col">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                        <PackageCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-800 leading-tight">Output</h2>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wide">End Point</p>
                    </div>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Results</label>
                        {bundle ? (
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Files</span>
                                    <span className="font-medium">{bundle.meta.count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Size</span>
                                    <span className="font-medium">{(bundle.meta.totalSizeBytes / 1024).toFixed(1)} KB</span>
                                </div>
                                {totalDurationMs > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Duration</span>
                                        <span className="font-medium text-emerald-600">{(totalDurationMs / 1000).toFixed(1)}s</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 text-sm text-center italic">
                                Run the pipeline to see output stats here.
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        );
    }

    const toolId = selectedNode.data.toolId as string;
    const tool = TIPToolRegistry.get(toolId);
    if (!tool) return null;

    const config = (selectedNode.data.config as Record<string, any>) || {};

    const handleConfigChange = (key: string, value: any) => {
        updateNodeData(selectedNode.id, {
            config: {
                ...config,
                [key]: value
            }
        });
    };

    return (
        <aside className="w-80 bg-white border-l border-gray-200 h-full flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                <div className="p-2 bg-violet-100/50 text-violet-700 rounded-lg shrink-0 border border-violet-100">
                    <Settings className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-800 leading-tight">{tool.name}</h2>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">{tool.id.split('/')[1]}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-8">
                {/* Description Box */}
                <div className="bg-blue-50/50 text-blue-900 text-sm p-4 rounded-xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 shrink-0 text-blue-500" />
                    <p className="leading-snug text-blue-800/80">{tool.description}</p>
                </div>

                {/* I/O Types */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Data Types</label>
                    <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-100 to-transparent opacity-20 transform rotate-12" />
                        <div className="flex justify-between items-center text-xs relative z-10 w-full">
                            <span className="text-gray-500 w-16">Accepts:</span>
                            <span className="font-mono bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm flex-1 ml-2 text-right truncate">
                                {tool.consumes[0]?.split('/')[1]?.toUpperCase() || 'ANY'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs relative z-10 w-full mt-2">
                            <span className="text-gray-500 w-16">Produces:</span>
                            <span className="font-mono bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm flex-1 ml-2 text-right truncate">
                                {tool.produces[0]?.split('/')[1]?.toUpperCase() || 'ANY'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Configuration Fields */}
                <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Configuration</label>
                    <div className="space-y-5">
                        {tool.configSchema.fields.length === 0 ? (
                            <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
                                No parameters to configure.
                            </p>
                        ) : (
                            tool.configSchema.fields.map((field) => (
                                <div key={field.key} className="space-y-1.5 focus-within:text-violet-600 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-gray-700 transition-colors">{field.label}</label>
                                        {field.unit && <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{field.unit}</span>}
                                    </div>
                                    {field.description && <p className="text-[11px] text-gray-500 leading-tight mb-2">{field.description}</p>}

                                    {field.type === 'number' && (
                                        <div className="space-y-2 mt-2">
                                            <input
                                                type="range"
                                                min={field.min ?? 0}
                                                max={field.max ?? 100}
                                                step={field.step ?? 1}
                                                value={Number(config[field.key] ?? field.default)}
                                                onChange={(e) => handleConfigChange(field.key, Number(e.target.value))}
                                                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-violet-600"
                                            />
                                            <div className="flex justify-between text-[11px] font-mono text-gray-400">
                                                <span>{field.min ?? 0}</span>
                                                <span className="font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 text-[12px]">
                                                    {config[field.key] ?? field.default}
                                                </span>
                                                <span>{field.max ?? 100}</span>
                                            </div>
                                        </div>
                                    )}

                                    {field.type === 'boolean' && (
                                        <label className="flex items-center gap-3 cursor-pointer mt-2 group bg-gray-50 hover:bg-violet-50 p-2.5 rounded-lg border border-gray-100 transition-colors">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(config[field.key] ?? field.default)}
                                                    onChange={(e) => handleConfigChange(field.key, e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                                />
                                            </div>
                                            <span className="text-sm text-gray-700 font-medium group-hover:text-violet-700">Enabled</span>
                                        </label>
                                    )}

                                    {field.type === 'string' && (
                                        <input
                                            type="text"
                                            value={String(config[field.key] ?? field.default)}
                                            placeholder={field.description}
                                            onChange={(e) => handleConfigChange(field.key, e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 hover:border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:bg-white transition-all shadow-sm"
                                        />
                                    )}

                                    {field.type === 'password' && (
                                        <input
                                            type="password"
                                            value={String(config[field.key] ?? field.default)}
                                            placeholder="Enter password…"
                                            onChange={(e) => handleConfigChange(field.key, e.target.value)}
                                            className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 hover:border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:bg-white transition-all shadow-sm"
                                        />
                                    )}

                                    {field.type === 'select' && field.options && (
                                        <div className="relative">
                                            <select
                                                value={String(config[field.key] ?? field.default)}
                                                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                                                className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 hover:border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:bg-white appearance-none transition-all shadow-sm font-medium text-gray-700 cursor-pointer"
                                            >
                                                {field.options.map((opt: { label: string, value: string | number }) => (
                                                    <option key={String(opt.value)} value={String(opt.value)}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
