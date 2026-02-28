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

import { NodePalette } from './NodePalette';
import { InspectorPanel } from './InspectorPanel';
import { PipelineToolbar } from './PipelineToolbar';
import { useFlowGraph } from './hooks/useFlowGraph';
import { useGraphSerializer } from './hooks/useGraphSerializer';

import { ToolNode } from './nodes/ToolNode';
import { FileInputNode } from './nodes/FileInputNode';
import { OutputNode } from './nodes/OutputNode';
import { TIPEdge } from './edges/TIPEdge';

import { usePipelineEngine } from '@/hooks/usePipelineEngine';
import { usePipelines } from '@/hooks/usePipelines';
import { TIPToolRegistry } from '@/tip/registry';

import { PipelineDefinition, PipelineStep } from '@/types/pipeline';

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

    // Initial empty graph logic:
    // User wants [📁 File Input] and [📦 Output] by default if they drag them in,
    // or we can auto-place them if the canvas is empty.
    useEffect(() => {
        if (nodes.length === 0) {
            setNodes([
                { id: 'node-file', type: 'fileInput', position: { x: 100, y: 300 }, data: { status: 'idle', file: null } },
                { id: 'node-out', type: 'output', position: { x: 800, y: 300 }, data: { status: 'idle' } }
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

    const updateNodeData = useCallback((nodeId: string, partialData: any) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...partialData } } : n));
    }, [setNodes]);

    // File Input selected callback
    useEffect(() => {
        setNodes(nds => nds.map(n => {
            if (n.type === 'fileInput') {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        onFileSelect: (f: File | null) => updateNodeData(n.id, { file: f })
                    }
                };
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
                    const stepState = state.steps[stepIndex];
                    let nextStatus = 'idle';
                    if (stepState.status === 'running') nextStatus = 'running';
                    if (stepState.status === 'complete') nextStatus = 'complete';
                    if (stepState.status === 'error') nextStatus = 'error';

                    return {
                        ...n,
                        data: {
                            ...n.data,
                            status: nextStatus,
                            durationMs: stepState.durationMs,
                            error: stepState.error
                        }
                    };
                }
            }
            if (n.type === 'output') {
                if (state.status === 'complete') {
                    const totalDurationMs = state.steps.reduce((acc, step) => acc + (step.durationMs || 0), 0);
                    return { ...n, data: { ...n.data, status: 'complete', bundle: output, totalDurationMs } };
                }
            }
            return n;
        }));

        // Animate edges
        setEdges(eds => eds.map(e => {
            if (state.status === 'idle' || state.status === 'complete') {
                return { ...e, data: { ...e.data, isRunning: false } };
            }

            // Figure out which edge is running
            let runningEdgeId = '';
            const runningStepIndex = state.steps.findIndex(s => s.status === 'running');

            if (runningStepIndex === -1 && state.status === 'running') {
                // If starting, edge out of file node
                const fileNodeId = nodes.find(n => n.type === 'fileInput')?.id;
                runningEdgeId = eds.find(edge => edge.source === fileNodeId)?.id || '';
            } else if (runningStepIndex >= 0) {
                // Edge OUT of the running step
                const runningStepId = orderedSteps[runningStepIndex]?.id;
                runningEdgeId = eds.find(edge => edge.source === runningStepId)?.id || '';
            }

            return {
                ...e,
                data: {
                    ...e.data,
                    isRunning: e.id === runningEdgeId
                }
            };
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

        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        const newNodeId = `node-${type}-${Date.now()}`;

        if (type === 'tool') {
            const toolId = event.dataTransfer.getData('application/toolId');
            const tool = TIPToolRegistry.get(toolId);
            if (!tool) return;

            const config = Object.fromEntries(tool.configSchema.fields.map(f => [f.key, f.default]));

            setNodes((nds) => nds.concat({
                id: newNodeId,
                type,
                position,
                data: { toolId, config, status: 'idle' }
            }));
        } else {
            setNodes((nds) => nds.concat({
                id: newNodeId,
                type,
                position,
                data: { status: 'idle', file: null }
            }));
        }
    }, [screenToFlowPosition, setNodes]);


    // Toolbar Handlers
    const handleRun = useCallback(async () => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle', durationMs: 0, error: undefined, bundle: undefined } })));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isRunning: false } })));

        resetEngine();

        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;

        const fileNode = nodes.find(n => n.type === 'fileInput');
        const file = fileNode?.data.file;

        if (!file) return;

        await run(orderedSteps, file as File);
    }, [nodes, edges, graphToPipeline, run, resetEngine, setNodes, setEdges]);

    const handleStop = useCallback(() => {
        cancel();
        // UI naturally syncs back via state effect
    }, [cancel]);

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
            name: `Flow Pipeline ${new Date().toLocaleTimeString()}`,
            steps: orderedSteps,
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
        };
        save(def);
        alert('Pipeline Saved!');
    }, [nodes, edges, graphToPipeline, save]);

    const handleExport = useCallback(() => {
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;
        const def: PipelineDefinition = {
            id: crypto.randomUUID(),
            name: `Flow Pipeline ${new Date().toLocaleTimeString()}`,
            steps: orderedSteps,
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
        };
        exportJson(def);
    }, [nodes, edges, graphToPipeline, exportJson]);

    // Validation
    const fileNode = nodes.find(n => n.type === 'fileInput');
    const outNode = nodes.find(n => n.type === 'output');
    const ordered = graphToPipeline(nodes, edges);
    const hasInvalidEdges = edges.some(e => e.data?.isInvalid);

    const canRun = !!fileNode?.data.file && !!outNode && !!ordered && ordered.length > 0 && !hasInvalidEdges;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
            <PipelineToolbar
                onRun={handleRun}
                onStop={handleStop}
                onReset={handleReset}
                onSave={handleSave}
                onExport={handleExport}
                isRunning={state.status === 'running'}
                canRun={canRun}
            />

            <div className="flex flex-1 overflow-hidden" ref={reactFlowWrapper}>
                <NodePalette />

                <div className="flex-1 h-full relative" >
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
                        minZoom={0.2}
                        deleteKeyCode={['Backspace', 'Delete']}
                        multiSelectionKeyCode="Shift"
                        selectionOnDrag
                    >
                        <Background color="#1a1a1a" gap={20} size={1} variant={BackgroundVariant.Dots} className="opacity-10" />
                        <Controls className="bg-white border-gray-200 shadow-sm" />
                        <MiniMap
                            zoomable
                            pannable
                            className="bg-white border-gray-200 rounded-lg overflow-hidden shadow-sm"
                            nodeColor={(n) => {
                                if (n.type === 'fileInput') return '#22c55e';
                                if (n.type === 'output') return '#10b981';
                                return '#8b5cf6';
                            }}
                            maskColor="rgba(0,0,0,0.05)"
                        />
                    </ReactFlow>
                </div>

                <InspectorPanel selectedNode={selectedNode} updateNodeData={updateNodeData} />
            </div>
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
