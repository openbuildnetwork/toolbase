'use client';

import { ReactFlowProvider, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { Toolbar } from '@/components/features/open-draw/Toolbar';
import { DrawCanvas } from '@/components/features/open-draw/DrawCanvas';
import { AnalysisPanel } from '@/components/features/open-draw/AnalysisPanel';
import { ImportExportPanel } from '@/components/features/open-draw/ImportExportPanel';
import { PropertiesPanel } from '@/components/features/open-draw/PropertiesPanel';
import { useOpenDraw } from '@/hooks/useOpenDraw';
import { useOpenDrawWorker } from '@/hooks/useOpenDrawWorker';
import { Button } from '@/components/ui/Button';
import { Download, Upload, FileJson, Undo2, Redo2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { Graph, GraphNode as GraphNodeType } from '@/types/open-draw.types';

type LayoutAlgorithm = 'hierarchical' | 'circular' | 'spring';

function OpenDrawView() {
    const openDraw = useOpenDraw();
    const worker = useOpenDrawWorker();

    const {
        saveGraph,
        loadGraph,
        undo,
        redo,
        canUndo,
        canRedo,
        undoCount,
        redoCount,
        nodes,
        edges,
        setNodes,
        setEdges,
        selectedNodes,
        selectedEdges,
        rfInstance
    } = openDraw;

    const [isDark, setIsDark] = useState(false);
    const [isLayoutLoading, setIsLayoutLoading] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [isImportExportOpen, setIsImportExportOpen] = useState(false);
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(true); // Default open

    /**
     * Build a Graph object from current React Flow state.
     */
    const buildGraph = useCallback((): Graph => {
        return {
            nodes: nodes.map((n) => ({
                id: n.id,
                type: (n.type as 'rectangle' | 'circle' | 'diamond' | 'text') || 'rectangle',
                position: n.position,
                data: {
                    label: String(n.data?.label || 'Node'),
                },
                width: n.measured?.width ?? n.width ?? 120,
                height: n.measured?.height ?? n.height ?? 80,
            })),
            edges: edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle || undefined,
                targetHandle: e.targetHandle || undefined,
                type: (e.type as 'smoothstep' | 'straight' | 'bezier') || 'smoothstep',
                animated: e.animated || false,
                label: typeof e.label === 'string' ? e.label : undefined,
            })),
            viewport: rfInstance?.getViewport(),
        };
    }, [nodes, edges, rfInstance]);

    /**
     * Apply auto-layout using the Python worker.
     */
    const handleApplyLayout = useCallback(async (algorithm: LayoutAlgorithm) => {
        if (!worker.isReady || nodes.length === 0) {
            console.warn('[OpenDraw] Cannot apply layout: worker not ready or no nodes');
            return;
        }

        setIsLayoutLoading(true);

        try {
            const graph = buildGraph();
            console.log(`[OpenDraw] Applying ${algorithm} layout to ${nodes.length} nodes...`);

            const layoutedNodes = await worker.applyLayout(graph, algorithm);

            setNodes((currentNodes) =>
                currentNodes.map((node) => {
                    const layoutedNode = layoutedNodes.find((ln) => ln.id === node.id);
                    if (layoutedNode) {
                        return {
                            ...node,
                            position: layoutedNode.position,
                        };
                    }
                    return node;
                })
            );

            setTimeout(() => {
                rfInstance?.fitView({ padding: 0.2, duration: 300 });
            }, 50);

            console.log(`[OpenDraw] Layout applied successfully`);
        } catch (error) {
            console.error('[OpenDraw] Layout failed:', error);
        } finally {
            setIsLayoutLoading(false);
        }
    }, [worker, nodes, buildGraph, setNodes, rfInstance]);

    /**
     * Detect cycles in the graph.
     */
    const handleDetectCycles = useCallback(async () => {
        const graph = buildGraph();
        const result = await worker.detectCycles(graph);
        return result;
    }, [worker, buildGraph]);

    /**
     * Find shortest path between two nodes.
     */
    const handleFindPath = useCallback(async (sourceId: string, targetId: string) => {
        const graph = buildGraph();
        const result = await worker.findShortestPath(graph, sourceId, targetId);
        return {
            sourceId,
            targetId,
            path: result.path,
            length: result.length,
        };
    }, [worker, buildGraph]);

    /**
     * Highlight nodes on the canvas.
     */
    const handleHighlightNodes = useCallback((nodeIds: string[], color: 'red' | 'blue' | 'green' | null) => {
        setNodes((currentNodes) =>
            currentNodes.map((node) => {
                const isHighlighted = nodeIds.includes(node.id);
                const style: React.CSSProperties = { ...node.style };

                if (isHighlighted && color) {
                    const colorMap = {
                        red: { border: '3px solid #ef4444', boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)' },
                        blue: { border: '3px solid #3b82f6', boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)' },
                        green: { border: '3px solid #22c55e', boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)' },
                    };
                    Object.assign(style, colorMap[color]);
                } else {
                    delete style.border;
                    delete style.boxShadow;
                }

                return { ...node, style };
            })
        );
    }, [setNodes]);

    /**
     * Highlight edges on the canvas.
     */
    const handleHighlightEdges = useCallback((edgeIds: string[], color: 'red' | 'blue' | 'green' | null) => {
        setEdges((currentEdges) =>
            currentEdges.map((edge) => {
                const isHighlighted = edgeIds.includes(edge.id);
                const style: React.CSSProperties = { ...edge.style };

                if (isHighlighted && color) {
                    const colorMap = {
                        red: '#ef4444',
                        blue: '#3b82f6',
                        green: '#22c55e',
                    };
                    style.stroke = colorMap[color];
                    style.strokeWidth = 3;
                } else {
                    delete style.stroke;
                    delete style.strokeWidth;
                }

                return { ...edge, style };
            })
        );
    }, [setEdges]);

    /**
     * Import Mermaid diagram.
     */
    const handleImportMermaid = useCallback(async (content: string) => {
        if (!worker.isReady) {
            throw new Error('Worker not ready');
        }

        const graph = await worker.parseMermaid(content);

        // Convert GraphNode to React Flow Node format
        const newNodes = graph.nodes.map((n: GraphNodeType) => ({
            id: n.id,
            type: n.type || 'rectangle',
            position: n.position,
            data: { label: n.data.label },
            style: { width: n.width || 120, height: n.height || 80 },
        }));

        const newEdges = graph.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type || 'smoothstep',
            animated: e.animated || false,
            label: e.label,
        }));

        setNodes(newNodes);
        setEdges(newEdges);

        setTimeout(() => {
            rfInstance?.fitView({ padding: 0.2, duration: 300 });
        }, 100);
    }, [worker, setNodes, setEdges, rfInstance]);

    /**
     * Import XML diagram.
     */
    const handleImportXML = useCallback(async (content: string) => {
        if (!worker.isReady) {
            throw new Error('Worker not ready');
        }

        const graph = await worker.parseXML(content);

        const newNodes = graph.nodes.map((n: GraphNodeType) => ({
            id: n.id,
            type: n.type || 'rectangle',
            position: n.position,
            data: { label: n.data.label },
            style: { width: n.width || 120, height: n.height || 80 },
        }));

        const newEdges = graph.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type || 'smoothstep',
            animated: e.animated || false,
            label: e.label,
        }));

        setNodes(newNodes);
        setEdges(newEdges);

        setTimeout(() => {
            rfInstance?.fitView({ padding: 0.2, duration: 300 });
        }, 100);
    }, [worker, setNodes, setEdges, rfInstance]);

    /**
     * Export to JSON.
     */
    const handleExportJSON = useCallback(() => {
        const graph = buildGraph();
        return JSON.stringify(graph, null, 2);
    }, [buildGraph]);

    /**
     * Export to Mermaid syntax.
     */
    const handleExportMermaid = useCallback(() => {
        const lines: string[] = ['graph TD'];

        // Add nodes with labels
        nodes.forEach((node) => {
            const label = node.data?.label || node.id;
            if (node.type === 'diamond') {
                lines.push(`    ${node.id}{${label}}`);
            } else if (node.type === 'circle') {
                lines.push(`    ${node.id}((${label}))`);
            } else {
                lines.push(`    ${node.id}[${label}]`);
            }
        });

        // Add edges
        edges.forEach((edge) => {
            const label = edge.label ? `|${edge.label}|` : '';
            lines.push(`    ${edge.source} -->${label} ${edge.target}`);
        });

        return lines.join('\n');
    }, [nodes, edges]);

    /**
     * Export to PNG.
     */
    const handleExportPNG = useCallback(async () => {
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewport || nodes.length === 0) {
            throw new Error('No content to export');
        }

        try {
            const dataUrl = await toPng(viewport, {
                backgroundColor: isDark ? '#0a0a0a' : '#f8fafc',
                width: viewport.offsetWidth * 2,
                height: viewport.offsetHeight * 2,
                style: {
                    transform: 'scale(2)',
                    transformOrigin: 'top left',
                },
            });

            const link = document.createElement('a');
            link.download = 'diagram.png';
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('[OpenDraw] PNG export failed:', error);
            throw error;
        }
    }, [nodes, isDark]);

    return (
        <div className={`flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50 dark:bg-[#09090b] ${isDark ? 'dark' : ''}`}>
            {/* Tool Header */}
            <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] px-6 flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">OpenDraw</h1>
                        <p className="text-xs text-gray-500">Infinite Canvas Diagramming</p>
                    </div>
                </div>

                {/* Undo/Redo Controls */}
                <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={`Undo (Ctrl+Z) - ${undoCount} steps available`}
                    >
                        <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={`Redo (Ctrl+Shift+Z) - ${redoCount} steps available`}
                    >
                        <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    {(undoCount > 0 || redoCount > 0) && (
                        <span className="ml-2 text-xs text-gray-400 tabular-nums">
                            {undoCount}/{undoCount + redoCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={loadGraph} variant="secondary" className="gap-2 text-gray-700 dark:text-gray-200">
                        <Upload className="w-4 h-4" />
                        Load
                    </Button>
                    <Button onClick={saveGraph} variant="primary" className="gap-2 text-white">
                        <Download className="w-4 h-4" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                <Toolbar
                    isDark={isDark}
                    onToggleTheme={() => setIsDark(!isDark)}
                    onApplyLayout={handleApplyLayout}
                    isLayoutLoading={isLayoutLoading}
                    workerReady={worker.isReady}
                    onToggleAnalysis={() => setIsAnalysisOpen(!isAnalysisOpen)}
                    isAnalysisOpen={isAnalysisOpen}
                    onToggleImportExport={() => setIsImportExportOpen(!isImportExportOpen)}
                    isImportExportOpen={isImportExportOpen}
                    onToggleProperties={() => setIsPropertiesOpen(!isPropertiesOpen)}
                    isPropertiesOpen={isPropertiesOpen}
                />
                <div className="flex-1 relative h-full">
                    <ReactFlowProvider>
                        <DrawCanvas openDraw={openDraw} isDark={isDark} />
                    </ReactFlowProvider>

                    {/* Analysis Panel */}
                    <AnalysisPanel
                        isOpen={isAnalysisOpen}
                        onClose={() => setIsAnalysisOpen(false)}
                        selectedNodes={selectedNodes}
                        onDetectCycles={handleDetectCycles}
                        onFindPath={handleFindPath}
                        onHighlightNodes={handleHighlightNodes}
                        onHighlightEdges={handleHighlightEdges}
                        isWorkerReady={worker.isReady}
                        nodeCount={nodes.length}
                    />

                    {/* Import/Export Panel */}
                    <ImportExportPanel
                        isOpen={isImportExportOpen}
                        onClose={() => setIsImportExportOpen(false)}
                        onImportMermaid={handleImportMermaid}
                        onImportXML={handleImportXML}
                        onExportJSON={handleExportJSON}
                        onExportMermaid={handleExportMermaid}
                        onExportPNG={handleExportPNG}
                        isWorkerReady={worker.isReady}
                    />

                    {/* Properties Panel */}
                    <PropertiesPanel
                        selectedNodes={nodes.filter(n => selectedNodes.includes(n.id)) as any}
                        selectedEdges={edges.filter(e => selectedEdges.includes(e.id)) as any}
                        onNodeChange={(changes) => {
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
                        }}
                        onEdgeChange={(changes) => {
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
                        }}
                        onClose={() => setIsPropertiesOpen(false)}
                        isOpen={isPropertiesOpen}
                    />
                </div>
            </div>

            {/* Worker Loading Overlay (shown briefly on first load) */}
            {worker.isLoading && (
                <div className="absolute bottom-4 left-20 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center gap-3 z-50">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        Loading layout engine...
                    </span>
                </div>
            )}
        </div>
    );
}

export default function OpenDrawPage() {
    return <OpenDrawView />;
}
'use client';

import { OpenDrawLayout } from '@/components/features/open-draw/layouts/MainLayout';

function OpenDrawView() {
    return (
        <OpenDrawLayout />
    );
}

export default function OpenDrawPage() {
    return <OpenDrawView />;
}
