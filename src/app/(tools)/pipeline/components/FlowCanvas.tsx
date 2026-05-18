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
    ConnectionLineComponentProps,
    Node,
    Edge,
    NodeChange,
    Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodePalette, PaletteFilterContext } from './NodePalette';
import { InspectorPanel } from './InspectorPanel';
import { PipelineToolbar } from './PipelineToolbar';
import { ToolCopilot } from '@/components/ai/ToolCopilot';
import { InteractionModal } from './InteractionModal';
import { SavePipelineModal } from './SavePipelineModal';
import { useFlowGraph } from './hooks/useFlowGraph';
import { useFlowEngineSync } from './hooks/useFlowEngineSync';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useGraphSerializer } from './hooks/useGraphSerializer';
import { SavedPipelinesModal } from './SavedPipelinesModal';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import type { TIPPayload } from '@/tip/protocol';

import { ToolNode } from './nodes/ToolNode';
import { FileInputNode } from './nodes/FileInputNode';
import { OutputNode } from './nodes/OutputNode';
import { HumanReviewNode } from './nodes/HumanReviewNode';
import { TIPEdge } from './edges/TIPEdge';

import { usePipelineEngine } from '@/app/(tools)/pipeline/hooks/usePipelineEngine';
import { usePipelines } from '@/app/(tools)/pipeline/hooks/usePipelines';
import { TIPToolRegistry } from '@/tip/registry';
import { workerForTool } from '@/workers/instances';
import { ReviewSync } from '@/lib/review-sync';
import { useAIChat } from '@/app/(tools)/ai-chat/hooks/useAIChat';

import { PipelineDefinition } from '@/app/(tools)/pipeline/types/pipeline';

const nodeTypes = {
    tool: ToolNode,
    fileInput: FileInputNode,
    output: OutputNode,
    humanReview: HumanReviewNode,
};

const edgeTypes = {
    tip: TIPEdge,
};

const TIPConnectionLine = ({ fromX, fromY, toX, toY, connectionStatus }: ConnectionLineComponentProps) => {
    const isInvalid = connectionStatus === 'invalid';
    const color = isInvalid ? '#ef4444' : '#8b5cf6';

    return (
        <g>
            <path
                fill="none"
                stroke={color}
                strokeWidth={2}
                style={{
                    transition: 'stroke 0.2s ease',
                    strokeDasharray: isInvalid ? 'none' : '5,5',
                    animation: isInvalid ? 'none' : 'dashdraw 0.5s linear infinite',
                }}
                d={`M${fromX},${fromY} C${fromX + 50},${fromY} ${toX - 50},${toY} ${toX},${toY}`}
            />
            <circle cx={toX} cy={toY} fill="#fff" r={3} strokeWidth={1.5} stroke={color} />
        </g>
    );
};

