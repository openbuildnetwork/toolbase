import { Node, Edge, MarkerType } from '@xyflow/react';
import { X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Type, Palette, Layout, Layers, Spline, ArrowRight, FileImage, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { StyleManager } from '../utils/style-manager';
import { SHAPE_DEFINITIONS } from '../nodes/shapes';

// --- Shared Internal Components ---

interface ColorGridProps {
    onSelect: (color: string) => void;
}

function ColorGrid({ onSelect }: ColorGridProps) {
    const colors = [
        '#ffffff', '#fca5a5', '#86efac', '#93c5fd', '#c4b5fd',
        '#cbd5e1', '#f87171', '#4ade80', '#60a5fa', '#a78bfa',
        '#94a3b8', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6',
        '#475569', '#b91c1c', '#15803d', '#1d4ed8', '#5b21b6'
    ];

    return (
        <div className="grid grid-cols-5 gap-2 mb-6">
            {colors.map((color) => (
                <button
                    key={color}
                    className="w-full aspect-square rounded border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => onSelect(color)}
                />
            ))}
        </div>
    );
}

interface PropertyRowProps {
    label: string;
    children: React.ReactNode;
    className?: string;
}

function PropertyRow({ label, children, className = '' }: PropertyRowProps) {
    return (
        <div className={`flex items-center justify-between py-1 ${className}`}>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    );
}

// --- Main Component ---

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

    const isNodeSelected = selectedNodes.length > 0;
    const isEdgeSelected = selectedEdges.length > 0 && !isNodeSelected;
    const hasSelection = isNodeSelected || isEdgeSelected;

    if (!hasSelection) {
        return <EmptyState />;
    }

    const firstNode = selectedNodes[0];
    const firstEdge = selectedEdges[0];
    const data: any = isNodeSelected ? (firstNode?.data || {}) : (firstEdge?.data || {});
    const edgeStyle = firstEdge?.style || {};

    const headerTitle = isNodeSelected
        ? (selectedNodes.length > 1 ? `${selectedNodes.length} nodes` : (firstNode?.data?.label as string || 'Node Properties'))
        : (selectedEdges.length > 1 ? `${selectedEdges.length} edges` : 'Edge Properties');

    // --- Update Handlers ---

    const updateStyle = (key: string, value: any) => onNodeChange({ [key]: value });
    const handleEdgeStyleChange = (key: string, value: any) => onEdgeChange({ style: { ...edgeStyle, [key]: value } });
    const handleEdgeDataChange = (key: string, value: any) => onEdgeChange({ data: { ...data, [key]: value } });

    const toggleEdgeMarker = (start: boolean) => {
        const markerKey = start ? 'markerStart' : 'markerEnd';
        const current = (firstEdge as any)[markerKey];
        const color = edgeStyle.stroke || (isDark() ? '#64748b' : '#b1b1b7');
        const newVal = current ? undefined : { type: MarkerType.ArrowClosed, width: 20, height: 20, color };
        onEdgeChange({ [markerKey]: newVal });
    };

    function isDark() {
        return document.documentElement.classList.contains('dark');
    }

    return (
        <div className="w-64 h-full bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">
                    {headerTitle}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-md transition-colors shrink-0">
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                {[
                    { id: 'style', icon: Palette, label: 'Style' },
                    { id: 'text', icon: Type, label: 'Text' },
                    { id: 'arrange', icon: Layers, label: 'Arrange' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === tab.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        onClick={() => setActiveTab(tab.id as any)}
                    >
                        <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {activeTab === 'style' && (
                    isNodeSelected ? (
                        <NodeStyleView data={data} updateStyle={updateStyle} firstNode={firstNode} onNodeChange={onNodeChange} />
                    ) : (
                        <EdgeStyleView
                            edgeStyle={edgeStyle}
                            firstEdge={firstEdge}
                            handleEdgeStyleChange={handleEdgeStyleChange}
                            toggleEdgeMarker={toggleEdgeMarker}
                            onEdgeChange={onEdgeChange}
                        />
                    )
                )}

                {activeTab === 'text' && (
                    isNodeSelected ? (
                        <NodeTextView data={data} updateStyle={updateStyle} />
                    ) : (
                        <EdgeTextView data={data} handleEdgeDataChange={handleEdgeDataChange} />
                    )
                )}

                {activeTab === 'arrange' && isNodeSelected && (
                    <ArrangeView firstNode={firstNode} />
                )}
            </div>
        </div>
    );
}

// --- Sub-views ---

function EmptyState() {
    return (
        <div className="w-64 h-full bg-white dark:bg-[#1a1a1a] border-l border-gray-200 dark:border-gray-800 flex flex-col p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Properties</h3>
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
                <Layout className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">Select an item to edit properties</p>
            </div>
        </div>
    );
}

function NodeStyleView({ data, updateStyle, firstNode, onNodeChange }: any) {
    return (
        <>
            <ColorGrid onSelect={(color) => updateStyle('backgroundColor', color)} />

            {/* Fill Section */}
            <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <PropertyRow label="Fill">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={data.backgroundColor !== 'transparent'}
                            onChange={(e) => updateStyle('backgroundColor', e.target.checked ? '#ffffff' : 'transparent')}
                            className="rounded border-gray-300 text-blue-600"
                        />
                        <ColorPicker value={data.backgroundColor || '#ffffff'} onChange={(c) => updateStyle('backgroundColor', c)} />
                    </div>
                </PropertyRow>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 ml-5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.gradient || false}
                        onChange={(e) => updateStyle('gradient', e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    Gradient
                </label>
            </div>

            {/* Line Section */}
            <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <PropertyRow label="Line">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={Number(data.borderWidth || 0) > 0}
                            onChange={(e) => updateStyle('borderWidth', e.target.checked ? 1 : 0)}
                            className="rounded border-gray-300 text-blue-600"
                        />
                        <ColorPicker value={data.borderColor || '#000000'} onChange={(c) => updateStyle('borderColor', c)} />
                    </div>
                </PropertyRow>
                <div className="flex gap-2 ml-5">
                    <select
                        value={data.borderStyle || 'solid'}
                        onChange={(e) => updateStyle('borderStyle', e.target.value)}
                        className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent text-gray-900 dark:text-gray-200"
                    >
                        <option value="solid" className="dark:bg-[#1a1a1a]">Solid</option>
                        <option value="dashed" className="dark:bg-[#1a1a1a]">Dashed</option>
                        <option value="dotted" className="dark:bg-[#1a1a1a]">Dotted</option>
                    </select>
                    <input
                        type="number"
                        min="0"
                        value={data.borderWidth || 1}
                        onChange={(e) => updateStyle('borderWidth', parseInt(e.target.value))}
                        className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent text-gray-900 dark:text-gray-200"
                    />
                </div>
            </div>

            {/* Shape Section */}
            <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <PropertyRow label="Shape">
                    <select
                        value={data.shapeType || 'rectangle'}
                        onChange={(e) => updateStyle('shapeType', e.target.value)}
                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent text-gray-900 dark:text-gray-200"
                    >
                        {Object.entries(SHAPE_DEFINITIONS).map(([key, def]) => (
                            <option key={key} value={key} className="dark:bg-[#1a1a1a]">{def.label}</option>
                        ))}
                    </select>
                </PropertyRow>
            </div>

            {/* Image Controls Section */}
            {data.imageUrl && (
                <div className="space-y-3 pb-4 border-b border-gray-100 dark:border-gray-800 bg-emerald-50/30 dark:bg-emerald-900/10 p-2 rounded-lg">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <FileImage className="w-3 h-3" /> Image Properties
                    </div>
                    <PropertyRow label="Crop Mode">
                        <select
                            value={data.imageMode || 'cover'}
                            onChange={(e) => updateStyle('imageMode', e.target.value)}
                            className="w-full text-xs border border-emerald-200 dark:border-emerald-800 rounded px-2 py-1 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100"
                        >
                            <option value="cover" className="bg-white dark:bg-[#1a1a1a]">Fill (Cover)</option>
                            <option value="contain" className="bg-white dark:bg-[#1a1a1a]">Fit (Contain)</option>
                            <option value="stretch" className="bg-white dark:bg-[#1a1a1a]">Stretch</option>
                        </select>
                    </PropertyRow>
                    <PropertyRow label="Zoom">
                        <input
                            type="range" min="100" max="300"
                            value={data.imageZoom || 100}
                            onChange={(e) => updateStyle('imageZoom', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-emerald-200 dark:bg-emerald-900/50 rounded-lg appearance-none cursor-pointer"
                        />
                    </PropertyRow>
                    <div className="grid grid-cols-2 gap-2">
                        <PropertyRow label="Pan X">
                            <input
                                type="range" min="-100" max="100"
                                value={data.imageX || 0}
                                onChange={(e) => updateStyle('imageX', parseInt(e.target.value))}
                                className="w-full h-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg appearance-none cursor-pointer"
                            />
                        </PropertyRow>
                        <PropertyRow label="Pan Y">
                            <input
                                type="range" min="-100" max="100"
                                value={data.imageY || 0}
                                onChange={(e) => updateStyle('imageY', parseInt(e.target.value))}
                                className="w-full h-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg appearance-none cursor-pointer"
                            />
                        </PropertyRow>
                    </div>
                </div>
            )}

            {/* Effects Section */}
            <div className="space-y-3 pt-2">
                <PropertyRow label="Opacity">
                    <input
                        type="range" min="0" max="100" value={data.opacity ?? 100}
                        onChange={(e) => updateStyle('opacity', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 w-8 text-right">{data.opacity ?? 100}%</span>
                </PropertyRow>

                <div className="space-y-3">
                    <PropertyRow label="Rounded">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={!!data.borderRadius}
                                onChange={(e) => updateStyle('borderRadius', e.target.checked ? 8 : 0)}
                                className="rounded border-gray-300 text-blue-600"
                            />
                            {!!data.borderRadius && (
                                <input
                                    type="number" min="0" max="100" value={data.borderRadius}
                                    onChange={(e) => updateStyle('borderRadius', parseInt(e.target.value) || 0)}
                                    className="w-14 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent text-gray-900 dark:text-gray-200"
                                />
                            )}
                        </div>
                    </PropertyRow>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {['sketch', 'glass', 'shadow'].map((effect) => (
                            <label key={effect} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 capitalize cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!data[effect]}
                                    onChange={(e) => updateStyle(effect, e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                {effect}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <StyleActions firstNode={firstNode} onNodeChange={onNodeChange} />
        </>
    );
}

function ColorPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    return (
        <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded p-0.5">
            <div className="w-4 h-4 rounded-sm border border-black/5" style={{ backgroundColor: value }}></div>
            <input
                type="color"
                value={value.startsWith('#') ? value : '#ffffff'}
                onChange={(e) => onChange(e.target.value)}
                className="w-0 h-0 opacity-0 absolute"
                id={`cp-${value}`}
            />
            <label htmlFor={`cp-${value}`} className="cursor-pointer">
                <Palette className="w-3 h-3 text-gray-500" />
            </label>
        </div>
    );
}

function StyleActions({ firstNode, onNodeChange }: any) {
    return (
        <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <ActionButton
                label="Copy Style"
                onClick={() => {
                    if (firstNode?.data && StyleManager.copyStyle(firstNode.data)) {
                        alert('Style copied to clipboard!');
                    }
                }}
            />
            <ActionButton
                label="Paste Style"
                onClick={() => {
                    const style = StyleManager.getClipboardStyle();
                    if (style) {
                        onNodeChange(style);
                        alert('Style pasted!');
                    } else {
                        alert('No style in clipboard.');
                    }
                }}
            />
            <ActionButton
                label="Set as Default Style"
                onClick={() => {
                    if (firstNode?.data && StyleManager.saveDefaultStyle(firstNode.data)) {
                        alert('Style saved as default for new shapes!');
                    }
                }}
            />
        </div>
    );
}

function ActionButton({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
        >
            {label}
        </button>
    );
}

function EdgeStyleView({ edgeStyle, handleEdgeStyleChange, toggleEdgeMarker, firstEdge, onEdgeChange }: any) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Line Style</label>
                <div className="flex gap-2 items-center mb-2">
                    <ColorPicker value={edgeStyle.stroke || '#b1b1b7'} onChange={(c) => handleEdgeStyleChange('stroke', c)} />
                    <input
                        type="number" min="1" max="10" value={edgeStyle.strokeWidth || 2}
                        onChange={(e) => handleEdgeStyleChange('strokeWidth', parseInt(e.target.value))}
                        className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent"
                    />
                </div>
                <select
                    value={edgeStyle.strokeDasharray === '5,5' ? 'dashed' : (edgeStyle.strokeDasharray === '2,2' ? 'dotted' : 'solid')}
                    onChange={(e) => {
                        const val = e.target.value;
                        let dash = val === 'dashed' ? '5,5' : (val === 'dotted' ? '2,2' : undefined);
                        handleEdgeStyleChange('strokeDasharray', dash);
                    }}
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent"
                >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Arrows</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => toggleEdgeMarker(true)}
                        className={`flex-1 p-2 rounded border text-xs flex items-center justify-center gap-2 transition-colors ${firstEdge.markerStart ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                    >
                        Start <ArrowRight className="w-3 h-3 rotate-180" />
                    </button>
                    <button
                        onClick={() => toggleEdgeMarker(false)}
                        className={`flex-1 p-2 rounded border text-xs flex items-center justify-center gap-2 transition-colors ${firstEdge.markerEnd ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30' : 'bg-transparent border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                    >
                        End <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                    type="checkbox"
                    checked={!!firstEdge.animated}
                    onChange={(e) => onEdgeChange({ animated: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                />
                Animated
            </label>
        </div>
    );
}

function NodeTextView({ data, updateStyle }: any) {
    return (
        <div className="space-y-4">
            <PropertyRow label="Font Size">
                <input
                    type="number" value={data.fontSize || 14}
                    onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                />
            </PropertyRow>
            <PropertyRow label="Text Color">
                <ColorPicker value={data.textColor || '#000000'} onChange={(c) => updateStyle('textColor', c)} />
            </PropertyRow>
        </div>
    );
}

function EdgeTextView({ data, handleEdgeDataChange }: any) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Label</label>
                <input
                    type="text" value={data.label || ''}
                    onChange={(e) => handleEdgeDataChange('label', e.target.value)}
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent"
                    placeholder="Enter text..."
                />
            </div>
            <PropertyRow label="Text Color">
                <ColorPicker value={data.textColor || '#000000'} onChange={(c) => handleEdgeDataChange('textColor', c)} />
            </PropertyRow>
            <p className="text-[10px] text-gray-400">Double-click the line to edit inline.</p>
        </div>
    );
}

function ArrangeView({ firstNode }: any) {
    return (
        <div className="space-y-4">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Position</label>
            <div className="grid grid-cols-2 gap-2">
                {['x', 'y'].map(axis => (
                    <div key={axis}>
                        <span className="text-[10px] text-gray-500 uppercase">{axis}</span>
                        <input
                            type="number" value={Math.round(firstNode.position[axis])}
                            readOnly
                            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent text-gray-900 dark:text-gray-200 opacity-60"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
