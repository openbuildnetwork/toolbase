import React, { useState } from 'react';
import { X, Palette, Type, Minus, Plus, Zap, ArrowRight, ChevronDown } from 'lucide-react';
import type { GraphNode, GraphEdge } from '@/types/open-draw.types';

interface PropertiesPanelProps {
    selectedNodes: GraphNode[];
    selectedEdges: GraphEdge[];
    onNodeChange: (changes: Partial<GraphNode['data']>) => void;
    onEdgeChange: (changes: Partial<GraphEdge> & { style?: React.CSSProperties }) => void;
    onClose: () => void;
    isOpen?: boolean;
}

// Premium color palette - curated colors that work well together
const FILL_COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Slate', value: '#f1f5f9' },
    { name: 'Sky', value: '#e0f2fe' },
    { name: 'Blue', value: '#dbeafe' },
    { name: 'Indigo', value: '#e0e7ff' },
    { name: 'Violet', value: '#ede9fe' },
    { name: 'Purple', value: '#f3e8ff' },
    { name: 'Pink', value: '#fce7f3' },
    { name: 'Rose', value: '#ffe4e6' },
    { name: 'Red', value: '#fee2e2' },
    { name: 'Orange', value: '#ffedd5' },
    { name: 'Amber', value: '#fef3c7' },
    { name: 'Yellow', value: '#fef9c3' },
    { name: 'Lime', value: '#ecfccb' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Emerald', value: '#d1fae5' },
    { name: 'Teal', value: '#ccfbf1' },
    { name: 'Cyan', value: '#cffafe' },
];

