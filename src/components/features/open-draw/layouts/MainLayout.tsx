
import { useState, useRef, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useOpenDraw } from '@/hooks/useOpenDraw';
import { DrawCanvas } from '../canvas/DrawCanvas';
import { ShapeLibrary } from '../panels/ShapeLibrary';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { Undo2, Redo2, Download, Upload, Moon, Sun, Menu, ChevronLeft, ChevronRight, FileText, ChevronDown, FileCode, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { exportAsPng, exportAsSvg, exportAsPdf } from '../utils/export-utils';

export function OpenDrawLayout() {
    const openDraw = useOpenDraw();
    const { undo, redo, canUndo, canRedo, saveGraph, loadGraph, nodes, edges, setNodes, setEdges, selectedNodes, selectedEdges } = openDraw;

    const [isDark, setIsDark] = useState(false);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [fileMenuOpen, setFileMenuOpen] = useState(false);

    const fileMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
                setFileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onDragStart = (event: React.DragEvent, shapeType: string) => {
        event.dataTransfer.setData('application/reactflow', shapeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleNodeChange = (changes: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (selectedNodes.includes(node.id)) {
                    return {
                        ...node,
                        data: { ...node.data, ...changes }
                    };
                }
                return node;
            })
        );
    };

    const handleEdgeChange = (changes: any) => {
        setEdges((eds) =>
            eds.map((edge) => {
                if (selectedEdges.includes(edge.id)) {
                    const newStyle = {
                        ...(edge.style || {}),
                        ...(changes.style || {})
                    };
                    const { style: _s, ...otherChanges } = changes;
                    return {
                        ...edge,
                        ...otherChanges,
                        style: newStyle
                    };
                }
                return edge;
            })
        );
    };

    const handleImport = (type: 'svg' | 'xml') => {
        const promptText = type === 'svg'
            ? 'Paste SVG string:'
            : 'Paste XML Stencil definition:';
        const input = prompt(promptText);
        if (input) {
            const event = new CustomEvent('open-draw-import-shape', { detail: input });
            window.dispatchEvent(event);
        }
        setFileMenuOpen(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            // Dispatch import event with special prefix for image
            const importEvent = new CustomEvent('open-draw-import-shape', {
                detail: `IMAGE_DATA:${base64}`
            });
            window.dispatchEvent(importEvent);
        };
        reader.readAsDataURL(file);
        setFileMenuOpen(false);
        // Reset input so the same file can be uploaded again
        e.target.value = '';
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const svgFileInputRef = useRef<HTMLInputElement>(null);

    const handleSvgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            // Standard import event (DrawCanvas handles SVG tags automatically)
            const importEvent = new CustomEvent('open-draw-import-shape', {
                detail: content
            });
            window.dispatchEvent(importEvent);
        };
        reader.readAsText(file);
        setFileMenuOpen(false);
        // Reset input so the same file can be uploaded again
        e.target.value = '';
    };

    const handleExport = (type: 'png' | 'svg' | 'pdf') => {
        const flowElement = document.querySelector('.react-flow') as HTMLElement;
        if (!flowElement) return;

        switch (type) {
            case 'png':
                exportAsPng(flowElement, 'open-draw-diagram');
                break;
            case 'svg':
                exportAsSvg(flowElement, 'open-draw-diagram');
                break;
            case 'pdf':
                exportAsPdf(flowElement, 'open-draw-diagram');
                break;
        }
        setFileMenuOpen(false);
    };

    return (
        <div className={`flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-[#09090b] ${isDark ? 'dark' : ''}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
            />
            <input
                type="file"
                ref={svgFileInputRef}
                onChange={handleSvgFileUpload}
                className="hidden"
                accept=".svg"
            />

            {/* Main Toolbar / Header */}
            <div className="h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] px-4 flex items-center justify-between z-40 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252525] rounded transition-colors">
                        <Menu className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm text-gray-800 dark:text-white">OpenDraw</span>
                    </div>

                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                    {/* File Menu */}
                    <div className="relative" ref={fileMenuRef}>
                        <button
                            onClick={() => setFileMenuOpen(!fileMenuOpen)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#252525] rounded transition-colors"
                        >
                            File <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                        </button>

                        {fileMenuOpen && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workspace</div>
                                <button onClick={saveGraph} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <Download className="w-4 h-4" /> Save Graph (JSON)
                                </button>
                                <button onClick={loadGraph} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <Upload className="w-4 h-4" /> Load Graph
                                </button>

                                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Export</div>
                                <button onClick={() => handleExport('png')} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileImage className="w-4 h-4 text-purple-500" /> Export as PNG
                                </button>
                                <button onClick={() => handleExport('svg')} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileCode className="w-4 h-4 text-pink-500" /> Export as SVG
                                </button>
                                <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileText className="w-4 h-4 text-red-500" /> Export as PDF
                                </button>

                                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Import</div>
                                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileImage className="w-4 h-4 text-emerald-500" /> Import Image File
                                </button>
                                <button onClick={() => handleImport('svg')} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileCode className="w-4 h-4 text-pink-500" /> Import SVG String
                                </button>
                                <button onClick={() => svgFileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileCode className="w-4 h-4 text-emerald-500" /> Import SVG File
                                </button>
                                <button onClick={() => handleImport('xml')} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <FileCode className="w-4 h-4 text-orange-500" /> Import XML Stencil
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

                    {/* Basic Actions */}
                    <div className="flex items-center gap-1">
                        <button onClick={undo} disabled={!canUndo} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252525] rounded disabled:opacity-30">
                            <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button onClick={redo} disabled={!canRedo} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252525] rounded disabled:opacity-30">
                            <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDark(!isDark)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252525] rounded transition-colors">
                        {isDark ? <Sun className="w-4 h-4 text-gray-300" /> : <Moon className="w-4 h-4 text-gray-600" />}
                    </button>
                    <button
                        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                        className={`p-1.5 hover:bg-gray-100 dark:hover:bg-[#252525] rounded transition-colors ${rightSidebarOpen ? 'bg-gray-100 dark:bg-[#252525]' : ''}`}
                    >
                        {rightSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Shapes */}
                <div
                    className={`transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-800 overflow-hidden ${leftSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'}`}
                >
                    <ShapeLibrary onDragStart={onDragStart} />
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative h-full bg-slate-50 dark:bg-[#0f0f0f]">
                    <ReactFlowProvider>
                        <DrawCanvas openDraw={openDraw} isDark={isDark} />
                    </ReactFlowProvider>
                </div>

                {/* Right Sidebar: Properties */}
                <div
                    className={`transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-800 overflow-hidden ${rightSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'}`}
                >
                    <PropertiesPanel
                        selectedNodes={nodes.filter(n => selectedNodes.includes(n.id))}
                        selectedEdges={edges.filter(e => selectedEdges.includes(e.id))}
                        onNodeChange={handleNodeChange}
                        onEdgeChange={handleEdgeChange}
                        isOpen={rightSidebarOpen}
                        onClose={() => setRightSidebarOpen(false)}
                    />
                </div>
            </div>
        </div>
    );
}

