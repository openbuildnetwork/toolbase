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
import { useGraphSerializer } from './hooks/useGraphSerializer';

import { ToolNode } from './nodes/ToolNode';
import { FileInputNode } from './nodes/FileInputNode';
import { OutputNode } from './nodes/OutputNode';
import { TIPEdge } from './edges/TIPEdge';

import { usePipelineEngine } from '@/hooks/usePipelineEngine';
import { usePipelines } from '@/hooks/usePipelines';
import { TIPToolRegistry } from '@/tip/registry';

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

    const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect } = useFlowGraph();
    const { graphToPipeline } = useGraphSerializer();
    const { state, output, run, cancel, reset: resetEngine } = usePipelineEngine();
    const { save, exportJson } = usePipelines();

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [interactionNodeId, setInteractionNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (nodes.length === 0) {
            setNodes([
                { id: 'node-file', type: 'fileInput', position: { x: 140, y: 240 }, data: { status: 'idle', file: null } },
                { id: 'node-out', type: 'output', position: { x: 680, y: 240 }, data: { status: 'idle' } }
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

    const updateNodeData = useCallback((nodeId: string, partialData: any) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...partialData } } : n));
    }, [setNodes]);

    // Sync file-select, download, and INP callbacks into nodes
    useEffect(() => {
        setNodes(nds => nds.map(n => {
            if (n.type === 'fileInput') {
                return { ...n, data: { ...n.data, onFileSelect: (f: File | null) => updateNodeData(n.id, { file: f }) } };
            }
            if (n.type === 'tool') {
                // Inject INP open callback so ToolNode button can trigger the modal
                return { ...n, data: { ...n.data, onOpenInteraction: () => setInteractionNodeId(n.id) } };
            }
            if (n.type === 'output') {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        onDownload: async () => {
                            if (!output) return;
                            output.payloads.forEach((payload, i) => {
                                setTimeout(() => {
                                    const url = URL.createObjectURL(payload.data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = payload.meta.filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    setTimeout(() => URL.revokeObjectURL(url), 100);
                                }, i * 200);
                            });
                        }
                    }
                };
            }
            return n;
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [output]);

    // Sync engine state to canvas
    useEffect(() => {
        if (state.status === 'idle') return;
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;

        setNodes(nds => nds.map(n => {
            if (n.type === 'fileInput') {
                const s = state.status === 'running' ? 'running' : state.status === 'complete' ? 'complete' : 'idle';
                return { ...n, data: { ...n.data, status: s } };
            }
            if (n.type === 'tool') {
                const stepIndex = orderedSteps.findIndex(s => s.id === n.id);
                if (stepIndex >= 0 && state.steps[stepIndex]) {
                    const ss = state.steps[stepIndex];
                    let nextStatus = 'idle';
                    if (ss.status === 'running') nextStatus = 'running';
                    if (ss.status === 'complete') nextStatus = 'complete';
                    if (ss.status === 'error') nextStatus = 'error';
                    return { ...n, data: { ...n.data, status: nextStatus, durationMs: ss.durationMs, error: ss.error } };
                }
            }
            if (n.type === 'output' && state.status === 'complete') {
                const totalDurationMs = state.steps.reduce((acc, step) => acc + (step.durationMs || 0), 0);
                return { ...n, data: { ...n.data, status: 'complete', bundle: output, totalDurationMs } };
            }
            return n;
        }));

        setEdges(eds => eds.map(e => {
            if (state.status === 'idle' || state.status === 'complete') {
                return { ...e, data: { ...e.data, isRunning: false } };
            }
            let runningEdgeId = '';
            const runningStepIndex = state.steps.findIndex(s => s.status === 'running');
            if (runningStepIndex === -1 && state.status === 'running') {
                const fileNodeId = nodes.find(n => n.type === 'fileInput')?.id;
                runningEdgeId = eds.find(edge => edge.source === fileNodeId)?.id || '';
            } else if (runningStepIndex >= 0) {
                const runningStepId = orderedSteps[runningStepIndex]?.id;
                runningEdgeId = eds.find(edge => edge.source === runningStepId)?.id || '';
            }
            return { ...e, data: { ...e.data, isRunning: e.id === runningEdgeId } };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, output]);

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

    const handleRun = useCallback(async () => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', durationMs: 0, error: undefined, bundle: undefined } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isRunning: false } })));
        resetEngine();
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;
        const fileNode = nodes.find(n => n.type === 'fileInput');
        const file = fileNode?.data.file;
        if (!file) return;
        await run(orderedSteps, file as File, nodes);
    }, [nodes, edges, graphToPipeline, run, resetEngine, setNodes, setEdges]);

    const handleStop = useCallback(() => { cancel(); }, [cancel]);

    const handleReset = useCallback(() => {
        resetEngine();
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', error: undefined, bundle: undefined } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isRunning: false } })));
    }, [resetEngine, setNodes, setEdges]);

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
                onReset={handleReset}
                onSave={handleSave}
                onExport={handleExport}
                isRunning={state.status === 'running'}
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

                // Resolve seed files: prefer files from upstream FileInputNodes,
                // fall back to previously confirmed interactionFiles, then empty.
                const upstreamFiles = edges
                    .filter(e => e.target === interactionNodeId)
                    .map(e => nodes.find(n => n.id === e.source))
                    .filter(Boolean)
                    .map(n => n?.data.file as File | null)
                    .filter((f): f is File => !!f);

                const seedFiles: File[] =
                    upstreamFiles.length > 0
                        ? upstreamFiles
                        : (interactionNode?.data.interactionFiles as File[] | undefined) ?? [];

                return (
                    <InteractionModal
                        tool={interactionTool}
                        seedFiles={seedFiles}
                        config={(interactionNode?.data.config as Record<string, unknown>) ?? {}}
                        onConfirm={(result) => {
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
                                        position: {
                                            x: mx - 290,
                                            y: my - totalH / 2 + i * gap,
                                        },
                                        data: {
                                            file,
                                            // Inject the update callback so user can swap files later
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

                            updateNodeData(interactionNodeId, {
                                interactionFiles: result.files,
                                interactionDone: true,
                                ...(result.config ? { config: { ...((interactionNode?.data.config as Record<string, unknown>) ?? {}), ...result.config } } : {}),
                            });
                            setInteractionNodeId(null);
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