const STROKE_COLORS = [
    { name: 'Black', value: '#1e293b' },
    { name: 'Gray', value: '#64748b' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
];

const EDGE_TYPES = [
    { id: 'smoothstep', label: 'Smooth', icon: '⌒' },
    { id: 'straight', label: 'Straight', icon: '─' },
    { id: 'bezier', label: 'Curved', icon: '∿' },
];

export function PropertiesPanel({
    selectedNodes,
    selectedEdges,
    onNodeChange,
    onEdgeChange,
    onClose,
    isOpen = true
}: PropertiesPanelProps) {
    const [expandedSection, setExpandedSection] = useState<string | null>('fill');

    const hasNodeSelection = selectedNodes.length > 0;
    const hasEdgeSelection = selectedEdges.length > 0;
    const hasSelection = hasNodeSelection || hasEdgeSelection;

    // Priority: show node properties if nodes selected, else edge properties
    const selectionType = hasNodeSelection ? 'node' : hasEdgeSelection ? 'edge' : null;

    if (!hasSelection || !isOpen) return null;

    const firstNode = selectedNodes[0];
    const firstEdge = selectedEdges[0];

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const SectionHeader = ({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) => (
        <button
            onClick={() => toggleSection(id)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSection === id ? 'rotate-180' : ''}`} />
        </button>
    );

    return (
        <div className="absolute right-4 top-4 w-72 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/10 z-40 overflow-hidden animate-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-white/5 dark:to-white/0 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                        {selectionType === 'node' ? 'Node' : 'Edge'} Properties
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {selectionType === 'node' ? selectedNodes.length : selectedEdges.length} selected
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {selectionType === 'node' && (
                    <>
                        {/* Fill Color Section */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="fill" title="Fill Color" icon={Palette} />
                            {expandedSection === 'fill' && (
                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {FILL_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => onNodeChange({ backgroundColor: color.value })}
                                                className={`w-9 h-9 rounded-xl transition-all duration-150 hover:scale-110 active:scale-95 border-2 ${firstNode?.data?.backgroundColor === color.value
                                                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                                                        : 'border-gray-200/50 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Border Section */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="border" title="Border" icon={Minus} />
                            {expandedSection === 'border' && (
                                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {STROKE_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => onNodeChange({ borderColor: color.value })}
                                                className={`w-8 h-8 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95 ${firstNode?.data?.borderColor === color.value
                                                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#1a1a1a]'
                                                        : ''
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-14">Width</span>
                                        <div className="flex-1 flex items-center gap-2">
                                            <button
                                                onClick={() => onNodeChange({ borderWidth: Math.max(0, (firstNode?.data?.borderWidth ?? 1) - 1) })}
                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Minus className="w-3 h-3 text-gray-500" />
                                            </button>
                                            <div className="flex-1 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{firstNode?.data?.borderWidth ?? 1}px</span>
                                            </div>
                                            <button
                                                onClick={() => onNodeChange({ borderWidth: Math.min(10, (firstNode?.data?.borderWidth ?? 1) + 1) })}
                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Plus className="w-3 h-3 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Typography Section */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="text" title="Typography" icon={Type} />
                            {expandedSection === 'text' && (
                                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-14">Size</span>
                                        <div className="flex-1 flex items-center gap-2">
                                            <button
                                                onClick={() => onNodeChange({ fontSize: Math.max(10, (firstNode?.data?.fontSize ?? 14) - 2) })}
                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Minus className="w-3 h-3 text-gray-500" />
                                            </button>
                                            <div className="flex-1 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{firstNode?.data?.fontSize ?? 14}px</span>
                                            </div>
                                            <button
                                                onClick={() => onNodeChange({ fontSize: Math.min(48, (firstNode?.data?.fontSize ?? 14) + 2) })}
                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Plus className="w-3 h-3 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-14">Color</span>
                                        <div className="grid grid-cols-7 gap-1.5 flex-1">
                                            {STROKE_COLORS.slice(0, 7).map((color) => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => onNodeChange({ textColor: color.value })}
                                                    className={`w-6 h-6 rounded-md transition-all duration-150 hover:scale-110 ${firstNode?.data?.textColor === color.value
                                                            ? 'ring-2 ring-offset-1 ring-blue-500'
                                                            : ''
                                                        }`}
                                                    style={{ backgroundColor: color.value }}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {selectionType === 'edge' && (
                    <>
                        {/* Edge Color */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="stroke" title="Line Color" icon={Palette} />
                            {expandedSection === 'stroke' && (
                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {STROKE_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => onEdgeChange({ style: { stroke: color.value } })}
                                                className={`w-8 h-8 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95 ${firstEdge?.style?.stroke === color.value
                                                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#1a1a1a]'
                                                        : ''
                                                    }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Edge Style */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="edgestyle" title="Line Style" icon={ArrowRight} />
                            {expandedSection === 'edgestyle' && (
                                <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="grid grid-cols-3 gap-2">
                                        {EDGE_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => onEdgeChange({ type: type.id as any })}
                                                className={`py-2.5 px-3 rounded-xl text-center transition-all duration-150 ${firstEdge?.type === type.id
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="text-lg">{type.icon}</div>
                                                <div className="text-[10px] mt-0.5">{type.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-14">Width</span>
                                        <div className="flex-1 flex items-center gap-2">
                                            <button
                                                onClick={() => onEdgeChange({ style: { strokeWidth: Math.max(1, (Number(firstEdge?.style?.strokeWidth) || 2) - 1) } })}
                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Minus className="w-3 h-3 text-gray-500" />
                                            </button>
                                            <div className="flex-1 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{firstEdge?.style?.strokeWidth ?? 2}px</span>
                                            </div>
                                            <button
                                                onClick={() => onEdgeChange({ style: { strokeWidth: Math.min(8, (Number(firstEdge?.style?.strokeWidth) || 2) + 1) } })}
                                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                            >
                                                <Plus className="w-3 h-3 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Animation Toggle */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="animation" title="Animation" icon={Zap} />
                            {expandedSection === 'animation' && (
                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <button
                                        onClick={() => onEdgeChange({ animated: !firstEdge?.animated })}
                                        className={`w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all duration-200 ${firstEdge?.animated
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">Animate Flow</span>
                                        <div className={`w-10 h-5 rounded-full transition-colors ${firstEdge?.animated ? 'bg-white/30' : 'bg-gray-300 dark:bg-white/20'}`}>
                                            <div className={`w-4 h-4 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform ${firstEdge?.animated ? 'translate-x-5' : ''}`} />
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Edge Label */}
                        <div className="border-b border-gray-100 dark:border-white/5">
                            <SectionHeader id="label" title="Label" icon={Type} />
                            {expandedSection === 'label' && (
                                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <input
                                        type="text"
                                        value={firstEdge?.label || ''}
                                        onChange={(e) => onEdgeChange({ label: e.target.value })}
                                        placeholder="Add label..."
                                        className="w-full px-4 py-2.5 text-sm bg-gray-100 dark:bg-white/5 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-800 dark:text-white placeholder:text-gray-400"
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
