import { Node, Edge } from '@xyflow/react';
import { X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Type, Palette, Layout, Layers } from 'lucide-react';
import { useState } from 'react';

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

    // Get common values from first selected node
    const firstNode = selectedNodes[0];
    const data = firstNode?.data || {};
    const style = firstNode?.style || {};

    // Helper to update all selected nodes
    const updateNodes = (key: string, value: any) => {
        onNodeChange({ [key]: value });
    };

    const updateStyle = (key: string, value: any) => {
        // We handle React Flow "style" object updates slightly differently if we want them rendered by component
        // But for GenericShapeNode, we store styles in DATA mainly.
        // Let's stick to updating DATA for custom properties.
        updateNodes(key, value);
    };

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
                    {selectedNodes.length > 1 ? `${selectedNodes.length} items` : (firstNode?.data?.label as string || 'Properties')}
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
                        {/* Fill */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Fill Color</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    value={String(data.backgroundColor || '#ffffff')}
                                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={String(data.backgroundColor || '#ffffff')}
                                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                                    className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200 font-mono"
                                />
                            </div>
                        </div>

                        {/* Stroke */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">Stroke</label>
                            <div className="flex gap-2 items-center mb-2">
                                <input
                                    type="color"
                                    value={String(data.borderColor || '#000000')}
                                    onChange={(e) => updateStyle('borderColor', e.target.value)}
                                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent cursor-pointer"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={Number(data.borderWidth || 1)}
                                    onChange={(e) => updateStyle('borderWidth', parseInt(e.target.value))}
                                    className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent dark:text-gray-200"
                                    placeholder="Width"
                                />
                            </div>
                        </div>

                        {/* Opacity/Shadow placeholders - add later if needed */}
                    </>
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