function FlowCanvasBuilder() {
    const { updateToolState, recordRuntimeEvent } = useAIChat();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const clipboard = useRef<{ nodes: Node[], edges: Edge[] } | null>(null);
    const { screenToFlowPosition, fitView } = useReactFlow();

    const { nodes, edges, setNodes, setEdges, onNodesChange: baseOnNodesChange, onEdgesChange, onConnect: baseOnConnect, isValidConnection } = useFlowGraph();
    const { undo, redo, takeSnapshot, clearHistory, canUndo, canRedo } = useUndoRedo(nodes, edges, setNodes, setEdges);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        baseOnNodesChange(changes);
        // If it's a removal, take a snapshot after the state update
        if (changes.some((c: NodeChange) => c.type === 'remove')) {
            setTimeout(takeSnapshot, 0);
        }
    }, [baseOnNodesChange, takeSnapshot]);

    const onConnect = useCallback((params: Connection) => {
        baseOnConnect(params);
        setTimeout(takeSnapshot, 0);
    }, [baseOnConnect, takeSnapshot]);
    const { graphToPipeline } = useGraphSerializer();
    const { state, output, run, cancel, reset: resetEngine, isPaused, pause, resume } = usePipelineEngine();
    const { save, exportJson } = usePipelines();

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [interactionNodeId, setInteractionNodeId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
    const [paneContextMenu, setPaneContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);

    const hasRecovered = useRef(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

    const updateNodeData = useCallback((nodeId: string, partialData: Record<string, unknown>) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...partialData } } : n));
    }, [setNodes]);

    const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
    const [currentPipelineName, setCurrentPipelineName] = useState<string | null>(null);
    const [currentPipelineDescription, setCurrentPipelineDescription] = useState<string | null>(null);
    const [currentPipelineAuthor, setCurrentPipelineAuthor] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<File | TIPPayload | null>(null);

    useFlowEngineSync(nodes, edges, setNodes, setEdges, state, output, graphToPipeline);



    const onSelectionChange = useCallback((params: { nodes: Node[] }) => {
        if (params.nodes.length > 0) setSelectedNodeId(params.nodes[0].id);
        else setSelectedNodeId(null);
    }, [setSelectedNodeId]);

    const onNodeContextMenu = useCallback((event: any, node: Node) => {
        event.preventDefault();
        setPaneContextMenu(null);
        setContextMenu({
            nodeId: node.id,
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    const onNodeClick = useCallback((event: any, node: Node) => {
        setPaneContextMenu(null);
        setContextMenu(null);
    }, []);

    const onPaneContextMenu = useCallback((event: any) => {
        event.preventDefault();
        setContextMenu(null);
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setPaneContextMenu({
            x: event.clientX,
            y: event.clientY,
            flowX: flowPos.x,
            flowY: flowPos.y,
        });
    }, [screenToFlowPosition]);

    const onPaneClick = useCallback((event: any) => {
        setContextMenu(null);
        // Toggle/close pane context menu
        setPaneContextMenu(null);
    }, []);

    const injectedDataCache = useRef<Map<string, { rawData: Record<string, any>; injectedData: Record<string, any> }>>(new Map());

    const injectNodeCallbacks = useCallback((nds: Node[]): Node[] => {
        const cache = injectedDataCache.current;
        // Keep cache clean of deleted nodes
        const activeIds = new Set(nds.map(n => n.id));
        for (const key of cache.keys()) {
            if (!activeIds.has(key)) {
                cache.delete(key);
            }
        }

        return nds.map(n => {
            const cached = cache.get(n.id);
            if (cached && cached.rawData === n.data) {
                return {
                    ...n,
                    data: cached.injectedData
                };
            }

            let newInjectedData = n.data;
            if (n.type === 'tool' || n.type === 'humanReview') {
                newInjectedData = {
                    ...n.data,
                    onOpenInteraction: () => setInteractionNodeId(n.id),
                };
            } else if (n.type === 'fileInput') {
                newInjectedData = {
                    ...n.data,
                    onFileSelect: (f: File | null) => updateNodeData(n.id, { file: f, status: 'idle' }),
                    onPreview: (f: File | TIPPayload) => setPreviewFile(f),
                };
            } else if (n.type === 'output') {
                newInjectedData = {
                    ...n.data,
                    onPreview: (p: File | TIPPayload) => setPreviewFile(p),
                };
            }

            cache.set(n.id, { rawData: n.data, injectedData: newInjectedData });
            return {
                ...n,
                data: newInjectedData
            };
        });
    }, [setInteractionNodeId, updateNodeData, setPreviewFile]);

    const injectedNodes = useMemo(() => injectNodeCallbacks(nodes), [nodes, injectNodeCallbacks]);

    const nodesRef = useRef(nodes);
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    // AI Injection Logic
    useEffect(() => {
        // Listen for real-time injection (Add to Canvas)
        const handleInject = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { nodes: iNodes, edges: iEdges } = customEvent.detail;
            if (iNodes && iEdges) {
                // Append nodes with an offset if canvas is not empty
                const offset = nodesRef.current.length > 2 ? { x: 0, y: 300 } : { x: 0, y: 0 };
                
                // Remap IDs to ensure uniqueness while maintaining connections
                const idMap = new Map<string, string>();
                const shiftedNodes = (iNodes as Node[]).map((n: Node) => {
                    const newId = `${n.id}-${Date.now()}`;
                    idMap.set(n.id, newId);
                    return {
                        ...n,
                        id: newId,
                        position: { x: n.position.x + offset.x, y: n.position.y + offset.y }
                    };
                });
                
                const shiftedEdges = (iEdges as Edge[]).map((e: Edge) => ({
                    ...e,
                    id: `edge-${idMap.get(e.source) || e.source}-${idMap.get(e.target) || e.target}-${Date.now()}`,
                    source: idMap.get(e.source) || e.source,
                    target: idMap.get(e.target) || e.target
                }));

                setNodes(nds => nds.concat(injectNodeCallbacks(shiftedNodes)));
                setEdges(eds => eds.concat(shiftedEdges));
                setTimeout(() => fitView({ padding: 0.2 }), 100);
            }
        };

        window.addEventListener('toolbase:inject-pipeline', handleInject);
        return () => window.removeEventListener('toolbase:inject-pipeline', handleInject);
    }, [setNodes, setEdges, injectNodeCallbacks, fitView]);

    const serializeGraph = useCallback(() => {
        const cleanNodes = nodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                file: undefined,
                previewFiles: undefined,
                interactionFiles: undefined,
                bundle: undefined,
                status: 'idle',
                error: undefined,
                durationMs: undefined,
                interactionDone: undefined,
                isPreviewing: undefined
            }
        }));

        const cleanEdges = edges.map(e => ({
            ...e,
            data: { ...e.data, isRunning: false, isInvalid: false }
        }));

        return { nodes: cleanNodes, edges: cleanEdges };
    }, [nodes, edges]);

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

        if (type === 'tool' || type === 'humanReview') {
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
            setTimeout(takeSnapshot, 0);
        } else {
            const newNode = { id: newNodeId, type, position, data: { status: 'idle', file: null } };
            setNodes((nds) => {
                const next = nds.concat(injectNodeCallbacks([newNode]));
                return next;
            });
            setTimeout(takeSnapshot, 0);
        }
    }, [screenToFlowPosition, setNodes, takeSnapshot, injectNodeCallbacks]);

    const clearIntermediateMemory = useCallback((nds: Node[]) => {
        // Blob URLs and file buffers take heavy memory; we clear them from intermediate preview state when running or resetting.
        return nds.map(n => {
            if (n.type === 'tool') {
                return { ...n, data: { ...n.data, status: 'idle', durationMs: 0, error: undefined, previewFiles: undefined } };
            }
            return { ...n, data: { ...n.data, status: 'idle', durationMs: 0, error: undefined, bundle: undefined } };
        });
    }, []);

    const onCopy = useCallback(() => {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const selectedEdges = edges.filter(e =>
            selectedNodes.some(n => n.id === e.source) && selectedNodes.some(n => n.id === e.target)
        );
        clipboard.current = { nodes: JSON.parse(JSON.stringify(selectedNodes)), edges: JSON.parse(JSON.stringify(selectedEdges)) };
    }, [nodes, edges]);

    const onPaste = useCallback(() => {
        if (!clipboard.current) return;

        const idMap = new Map<string, string>();
        const offset = 40;

        const newNodes = clipboard.current.nodes
            .filter(n => n.type !== 'fileInput' && n.type !== 'output')
            .map(n => {
                const newId = `node-${n.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                idMap.set(n.id, newId);
                return {
                    ...n,
                    id: newId,
                    position: { x: n.position.x + offset, y: n.position.y + offset },
                    selected: true,
                };
            });

        const newEdges = clipboard.current.edges
            .filter(e => idMap.has(e.source) && idMap.has(e.target))
            .map(e => ({
                ...e,
                id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                source: idMap.get(e.source)!,
                target: idMap.get(e.target)!,
                selected: true,
            }));

        setNodes(nds => (nds.map(n => ({ ...n, selected: false })) as Node[]).concat(injectNodeCallbacks(newNodes)));
        setEdges(eds => eds.map(e => ({ ...e, selected: false })).concat(newEdges));
        setTimeout(takeSnapshot, 0);
    }, [injectNodeCallbacks, setNodes, setEdges, takeSnapshot]);

    const onDuplicate = useCallback(() => {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const selectedEdges = edges.filter(e =>
            selectedNodes.some(n => n.id === e.source) && selectedNodes.some(n => n.id === e.target)
        );

        const idMap = new Map<string, string>();
        const offset = 40;

        const newNodes = selectedNodes
            .filter(n => n.type !== 'fileInput' && n.type !== 'output')
            .map(n => {
                const newId = `node-${n.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                idMap.set(n.id, newId);
                return {
                    ...n,
                    id: newId,
                    position: { x: n.position.x + offset, y: n.position.y + offset },
                    selected: true,
                };
            });

        const newEdges = selectedEdges
            .filter(e => idMap.has(e.source) && idMap.has(e.target))
            .map(e => ({
                ...e,
                id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                source: idMap.get(e.source)!,
                target: idMap.get(e.target)!,
                selected: true,
            }));

        setNodes(nds => (nds.map(n => ({ ...n, selected: false })) as Node[]).concat(injectNodeCallbacks(newNodes)));
        setEdges(eds => eds.map(e => ({ ...e, selected: false })).concat(newEdges));
        setTimeout(takeSnapshot, 0);
    }, [nodes, edges, injectNodeCallbacks, setNodes, setEdges, takeSnapshot]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                onCopy();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                onPaste();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                onDuplicate();
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [onCopy, onPaste, onDuplicate]);

    // ── Autosave ────────────────────────────────────────────────────────────────

    useEffect(() => {
        const timer = setTimeout(() => {
            const { nodes: cleanNodes, edges: cleanEdges } = serializeGraph();
            const draft = {
                nodes: cleanNodes,
                edges: cleanEdges,
                pipelineId: currentPipelineId,
                pipelineName: currentPipelineName
            };
            try {
                localStorage.setItem('toolbase:pipeline-draft', JSON.stringify(draft));
            } catch (e) {
                console.warn('[Autosave] Failed to write draft to localStorage', e);
            }
        }, 1200); // 1.2s debounce to avoid hammering LS during drag
        return () => clearTimeout(timer);
    }, [nodes, edges, currentPipelineId, currentPipelineName, serializeGraph]);

    // ── Recovery ────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (hasRecovered.current) return;
        hasRecovered.current = true;
        
        const raw = localStorage.getItem('toolbase:pipeline-draft');
        if (!raw) {
            setIsInitialLoading(false);
            return;
        }

        try {
            const draft = JSON.parse(raw);
            if (draft.nodes && draft.nodes.length > 0) {
                // We use baseSetNodes directly to avoid any callback-hell instability
                const restoredNodes = injectNodeCallbacks(draft.nodes);
                setNodes(() => restoredNodes);
                setEdges(() => draft.edges || []);
                
                if (draft.pipelineId) setCurrentPipelineId(draft.pipelineId);
                if (draft.pipelineName) setCurrentPipelineName(draft.pipelineName);
                
                // fitView handled by a one-off timeout
                setTimeout(() => {
                    fitView({ duration: 800, padding: 0.2 });
                    setIsInitialLoading(false);
                }, 400);
            } else {
                setIsInitialLoading(false);
            }
        } catch (e) {
            console.error('[Recovery] Failed to restore pipeline draft:', e);
            setIsInitialLoading(false);
        }
    }, [setNodes, setEdges, setCurrentPipelineId, setCurrentPipelineName, injectNodeCallbacks, fitView]);

    const handleRun = useCallback(async () => {
        setNodes(nds => clearIntermediateMemory(nds));
        setEdges(eds => eds.map(e => ({ ...e, data: { ...e.data, isRunning: false } })));
        resetEngine();
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps || orderedSteps.length === 0) return;
        
        const firstStepId = orderedSteps[0]?.id;
        const incomingFileNodes = firstStepId 
            ? nodes.filter(n => n.type === 'fileInput' && edges.some(e => e.source === n.id && e.target === firstStepId))
            : [];
        const files = incomingFileNodes
            .map(n => n.data.file as File | null)
            .filter((f): f is File => !!f);

        if (files.length === 0) return;
        
        await run(orderedSteps, files);
    }, [nodes, edges, graphToPipeline, run, resetEngine, setNodes, setEdges, clearIntermediateMemory]);

    const handleStop = useCallback(() => { cancel(); }, [cancel]);
    const handlePause = useCallback(() => { pause(); }, [pause]);
    const handleResume = useCallback(() => { resume(); }, [resume]);

    const handleReset = useCallback(() => {
        setNodes(injectNodeCallbacks([
            { id: 'node-file', type: 'fileInput', position: { x: 140, y: 240 }, data: { status: 'idle', file: null } },
            { id: 'node-out', type: 'output', position: { x: 680, y: 240 }, data: { status: 'idle' } }
        ]));
        setEdges([]);
        resetEngine();
        localStorage.removeItem('toolbase:pipeline-draft');
        setCurrentPipelineId(null);
        setCurrentPipelineName(null);
        setCurrentPipelineDescription(null);
        setCurrentPipelineAuthor(null);
        clearHistory();
    }, [setNodes, setEdges, resetEngine, clearHistory, injectNodeCallbacks]);

    const onNodeDragStop = useCallback(() => {
        takeSnapshot();
    }, [takeSnapshot]);


    const handleSavePrimary = useCallback(() => {
        setIsSaveModalOpen(true);
    }, []);

    const performSave = useCallback((metadata: { name: string; description?: string; author?: string }) => {
        const orderedSteps = graphToPipeline(nodes, edges);

        const newId = currentPipelineId || crypto.randomUUID();

        const { nodes: cleanNodes, edges: cleanEdges } = serializeGraph();

        const def: PipelineDefinition = {
            id: newId,
            name: metadata.name,
            description: metadata.description,
            author: metadata.author,
            steps: orderedSteps || [],
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
            ui: { nodes: cleanNodes, edges: cleanEdges },
        };
        save(def);
        setCurrentPipelineId(newId);
        setCurrentPipelineName(metadata.name);
        setCurrentPipelineDescription(metadata.description || null);
        setCurrentPipelineAuthor(metadata.author || null);
        setIsSavedModalOpen(true);
    }, [nodes, edges, graphToPipeline, save, currentPipelineId, serializeGraph]);

    const { pipelineToGraph } = useGraphSerializer();

    const handleLoad = useCallback((pipeline: PipelineDefinition) => {
        try {
            setIsInitialLoading(true);
            if (pipeline.ui && pipeline.ui.nodes) {
                const loadedNodes = injectNodeCallbacks(pipeline.ui.nodes) as Node[];
                setNodes(loadedNodes);
                setEdges((pipeline.ui!.edges || []) as Edge[]);
                setCurrentPipelineId(pipeline.id);
                setCurrentPipelineName(pipeline.name);
                setCurrentPipelineDescription(pipeline.description || null);
                setCurrentPipelineAuthor(pipeline.author || null);
            } else {
                const { nodes: newNodes, edges: newEdges } = pipelineToGraph(pipeline);
                setNodes(newNodes as Node[]);
                setEdges(newEdges as Edge[]);
                setIsInitialLoading(false);
            }
            setCurrentPipelineId(pipeline.id);
            setCurrentPipelineName(pipeline.name);
            setIsSavedModalOpen(false);

            // Center view after layout settles
            setTimeout(() => {
                fitView({ duration: 800, padding: 0.2 });
                setIsInitialLoading(false);
            }, 400);
        } catch (err) {
            console.error('Failed to load pipeline:', err);
            setIsInitialLoading(false);
        }
    }, [pipelineToGraph, setNodes, setEdges, injectNodeCallbacks, fitView]);

    const handleExport = useCallback(() => {
        const orderedSteps = graphToPipeline(nodes, edges);
        const { nodes: cleanNodes, edges: cleanEdges } = serializeGraph();


        const def: PipelineDefinition = {
            id: crypto.randomUUID(),
            name: `Pipeline ${new Date().toLocaleTimeString()}`,
            steps: orderedSteps || [],
            createdAt: new Date().toISOString(),
            tipVersion: '1.0',
            ui: { nodes: cleanNodes, edges: cleanEdges },
        };
        exportJson(def);
    }, [nodes, edges, graphToPipeline, exportJson, serializeGraph]);

    const outNode = nodes.find(n => n.type === 'output');
    const ordered = graphToPipeline(nodes, edges);
    const hasInvalidEdges = edges.some(e => e.data?.isInvalid);

    // Find the first step in the pipeline
    const firstStepId = ordered?.[0]?.id;
    // Find all fileInput nodes connected to the first step
    const incomingFileNodes = firstStepId 
        ? nodes.filter(n => n.type === 'fileInput' && edges.some(e => e.source === n.id && e.target === firstStepId))
        : [];
    
    // Every connected fileInput node must have a file selected, and we need at least one connected fileInput
    const allIncomingFilesSelected = incomingFileNodes.length > 0 && incomingFileNodes.every(n => !!n.data.file);

    const canRun = allIncomingFilesSelected && !!outNode && !!ordered && ordered.length > 0 && !hasInvalidEdges;
    const hasFileInput = nodes.some(n => n.type === 'fileInput');

    const failedStepIndex = state.steps.findIndex(step => step.status === 'error' || Boolean(step.error));
    const lastRecordedPipelineError = useRef<string | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            updateToolState({
                toolName: 'Pipeline Builder',
                status: state.status,
                graph: {
                    nodeCount: nodes.length,
                    edgeCount: edges.length,
                    toolNodeCount: nodes.filter(n => n.type === 'tool').length,
                    hasFileInput,
                    hasOutput: Boolean(outNode),
                    hasInvalidEdges,
                    canRun,
                    selectedNode: selectedNode
                        ? {
                            id: selectedNode.id,
                            type: selectedNode.type,
                            toolId: selectedNode.data?.toolId,
                            status: selectedNode.data?.status,
                            error: selectedNode.data?.error,
                        }
                        : null,
                },
                run: {
                    currentStepIndex: state.currentStepIndex,
                    error: state.error,
                    failedStepIndex,
                    failedToolId: failedStepIndex >= 0 ? ordered?.[failedStepIndex]?.toolId : undefined,
                },
            });
        }, 600);

        return () => window.clearTimeout(timer);
    }, [
        canRun,
        edges.length,
        failedStepIndex,
        hasFileInput,
        hasInvalidEdges,
        nodes,
        ordered,
        outNode,
        selectedNode,
        state.currentStepIndex,
        state.error,
        state.status,
        updateToolState,
    ]);

    useEffect(() => {
        if (state.status !== 'error' || !state.error || lastRecordedPipelineError.current === state.error) return;
        lastRecordedPipelineError.current = state.error;
        recordRuntimeEvent({
            kind: 'tool',
            level: 'error',
            message: 'Pipeline execution failed',
            detail: {
                error: state.error,
                failedStepIndex,
                failedToolId: failedStepIndex >= 0 ? ordered?.[failedStepIndex]?.toolId : undefined,
            },
        });
    }, [failedStepIndex, ordered, recordRuntimeEvent, state.error, state.status]);

    useEffect(() => {
        return () => updateToolState(null);
    }, [updateToolState]);

    /**
     * Palette filter context — tells NodePalette which tools to highlight.
     * Priority: selected tool node > file in FileInputNode > no filter.
     */
    const fileNodeDataFile = nodes.find(n => n.type === 'fileInput' && n.data?.file)?.data.file;

    const paletteFilterContext = useMemo((): PaletteFilterContext => {
        // A tool node is selected → show tools that can consume what it produces
        if (selectedNode && selectedNode.type === 'tool') {
            const tool = TIPToolRegistry.get(selectedNode.data.toolId as string);
            if (tool && tool.produces.length > 0) {
                return { kind: 'node', produces: tool.produces };
            }
        }
        // FileInputNode has a file → show tools that consume that MIME type
        const uploadedFile = fileNodeDataFile as File | null;
        if (uploadedFile?.type) {
            return { kind: 'file', mimeType: uploadedFile.type };
        }
        return { kind: 'none' };
    }, [selectedNode, fileNodeDataFile]);

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
                .react-flow__edge-path { stroke-width: 2.5; stroke: #9ca3af; transition: stroke 0.3s ease, stroke-width 0.2s ease; }
                .react-flow__edge.selected .react-flow__edge-path { stroke: #8b5cf6; stroke-width: 3.5; }
                .react-flow__handle { width: 10px; height: 10px; background: #333; border: 2px solid #000; transition: all 0.2s ease; }
                .react-flow__handle:hover { transform: scale(1.3); background: #8b5cf6; border-color: #fff; }
                
                .react-flow__handle-valid {
                    background: #4ade80 !important;
                    border-color: #fff !important;
                    box-shadow: 0 0 12px rgba(74, 222, 128, 0.6);
                    transform: scale(1.2);
                }
                .react-flow__handle-invalid {
                    background: #ef4444 !important;
                    border-color: #fff !important;
                    box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
                    transform: scale(0.9) rotate(45deg);
                }

                @keyframes dashdraw {
                    from { stroke-dashoffset: 10; }
                    to { stroke-dashoffset: 0; }
                }

                .react-flow__controls { background: rgba(12,12,14,0.9); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; backdrop-filter: blur(10px); }
            `}</style>
            
            <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
                <ToolCopilot 
                    contextData={JSON.stringify(serializeGraph(), null, 2)}
                    contextType="Pipeline graph JSON"
                    onApplyFix={(fixedStr) => {
                        try {
                            const parsed = JSON.parse(fixedStr);
                            if (parsed.nodes && parsed.edges) {
                                setNodes(injectNodeCallbacks(parsed.nodes));
                                setEdges(parsed.edges);
                                setTimeout(() => fitView({ padding: 0.2 }), 100);
                            }
                        } catch (e) {
                            console.error("Failed to parse fixed graph", e);
                        }
                    }}
                />
            </div>

            {/* Floating toolbar at top-center */}
            <PipelineToolbar
                onRun={handleRun}
                onStop={handleStop}
                onPause={handlePause}
                onResume={handleResume}
                onReset={handleReset}
                onSave={handleSavePrimary}
                onLoad={() => setIsSavedModalOpen(true)}
                onExport={handleExport}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                isRunning={state.status === 'running'}
                isPaused={isPaused}
                canRun={canRun}
            />

            {isSavedModalOpen && (
                <SavedPipelinesModal
                    onClose={() => setIsSavedModalOpen(false)}
                    onLoad={handleLoad}
                />
            )}

            <SavePipelineModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                initialData={{
                    name: currentPipelineName || '',
                    description: currentPipelineDescription || '',
                    author: currentPipelineAuthor || ''
                }}
                onSave={performSave}
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
                let seedFiles: File[] = upstreamFiles;

                // SPECIAL CASE: Human Review during a LIVE RUN.
                // If ReviewSync has a pending bundle for this node, it means execution is paused 
                // exactly at this node. We must use THAT live data for the preview.
                if (interactionNode?.type === 'humanReview') {
                    const pendingInput = ReviewSync.getPendingInput(interactionNodeId);
                    if (pendingInput && pendingInput.payloads.length > 0) {
                        seedFiles = pendingInput.payloads.map(p => 
                            new File([p.data], p.meta.filename || 'review-file', { type: p.meta.mimeType as string })
                        );
                    }
                }

                if (seedFiles.length === 0) {
                    seedFiles = (interactionNode?.data.interactionFiles as File[] | undefined) ?? [];
                }

                return (
                    <InteractionModal
                        tool={interactionTool}
                        seedFiles={seedFiles}
                        config={(interactionNode?.data.config as Record<string, unknown>) ?? {}}
                        onConfirm={async (result) => {
                            // 1. If this is a Human Review node, always resolve via ReviewSync.
                            //    We don't want to fall through to normal tool configuration logic.
                            if (interactionNode?.type === 'humanReview') {
                                ReviewSync.resolveReview(interactionNode.id, true);
                                setInteractionNodeId(null);
                                return;
                            }

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

                            const currentConfig = (interactionNode?.data.config as Record<string, unknown>) ?? {};
                            const newConfig = { ...currentConfig, ...result.config } as Record<string, unknown>;

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

                                    const outputBundle = await interactionTool.invoke(inputBundle, newConfig as Record<string, string | number | boolean>, dummyHooks);

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
                        onCancel={() => {
                            // 1. If this is a Human Review node, always resolve via ReviewSync (as rejection).
                            if (interactionNode?.type === 'humanReview') {
                                ReviewSync.resolveReview(interactionNode.id, false);
                                setInteractionNodeId(null);
                                return;
                            }
                            setInteractionNodeId(null);
                        }}
                    />
                );
            })()}

            {/* Flow canvas */}
            <ReactFlow
                nodes={injectedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                onNodeContextMenu={onNodeContextMenu}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onPaneContextMenu={onPaneContextMenu}
                connectionLineComponent={TIPConnectionLine}
                isValidConnection={isValidConnection}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onSelectionChange={onSelectionChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes as never}
                connectionMode={ConnectionMode.Loose}
                defaultEdgeOptions={{ type: 'tip', animated: false }}
                snapToGrid={true}
                snapGrid={[20, 20]}
                minZoom={0.15}
                maxZoom={2.5}
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode="Shift"
                selectionOnDrag
                style={{ background: '#0b0b0d' }}
                onlyRenderVisibleElements
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
            {/* Loading Overlay */}
            {isInitialLoading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0b0b0d',
                    transition: 'opacity 0.5s ease',
                }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        border: '2px solid rgba(139, 92, 246, 0.1)',
                        borderTopColor: '#8b5cf6',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        marginBottom: 16,
                    }} />
                    <div style={{ color: '#8b5cf6', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.8 }}>
                        Warming Pipeline...
                    </div>
                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            )}
            {/* Global File Preview Modal */}
            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    onClose={() => setPreviewFile(null)}
                />
            )}

            {/* Quick Actions Context Menu */}
            {contextMenu && (() => {
                const node = nodes.find(n => n.id === contextMenu.nodeId);
                if (!node) return null;

                const canDuplicate = node.type === 'tool' || node.type === 'humanReview';
                
                const toolInfo = node.type === 'tool' && node.data?.toolId
                    ? TIPToolRegistry.get(node.data.toolId as string)
                    : null;
                const nodeLabel = toolInfo 
                    ? toolInfo.name 
                    : (node.type === 'humanReview' 
                        ? 'Human Review' 
                        : (node.type === 'fileInput' 
                            ? 'File Input' 
                            : 'Output'));

                return (
                    <>
                        {/* Invisible full-screen backdrop to dismiss the menu */}
                        <div 
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 9998,
                                pointerEvents: 'auto',
                            }}
                            onClick={() => setContextMenu(null)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu(null);
                            }}
                        />

                        {/* Glassmorphic Actions Context Overlay */}
                        <div
                            style={{
                                position: 'fixed',
                                left: contextMenu.x,
                                top: contextMenu.y,
                                zIndex: 9999,
                                minWidth: 200,
                            }}
                            className="rounded-xl border border-white/10 bg-[#0f0f11]/95 p-1.5 shadow-2xl backdrop-blur-xl select-none pointer-events-auto flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                        >
                            {/* Title Label Header */}
                            <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-zinc-500 uppercase border-b border-white/5 mb-1.5">
                                {nodeLabel} Actions
                            </div>

                            {canDuplicate && (
                                <>
                                    <button
                                        onClick={() => {
                                            setContextMenu(null);
                                            clipboard.current = {
                                                nodes: [JSON.parse(JSON.stringify(node))],
                                                edges: edges.filter(e => e.source === node.id || e.target === node.id)
                                            };
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
                                    >
                                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        Copy
                                    </button>

                                    <button
                                        onClick={() => {
                                            setContextMenu(null);
                                            const offset = 40;
                                            const newId = `node-${node.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                                            const newNode = {
                                                ...JSON.parse(JSON.stringify(node)),
                                                id: newId,
                                                position: { x: node.position.x + offset, y: node.position.y + offset },
                                                selected: true,
                                            };

                                            setNodes(nds => (nds.map(n => ({ ...n, selected: false })) as Node[]).concat(injectNodeCallbacks([newNode])));
                                            setTimeout(takeSnapshot, 0);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
                                    >
                                        <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                        Duplicate
                                    </button>
                                </>
                            )}

                            <div className="h-px bg-white/5 my-1" />

                            <button
                                onClick={() => {
                                    setContextMenu(null);
                                    setNodes(nds => nds.filter(n => n.id !== node.id));
                                    setEdges(eds => eds.filter(e => e.source !== node.id && e.target !== node.id));
                                    setTimeout(takeSnapshot, 0);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left font-medium"
                            >
                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Node
                            </button>
                        </div>
                    </>
                );
            })()}

            {/* Pane/Canvas Context Menu */}
            {paneContextMenu && clipboard.current && (
                <>
                    {/* Invisible full-screen backdrop to dismiss the menu */}
                    <div 
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9998,
                            pointerEvents: 'auto',
                        }}
                        onClick={() => setPaneContextMenu(null)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setPaneContextMenu(null);
                        }}
                    />

                    {/* Glassmorphic Actions Context Overlay */}
                    <div
                        style={{
                            position: 'fixed',
                            left: paneContextMenu.x,
                            top: paneContextMenu.y,
                            zIndex: 9999,
                            minWidth: 160,
                        }}
                        className="rounded-xl border border-white/10 bg-[#0f0f11]/95 p-1.5 shadow-2xl backdrop-blur-xl select-none pointer-events-auto flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                    >
                        <button
                            onClick={() => {
                                const coords = { flowX: paneContextMenu.flowX, flowY: paneContextMenu.flowY };
                                setPaneContextMenu(null);
                                
                                if (!clipboard.current) return;
                                
                                const idMap = new Map<string, string>();
                                
                                // Find bounding box center of clipboard nodes to offset paste correctly
                                const minX = Math.min(...clipboard.current.nodes.map(n => n.position.x));
                                const minY = Math.min(...clipboard.current.nodes.map(n => n.position.y));
                                
                                const newNodes = clipboard.current.nodes
                                    .filter(n => n.type !== 'fileInput' && n.type !== 'output')
                                    .map(n => {
                                        const newId = `node-${n.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                                        idMap.set(n.id, newId);
                                        
                                        const relX = n.position.x - minX;
                                        const relY = n.position.y - minY;
                                        
                                        return {
                                            ...n,
                                            id: newId,
                                            position: { x: coords.flowX + relX, y: coords.flowY + relY },
                                            selected: true,
                                        };
                                    });

                                const newEdges = clipboard.current.edges
                                    .filter(e => idMap.has(e.source) && idMap.has(e.target))
                                    .map(e => ({
                                        ...e,
                                        id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                        source: idMap.get(e.source)!,
                                        target: idMap.get(e.target)!,
                                        selected: true,
                                    }));

                                setNodes(nds => (nds.map(n => ({ ...n, selected: false })) as Node[]).concat(injectNodeCallbacks(newNodes)));
                                setEdges(eds => eds.map(e => ({ ...e, selected: false })).concat(newEdges));
                                setTimeout(takeSnapshot, 0);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left font-medium"
                        >
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            Paste Tool Here
                        </button>
                    </div>
                </>
            )}
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
