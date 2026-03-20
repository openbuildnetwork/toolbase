import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
    ReactFlowProvider,
    BackgroundVariant,
    useReactFlow,
    Node,
    Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodePalette, PaletteFilterContext } from './NodePalette';
import { InspectorPanel } from './InspectorPanel';
import { PipelineToolbar } from './PipelineToolbar';
import { InteractionModal } from './InteractionModal';
import { useFlowGraph } from './hooks/useFlowGraph';
import { useFlowEngineSync } from './hooks/useFlowEngineSync';
import { useGraphSerializer } from './hooks/useGraphSerializer';

import { ToolNode } from './nodes/ToolNode';
import { FileInputNode } from './nodes/FileInputNode';
import { OutputNode } from './nodes/OutputNode';
import { TIPEdge } from './edges/TIPEdge';

import { usePipelineEngine } from '@/hooks/usePipelineEngine';
import { usePipelines } from '@/hooks/usePipelines';
import { TIPToolRegistry } from '@/tip/registry';
import { workerForTool } from '@/workers/instances';

import { PipelineDefinition } from '@/types/pipeline';

const nodeTypes = {
    tool: ToolNode,
    fileInput: FileInputNode,
    output: OutputNode,
};

const edgeTypes = {
    tip: TIPEdge,
};

function FlowCanvasBuilder() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect, isValidConnection } = useFlowGraph();
    const { graphToPipeline } = useGraphSerializer();
    const { state, output, run, cancel, reset: resetEngine, isPaused, pause, resume } = usePipelineEngine();
    const { save, exportJson } = usePipelines();

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [interactionNodeId, setInteractionNodeId] = useState<string | null>(null);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

    const updateNodeData = useCallback((nodeId: string, partialData: any) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...partialData } } : n));
    }, [setNodes]);

    useFlowEngineSync(nodes, edges, setNodes, setEdges, state, output, graphToPipeline);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type) return;

        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const newNodeId = `node-${type}-${Date.now()}`;

        if (type === 'tool') {
            const toolId = event.dataTransfer.getData('application/toolId');
            const tool = TIPToolRegistry.get(toolId);
            if (!tool) return;
            const config = Object.fromEntries(tool.configSchema.fields.map(f => [f.key, f.default]));

            // Phase 2: Node-aware pre-warm — start booting the WASM runtime immediately
            // on node drop, before the user clicks Run. WorkerClient.init() is idempotent:
            // if idle pre-warm already started this resolves to the same in-flight promise.
            workerForTool(toolId)?.init().catch(() => {});

            setNodes(nds => nds.concat({
                id: newNodeId, type, position,
                data: {
                    toolId, config, status: 'idle',
                    // Inject INP callback immediately so Configure button works on first render
                    onOpenInteraction: () => setInteractionNodeId(newNodeId),
                }
            }));
        } else {
            setNodes(nds => nds.concat({ id: newNodeId, type, position, data: { status: 'idle', file: null } }));
        }
    }, [screenToFlowPosition, setNodes]);

    const clearIntermediateMemory = useCallback((nds: Node[]) => {
        // Blob URLs and file buffers take heavy memory; we clear them from intermediate preview state when running or resetting.
        return nds.map(n => {
            if (n.type === 'tool') {
                return { ...n, data: { ...n.data, status: 'idle', durationMs: 0, error: undefined, previewFiles: undefined } };
            }
            return { ...n, data: { ...n.data, status: 'idle', durationMs: 0, error: undefined, bundle: undefined } };
        });
    }, []);

    const handleRun = useCallback(async () => {
        setNodes(nds => clearIntermediateMemory(nds));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isRunning: false } })));
        resetEngine();
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;
        const fileNode = nodes.find(n => n.type === 'fileInput');
        const file = fileNode?.data.file;
        if (!file) return;
        await run(orderedSteps, file as File);
    }, [nodes, edges, graphToPipeline, run, resetEngine, setNodes, setEdges, clearIntermediateMemory]);

    const handleStop = useCallback(() => { cancel(); }, [cancel]);

    const handleReset = useCallback(() => {
        resetEngine();
        setNodes(nds => clearIntermediateMemory(nds));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isRunning: false } })));
    }, [resetEngine, setNodes, setEdges, clearIntermediateMemory]);

    const handleSave = useCallback(() => {
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;
        const def: PipelineDefinition = {
            id: crypto.randomUUID(),
            name: `Pipeline ${new Date().toLocaleTimeString()}`,
            steps: orderedSteps,
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
        };
        save(def);
    }, [nodes, edges, graphToPipeline, save]);

    const handleExport = useCallback(() => {
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;
        const def: PipelineDefinition = {
            id: crypto.randomUUID(),
            name: `Pipeline ${new Date().toLocaleTimeString()}`,
            steps: orderedSteps,
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
        };
        exportJson(def);
    }, [nodes, edges, graphToPipeline, exportJson]);

    const fileNode = nodes.find(n => n.type === 'fileInput');
    const outNode = nodes.find(n => n.type === 'output');
    const ordered = graphToPipeline(nodes, edges);
    const hasInvalidEdges = edges.some(e => e.data?.isInvalid);
    const canRun = !!fileNode?.data.file && !!outNode && !!ordered && ordered.length > 0 && !hasInvalidEdges;

    /**
     * Palette filter context — tells NodePalette which tools to highlight.
     * Priority: selected tool node > file in FileInputNode > no filter.
     */
    const paletteFilterContext = useMemo((): PaletteFilterContext => {
        // A tool node is selected → show tools that can consume what it produces
        if (selectedNode && selectedNode.type === 'tool') {
            const tool = TIPToolRegistry.get(selectedNode.data.toolId as string);
            if (tool && tool.produces.length > 0) {
                return { kind: 'node', produces: tool.produces };
            }
        }
        // FileInputNode has a file → show tools that consume that MIME type
        const uploadedFile = fileNode?.data.file as File | null;
        if (uploadedFile?.type) {
            return { kind: 'file', mimeType: uploadedFile.type };
        }
        return { kind: 'none' };
    }, [selectedNode, fileNode]);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: '#0b0b0d',
            overflow: 'hidden',
        }}
            ref={reactFlowWrapper}
        >
            {/* Strip React Flow's default white node wrapper background */}
            <style>{`
                .react-flow__node { background: transparent !important; border: none !important; border-radius: 0 !important; padding: 0 !important; }
                .react-flow__node.selected > div { outline: none !important; }
                .react-flow__node:focus { outline: none !important; }
                .react-flow__controls-button { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; fill: #888 !important; }
                .react-flow__controls-button:hover { background: rgba(255,255,255,0.1) !important; fill: #ccc !important; }
            `}</style>
            {/* Floating toolbar at top-center */}
            <PipelineToolbar
                onRun={handleRun}
                onStop={handleStop}
                onPause={pause}
                onResume={resume}
                onReset={handleReset}
                onSave={handleSave}
                onExport={handleExport}
                isRunning={state.status === 'running'}
                isPaused={isPaused}
                canRun={canRun}
            />

            {/* Floating NodePalette on left */}
            <NodePalette filterContext={paletteFilterContext} />

            {/* INP: Interaction modal — shown when a tool node's Configure button is clicked */}
            {interactionNodeId && (() => {
                const interactionNode = nodes.find(n => n.id === interactionNodeId);
                const interactionTool = interactionNode?.data.toolId
                    ? TIPToolRegistry.get(interactionNode.data.toolId as string)
                    : null;
                if (!interactionTool?.interactable || !interactionTool.getInteractionComponent) return null;

                // Resolve seed files: collect outputs from all upstream nodes recursively.
                // We prefer data.previewFiles (from background execution), then data.interactionFiles, then data.file.
                const getUpstreamFilesRecursive = (nodeId: string): File[] => {
                    const parentEdges = edges.filter(e => e.target === nodeId);
                    const files: File[] = [];
                    for (const edge of parentEdges) {
                        const parentNode = nodes.find(n => n.id === edge.source);
                        if (!parentNode) continue;

                        const data = parentNode.data;
                        if (Array.isArray(data.previewFiles) && data.previewFiles.length > 0) {
                            files.push(...(data.previewFiles as File[]));
                            continue;
                        }
                        if (Array.isArray(data.interactionFiles) && data.interactionFiles.length > 0) {
                            files.push(...(data.interactionFiles as File[]));
                            continue;
                        }
                        if (data.file instanceof File) {
                            files.push(data.file);
                            continue;
                        }

                        // Recurse to find the inherited seed file from further upstream
                        files.push(...getUpstreamFilesRecursive(parentNode.id));
                    }
                    return files;
                };

                const upstreamFiles = getUpstreamFilesRecursive(interactionNodeId);

                const seedFiles: File[] =
                    upstreamFiles.length > 0
                        ? upstreamFiles
                        : (interactionNode?.data.interactionFiles as File[] | undefined) ?? [];

                return (
                    <InteractionModal
                        tool={interactionTool}
                        seedFiles={seedFiles}
                        config={(interactionNode?.data.config as Record<string, unknown>) ?? {}}
                        onConfirm={async (result) => {
                            const hasUpstream = edges.some(e => e.target === interactionNodeId);

                            // Standalone mode: user browsed files directly in the modal.
                            // Auto-create a FileInputNode for each confirmed file and wire them up.
                            if (!hasUpstream && result.files.length > 0) {
                                const mx = interactionNode?.position?.x ?? 500;
                                const my = interactionNode?.position?.y ?? 300;
                                const gap = 170;
                                const totalH = (result.files.length - 1) * gap;

                                const fileNodes: Node[] = result.files.map((file, i) => {
                                    const nid = `file-input-auto-${Date.now()}-${i}`;
                                    return {
                                        id: nid,
                                        type: 'fileInput',
                                        position: { x: mx - 290, y: my - totalH / 2 + i * gap },
                                        data: {
                                            file,
                                            onFileSelect: (f: File | null) => updateNodeData(nid, { file: f }),
                                        },
                                    };
                                });

                                const fileEdges: Edge[] = fileNodes.map(n => ({
                                    id: `edge-${n.id}-${interactionNodeId}`,
                                    source: n.id,
                                    target: interactionNodeId,
                                    type: 'tip',
                                    data: { isRunning: false },
                                }));

                                setNodes(prev => [...prev, ...fileNodes]);
                                setEdges(prev => [...prev, ...fileEdges]);
                            }

                            const newConfig = { ...((interactionNode?.data.config as Record<string, unknown>) ?? {}), ...result.config } as import('@/tip/protocol').TIPConfig;

                            updateNodeData(interactionNodeId, {
                                interactionFiles: result.files,
                                interactionDone: true,
                                isPreviewing: true, // Show loading spinner
                                ...(result.config ? { config: newConfig } : {}),
                            });

                            // Close modal immediately so user isn't blocked by execution
                            setInteractionNodeId(null);

                            // Run the executor in the background to generate preview data for downstream nodes
                            if (interactionTool && result.files.length > 0) {
                                try {
                                    const { bundleFromFiles } = await import('@/tip/bundle');
                                    const inputBundle = bundleFromFiles(result.files);

                                    const dummyHooks = {
                                        onProgress: () => { },
                                        onLog: () => { },
                                        signal: new AbortController().signal
                                    };

                                    const outputBundle = await interactionTool.invoke(inputBundle, newConfig, dummyHooks);

                                    const previewFiles = outputBundle.payloads.map(p =>
                                        new File([p.data], p.meta.filename || 'preview', { type: p.meta.mimeType as string })
                                    );

                                    updateNodeData(interactionNodeId, {
                                        isPreviewing: false,
                                        previewFiles
                                    });
                                } catch (err) {
                                    console.error("Background preview execution failed:", err);
                                    updateNodeData(interactionNodeId, { isPreviewing: false });
                                }
                            } else {
                                updateNodeData(interactionNodeId, { isPreviewing: false });
                            }
                        }}
                        onCancel={() => setInteractionNodeId(null)}
                    />
                );
            })()}

            {/* Flow canvas */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onSelectionChange={(params) => {
                    if (params.nodes.length > 0) setSelectedNodeId(params.nodes[0].id);
                    else setSelectedNodeId(null);
                }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes as any}
                connectionMode={ConnectionMode.Loose}
                defaultEdgeOptions={{ type: 'tip', animated: false }}
                snapToGrid={true}
                snapGrid={[20, 20]}
                fitView
                minZoom={0.15}
                maxZoom={2.5}
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode="Shift"
                selectionOnDrag
                style={{ background: '#0b0b0d' }}
            >
                {/* Dark dot grid background */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={28}
                    size={1}
                    color="rgba(255,255,255,0.07)"
                />
                <Controls
                    style={{
                        background: 'rgba(14,14,16,0.9)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        bottom: 80,
                        left: 16,
                    }}
                />
                <MiniMap
                    zoomable
                    pannable
                    style={{
                        background: 'rgba(14,14,16,0.9)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        bottom: 16,
                        right: 296,
                    }}
                    nodeColor={(n) => {
                        if (n.type === 'fileInput') return '#4ade80';
                        if (n.type === 'output') return '#34d399';
                        return '#8b5cf6';
                    }}
                    maskColor="rgba(0,0,0,0.6)"
                />
            </ReactFlow>

            {/* Floating InspectorPanel on right */}
            <InspectorPanel selectedNode={selectedNode} updateNodeData={updateNodeData} />
        </div>
    );
}

export function FlowCanvas() {
    return (
        <ReactFlowProvider>
            <FlowCanvasBuilder />
        </ReactFlowProvider>
    );
}
