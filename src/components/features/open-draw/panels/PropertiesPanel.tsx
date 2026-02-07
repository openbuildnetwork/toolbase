import { Node, Edge, MarkerType } from '@xyflow/react';
import { X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Type, Palette, Layout, Layers, Spline, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { StyleManager } from '../utils/style-manager';

interface PropertiesPanelProps {
    selectedNodes: Node[];
    selectedEdges: Edge[];
    onNodeChange: (changes: any) => void;
    onEdgeChange: (changes: any) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function PropertiesPanel({ selectedNodes, selectedEdges, onNodeChange, onEdgeChange, isOpen, onClose }: PropertiesPanelProps) {
    const [activeTab, setActiveTab] = useState<'style' | 'text' | 'arrange'>('style');

    if (!isOpen) return null;

    const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;
    const isNodeSelected = selectedNodes.length > 0;
    const isEdgeSelected = selectedEdges.length > 0 && !isNodeSelected; // Prioritize nodes if mixed, or handle both? Let's prioritize nodes for now or alternate.

    // Get common values
    const firstNode = selectedNodes[0];
    const firstEdge = selectedEdges[0];

    // Derived data for display
    const headerTitle = isNodeSelected
        ? (selectedNodes.length > 1 ? `${selectedNodes.length} nodes` : (firstNode?.data?.label as string || 'Node Properties'))
        : (selectedEdges.length > 1 ? `${selectedEdges.length} edges` : 'Edge Properties');

    const data: any = isNodeSelected ? (firstNode?.data || {}) : (firstEdge?.data || {});
    // For edges, some props might be on style object directly or data.style
    const edgeStyle = firstEdge?.style || {};

    // Helper to update all selected nodes
    const updateNodes = (key: string, value: any) => {
        onNodeChange({ [key]: value });
    };

    // Fix: Define updateStyle alias for updateNodes as it is used in the template
    const updateStyle = (key: string, value: any) => {
        updateNodes(key, value);
    };

    const updateEdges = (key: string, value: any) => {
        // We need to update specific properties.
        // For custom edge, we mostly store in 'data' or 'style'.
        // Let's assume onEdgeChange handles merging properly, or we pass specific object.
        // Actually onEdgeChange usually expects { id: ..., type: ... } updates or similar in ReactFlow hooks, 
        // but here it's likely a custom wrapper provided by parent.
        // Let's assume parent expects partial update object.
        onEdgeChange({ [key]: value });
    };

    const handleEdgeStyleChange = (key: string, value: any) => {
        // Update style object of edge
        const newStyle = { ...edgeStyle, [key]: value };
        // We also want to support data.style if we moved to that, but let's stick to standard edge.style
        // AND we might want to update data for label etc.
        onEdgeChange({ style: newStyle });
    }

    const handleEdgeDataChange = (key: string, value: any) => {
        onEdgeChange({ data: { ...data, [key]: value } });
    }

    const toggleEdgeMarker = (start: boolean) => {
        // Toggle arrow
        const markerKey = start ? 'markerStart' : 'markerEnd';
        const current = (firstEdge as any)[markerKey];
        const newVal = current ? undefined : { type: MarkerType.ArrowClosed, width: 20, height: 20, color: edgeStyle.stroke || '#b1b1b7' };
        onEdgeChange({ [markerKey]: newVal });
    }

    if (!hasSelection) {
        return (
            <div className="w-64 h-full bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 flex flex-col p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Properties</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                    <Layout className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Select an item to edit properties</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-64 h-full bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {headerTitle}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-md transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'style' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('style')}
                >
                    <Palette className="w-3.5 h-3.5" /> Style
                </button>
                <button
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'text' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('text')}
                >
                    <Type className="w-3.5 h-3.5" /> Text
                </button>
                <button
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'arrange' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    onClick={() => setActiveTab('arrange')}
                >
                    <Layers className="w-3.5 h-3.5" /> Arrange
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* STYLE TAB */}
                {activeTab === 'style' && isNodeSelected && (
                    <>
                        {/* Color Swatches */}
                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {['#ffffff', '#fca5a5', '#86efac', '#93c5fd', '#c4b5fd',
                                '#cbd5e1', '#f87171', '#4ade80', '#60a5fa', '#a78bfa',
                                '#94a3b8', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6',
                                '#475569', '#b91c1c', '#15803d', '#1d4ed8', '#5b21b6'].map((color) => (
                                    <button
                                        key={color}
                                        className="w-full aspect-square rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        onClick={() => updateStyle('backgroundColor', color)}
                                    />
                                ))}
                        </div>

                        {/* Fill */}
                        <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={data.backgroundColor !== 'transparent'}
                                        onChange={(e) => updateStyle('backgroundColor', e.target.checked ? '#ffffff' : 'transparent')}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Fill
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 text-right text-xs text-gray-500">Auto</div>
                                    <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded p-0.5">
                                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: data.backgroundColor || 'transparent' }}></div>
                                        <input
                                            type="color"
                                            value={String(data.backgroundColor || '#ffffff')}
                                            onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                            className="w-0 h-0 opacity-0 absolute"
                                            id="fill-color"
                                        />
                                        <label htmlFor="fill-color" className="cursor-pointer">
                                            <Palette className="w-3 h-3 text-gray-500" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 ml-5">
                                <input
                                    type="checkbox"
                                    checked={data.gradient || false}
                                    onChange={(e) => updateStyle('gradient', e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Gradient
                            </label>
                        </div>

                        {/* Line */}
                        <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={Number(data.borderWidth || 0) > 0}
                                        onChange={(e) => updateStyle('borderWidth', e.target.checked ? 1 : 0)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Line
                                </label>
                                <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded p-0.5">
                                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: data.borderColor || '#000000' }}></div>
                                    <input
                                        type="color"
                                        value={String(data.borderColor || '#000000')}
                                        onChange={(e) => updateStyle('borderColor', e.target.value)}
                                        className="w-0 h-0 opacity-0 absolute"
                                        id="stroke-color"
                                    />
                                    <label htmlFor="stroke-color" className="cursor-pointer">
                                        <Palette className="w-3 h-3 text-gray-500" />
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2 ml-5">
                                <select
                                    value={data.borderStyle || 'solid'}
                                    onChange={(e) => updateStyle('borderStyle', e.target.value)}
                                    className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                                >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={Number(data.borderWidth || 1)}
                                    onChange={(e) => updateStyle('borderWidth', parseInt(e.target.value))}
                                    className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                                    placeholder="px"
                                />
                            </div>
                        </div>

                        {/* Opacity */}
                        <div className="flex items-center justify-between py-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Opacity</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={data.opacity ?? 100}
                                    onChange={(e) => updateStyle('opacity', parseInt(e.target.value))}
                                    className="w-20"
                                />
                                <span className="text-xs text-gray-500 w-8 text-right">{data.opacity ?? 100}%</span>
                            </div>
                        </div>

                        {/* Effects Grid */}
                        <div className="space-y-2 pt-2">
                            {/* Rounded Row with Input */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={!!data.borderRadius}
                                        onChange={(e) => updateStyle('borderRadius', e.target.checked ? 8 : 0)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Rounded
                                </label>
                                {!!data.borderRadius && (
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={Number(data.borderRadius || 8)}
                                        onChange={(e) => updateStyle('borderRadius', parseInt(e.target.value) || 0)}
                                        className="w-14 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                                    />
                                )}
                            </div>

                            {/* Other Effects */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={!!data.sketch}
                                        onChange={(e) => updateStyle('sketch', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Sketch
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={!!data.glass}
                                        onChange={(e) => updateStyle('glass', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Glass
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={!!data.shadow}
                                        onChange={(e) => updateStyle('shadow', e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Shadow
                                </label>
                            </div>
                        </div>

                        {/* Style Actions */}
                        <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    if (firstNode?.data) {
                                        if (StyleManager.copyStyle(firstNode.data)) {
                                            alert('Style copied to clipboard!');
                                        }
                                    }
                                }}
                                className="w-full py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525]"
                            >
                                Copy Style
                            </button>
                            <button
                                onClick={() => {
                                    if (firstNode) {
                                        const style = StyleManager.getClipboardStyle();
                                        if (style) {
                                            // Apply style to all selected nodes
                                            const keys = Object.keys(style) as Array<keyof typeof style>;
                                            // We need to batch update or just iterate. updateNodes takes key/value.
                                            // Ideally we should have updateNodes({ ...style }).
                                            // The implementation of onNodeChange in PropertiesPanel expects { [key]: value }.
                                            onNodeChange(style);
                                            alert('Style pasted!');
                                        } else {
                                            alert('No style in clipboard.');
                                        }
                                    }
                                }}
                                className="w-full py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525]"
                            >
                                Paste Style
                            </button>
                            <button
                                onClick={() => {
                                    if (firstNode?.data) {
                                        if (StyleManager.saveDefaultStyle(firstNode.data)) {
                                            alert('Style saved as default for new shapes!');
                                        }
                                    }
                                }}
                                className="w-full py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525]"
                            >
                                Set as Default Style
                            </button>
                        </div>
                    </>
                )}

                {/* EDGE STYLING */}
                {activeTab === 'style' && isEdgeSelected && (
                    <>
                        {/* Line Style */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Line Style</label>
                            <div className="flex gap-2 items-center mb-2">
                                <input
                                    type="color"
                                    value={String(edgeStyle.stroke || '#b1b1b7')}
                                    onChange={(e) => handleEdgeStyleChange('stroke', e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent cursor-pointer"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={Number(edgeStyle.strokeWidth || 2)}
                                    onChange={(e) => handleEdgeStyleChange('strokeWidth', parseInt(e.target.value))}
                                    className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                                    placeholder="Px"
                                />
                            </div>

                            {/* Edge Line Type (Solid/Dashed/Dotted) */}
                            <div className="mb-2">
                                <select
                                    value={edgeStyle.strokeDasharray === '5,5' ? 'dashed' : (edgeStyle.strokeDasharray === '2,2' ? 'dotted' : 'solid')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        let dash: string | undefined = undefined;
                                        if (val === 'dashed') dash = '5,5';
                                        if (val === 'dotted') dash = '2,2';
                                        handleEdgeStyleChange('strokeDasharray', dash);
                                    }}
                                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                                >
                                    <option value="solid">Solid</option>
                                    <option value="dashed">Dashed</option>
                                    <option value="dotted">Dotted</option>
                                </select>
                            </div>
                        </div>

                        {/* Arrows */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Arrows</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleEdgeMarker(true)}
                                    className={`flex-1 p-2 rounded border text-xs flex items-center justify-center gap-2 transition-colors ${firstEdge.markerStart ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                                >
                                    Start <ArrowRight className="w-3 h-3 rotate-180" />
                                </button>
                                <button
                                    onClick={() => toggleEdgeMarker(false)}
                                    className={`flex-1 p-2 rounded border text-xs flex items-center justify-center gap-2 transition-colors ${firstEdge.markerEnd ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                                >
                                    End <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Animation */}
                        <div className="space-y-2 mt-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!firstEdge.animated}
                                    onChange={(e) => onEdgeChange({ animated: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Animated
                            </label>
                        </div>
                    </>
                )}

                {/* EDGE TEXT */}
                {activeTab === 'text' && isEdgeSelected && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Label</label>
                        <input
                            type="text"
                            value={String(data.label || '')}
                            onChange={(e) => handleEdgeDataChange('label', e.target.value)}
                            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                            placeholder="Enter text..."
                        />

                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Text Color</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    value={String(data.textColor || '#000000')}
                                    onChange={(e) => handleEdgeDataChange('textColor', e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent cursor-pointer"
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400">Double-click the line to edit inline.</p>
                    </div>
                )}

                {/* TEXT TAB */}
                {activeTab === 'text' && isNodeSelected && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Font Size</label>
                            <input
                                type="number"
                                value={Number(data.fontSize || 14)}
                                onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Text Color</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    value={String(data.textColor || '#000000')}
                                    onChange={(e) => updateStyle('textColor', e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent cursor-pointer"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* ARRANGE TAB */}
                {activeTab === 'arrange' && isNodeSelected && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Position</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-gray-500 uppercase">X</span>
                                    <input
                                        type="number"
                                        value={Math.round(firstNode.position.x)}
                                        readOnly
                                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200 opacity-60"
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-500 uppercase">Y</span>
                                    <input
                                        type="number"
                                        value={Math.round(firstNode.position.y)}
                                        readOnly
                                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200 opacity-60"
                                    />
                                </div>
                            </div>
                        </div>
                        {/* Z-Index or other controls could go here */}
                    </>
                )}

            </div>
        </div>
    );
}
