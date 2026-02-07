
import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useOpenDraw } from '@/hooks/useOpenDraw';
import { DrawCanvas } from '../canvas/DrawCanvas';
import { ShapeLibrary } from '../panels/ShapeLibrary';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { Undo2, Redo2, Download, Upload, Moon, Sun, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function OpenDrawLayout() {
    const openDraw = useOpenDraw();
    const { undo, redo, canUndo, canRedo, saveGraph, loadGraph, nodes, edges, setNodes, setEdges, selectedNodes, selectedEdges } = openDraw;

    const [isDark, setIsDark] = useState(false);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

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

    return (
        <div className={`flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-white dark:bg-[#09090b] ${isDark ? 'dark' : ''}`}>

            {/* Main Toolbar / Header */}
            <div className="h-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] px-4 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252525] rounded transition-colors">
                        <Menu className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm text-gray-800 dark:text-white">OpenDraw</span>
                        <span className="text-xs text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">v2.0</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2" />

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
                    <Button onClick={saveGraph} variant="secondary" className="h-8 text-xs gap-2">
                        <Download className="w-3.5 h-3.5" /> Save
                    </Button>
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
