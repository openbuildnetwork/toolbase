import React, { useState, useMemo } from 'react';
import { TIPToolRegistry } from '@/tip/registry';
import { Search, File, FileImage, Shield, Code, GripVertical, PackageCheck, Upload } from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
    pdf: File,
    image: FileImage,
    security: Shield,
    developer: Code,
};

const CATEGORY_LABELS: Record<string, string> = {
    pdf: '📄 PDF',
    image: '🖼 Image',
    security: '🔒 Security',
    developer: '</> Dev',
};

export function NodePalette() {
    const [search, setSearch] = useState('');

    const tools = useMemo(() => {
        let all = TIPToolRegistry.getAll();
        if (search) {
            const q = search.toLowerCase();
            all = all.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
        }
        return all;
    }, [search]);

    const groups = useMemo(() => {
        const acc: Record<string, typeof tools> = {};
        tools.forEach(t => {
            const prefix = t.id.split('/')[0];
            let cat = 'developer';
            if (prefix === 'magic-pdf') cat = 'pdf';
            if (prefix === 'pixel-axe') cat = 'image';
            if (prefix === 'redact-secrets') cat = 'security';
            if (prefix === 'base64') cat = 'developer';

            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(t);
        });
        return acc;
    }, [tools]);

    const onDragStart = (event: React.DragEvent, nodeType: string, toolId?: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        if (toolId) {
            event.dataTransfer.setData('application/toolId', toolId);
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-gray-100">
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Special Nodes */}
                {(!search || 'input file output'.includes(search.toLowerCase())) && (
                    <div className="space-y-2">
                        <div
                            className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg flex items-center gap-3 cursor-grab hover:border-green-300 hover:bg-green-50 transition-colors"
                            onDragStart={(e) => onDragStart(e, 'fileInput')}
                            draggable
                        >
                            <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                <Upload className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">File Input</span>
                            <GripVertical className="w-4 h-4 text-gray-300 ml-auto" />
                        </div>

                        <div
                            className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg flex items-center gap-3 cursor-grab hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                            onDragStart={(e) => onDragStart(e, 'output')}
                            draggable
                        >
                            <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                <PackageCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Output</span>
                            <GripVertical className="w-4 h-4 text-gray-300 ml-auto" />
                        </div>
                    </div>
                )}

                {/* Tool Groups */}
                {Object.entries(groups).map(([cat, catsTools]) => {
                    const Icon = CATEGORY_ICONS[cat] || Code;
                    return (
                        <div key={cat} className="space-y-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 border-b border-gray-100 pb-1">
                                {CATEGORY_LABELS[cat] || cat}
                            </h3>
                            <div className="space-y-2">
                                {catsTools.map(tool => (
                                    <div
                                        key={tool.id}
                                        className="bg-white border border-gray-200 p-2.5 rounded-lg flex items-center gap-3 cursor-grab hover:border-violet-300 hover:shadow-sm transition-all shadow-xs"
                                        onDragStart={(e) => onDragStart(e, 'tool', tool.id)}
                                        draggable
                                    >
                                        <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center shrink-0">
                                            <Icon className="w-3.5 h-3.5 text-violet-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-semibold text-gray-800 truncate">{tool.name}</div>
                                            <div className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">{tool.id.split('/')[1]}</div>
                                        </div>
                                        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {Object.keys(groups).length === 0 && search && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No tools found for "{search}"
                    </div>
                )}
            </div>
        </aside>
    );
}
