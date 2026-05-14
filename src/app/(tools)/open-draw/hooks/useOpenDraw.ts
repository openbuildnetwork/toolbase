/**
 * useOpenDraw - Main state management hook for OpenDraw
 * 
 * Features:
 * - React Flow state management (nodes, edges)
 * - Undo/Redo history integration
 * - File System Access API for save/load
 * - Selection tracking
 */
import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    ReactFlowInstance,
    Viewport,
} from '@xyflow/react';
import { useCallback, useRef, useState } from 'react';
import { useHistory } from '@/hooks/useHistory';

// --- Types ---
interface GraphState {
    nodes: Node[];
    edges: Edge[];
    viewport?: Viewport;
}

interface UseOpenDrawReturn {
    // State
    nodes: Node[];
    edges: Edge[];
    selectedNodes: string[];
    selectedEdges: string[];

    // React Flow handlers
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (params: Connection) => void;
    onInit: (instance: ReactFlowInstance) => void;
    onSelectionChange: (params: { nodes: Node[]; edges: Edge[] }) => void;

    // Setters
    setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;

    // History
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;

    // File operations
    saveGraph: () => Promise<void>;
    loadGraph: () => Promise<void>;

    // Instance
    rfInstance: ReactFlowInstance | null;
}

// --- Initial State ---
const INITIAL_STATE: GraphState = {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
};

/**
 * Main hook for managing OpenDraw state with history.
 */
export function useOpenDraw(): UseOpenDrawReturn {
    // React Flow instance
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

    // Selection state
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
    const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

    // Use history hook for graph state
    const {
        state: graphState,
        setStateImmediate: setGraphStateImmediate,
        undo,
        redo,
        canUndo,
        canRedo,
        undoCount,
        redoCount,
        replaceState,
    } = useHistory<GraphState>(INITIAL_STATE, {
        maxHistory: 100,
        debounceMs: 500, // Batch rapid changes
        enableKeyboardShortcuts: true,
    });

    // Track if we're in the middle of applying a change (to prevent loops)
    const isApplyingRef = useRef(false);

    /**
     * Handle node changes from React Flow.
     */
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        if (isApplyingRef.current) return;

        // Determine if this is a significant change that should be recorded
        const isSignificant = changes.some(
            (change) =>
                change.type === 'remove' ||
                change.type === 'add' ||
                (change.type === 'position' && change.dragging === false) // Only record when drag ends
        );

        const newNodes = applyNodeChanges(changes, graphState.nodes);

        if (isSignificant) {
            setGraphStateImmediate({
                ...graphState,
                nodes: newNodes,
            });
        } else {
            // Use debounced update for dragging, etc.
            replaceState({
                ...graphState,
                nodes: newNodes,
            });
        }
    }, [graphState, setGraphStateImmediate, replaceState]);

    /**
     * Handle edge changes from React Flow.
     */
    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        if (isApplyingRef.current) return;

        const isSignificant = changes.some(
            (change) => change.type === 'remove' || change.type === 'add'
        );

        const newEdges = applyEdgeChanges(changes, graphState.edges);

        if (isSignificant) {
            setGraphStateImmediate({
                ...graphState,
                edges: newEdges,
            });
        } else {
            replaceState({
                ...graphState,
                edges: newEdges,
            });
        }
    }, [graphState, setGraphStateImmediate, replaceState]);

    /**
     * Handle new connections.
     */
    const onConnect = useCallback((params: Connection) => {
        const newEdge: Edge = {
            ...params,
            id: `e-${params.source}-${params.target}-${Date.now()}`,
            type: 'smoothstep',
            animated: false,
        } as Edge;

        setGraphStateImmediate({
            ...graphState,
            edges: addEdge(newEdge, graphState.edges),
        });
    }, [graphState, setGraphStateImmediate]);

    /**
     * Initialize React Flow instance.
     */
    const onInit = useCallback((instance: ReactFlowInstance) => {
        setRfInstance(instance);
    }, []);

    /**
     * Handle selection changes.
     */
    const onSelectionChange = useCallback(
        ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
            setSelectedNodes(nodes.map((n) => n.id));
            setSelectedEdges(edges.map((e) => e.id));
        },
        []
    );

    /**
     * Set nodes with history tracking.
     */
    const setNodes = useCallback(
        (nodesOrUpdater: Node[] | ((prev: Node[]) => Node[])) => {
            const newNodes =
                typeof nodesOrUpdater === 'function'
                    ? nodesOrUpdater(graphState.nodes)
                    : nodesOrUpdater;

            setGraphStateImmediate({
                ...graphState,
                nodes: newNodes,
            });
        },
        [graphState, setGraphStateImmediate]
    );

    /**
     * Set edges with history tracking.
     */
    const setEdges = useCallback(
        (edgesOrUpdater: Edge[] | ((prev: Edge[]) => Edge[])) => {
            const newEdges =
                typeof edgesOrUpdater === 'function'
                    ? edgesOrUpdater(graphState.edges)
                    : edgesOrUpdater;

            setGraphStateImmediate({
                ...graphState,
                edges: newEdges,
            });
        },
        [graphState, setGraphStateImmediate]
    );

    /**
     * Save graph to file.
     */
    const saveGraph = async () => {
        if (!rfInstance) return;

        const flow = {
            nodes: graphState.nodes,
            edges: graphState.edges,
            viewport: rfInstance.getViewport(),
        };

        try {
            // @ts-expect-error File System Access API
            if (window.showSaveFilePicker) {
                // @ts-expect-error File System Access API
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'diagram.opendraw.json',
                    types: [
                        {
                            description: 'OpenDraw Diagram',
                            accept: { 'application/json': ['.json'] },
                        },
                    ],
                });
                const writable = await handle.createWritable();
                await writable.write(JSON.stringify(flow, null, 2));
                await writable.close();
                console.log('[OpenDraw] Diagram saved successfully');
            } else {
                // Fallback for browsers without File System Access API
                const blob = new Blob([JSON.stringify(flow, null, 2)], {
                    type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'diagram.opendraw.json';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('[OpenDraw] Failed to save:', err);
            }
        }
    };

    /**
     * Load graph from file.
     */
    const loadGraph = async () => {
        try {
            // @ts-expect-error File System Access API
            if (window.showOpenFilePicker) {
                // @ts-expect-error File System Access API
                const [handle] = await window.showOpenFilePicker({
                    types: [
                        {
                            description: 'OpenDraw Diagram',
                            accept: { 'application/json': ['.json'] },
                        },
                    ],
                    multiple: false,
                });
                const file = await handle.getFile();
                const content = await file.text();
                const flow = JSON.parse(content);

                if (flow) {
                    isApplyingRef.current = true;
                    setGraphStateImmediate({
                        nodes: flow.nodes || [],
                        edges: flow.edges || [],
                        viewport: flow.viewport,
                    });

                    if (flow.viewport && rfInstance) {
                        rfInstance.setViewport(flow.viewport);
                    }

                    setTimeout(() => {
                        isApplyingRef.current = false;
                    }, 100);

                    console.log('[OpenDraw] Diagram loaded successfully');
                }
            } else {
                // Fallback input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (!file) return;

                    const content = await file.text();
                    const flow = JSON.parse(content);

                    if (flow) {
                        isApplyingRef.current = true;
                        setGraphStateImmediate({
                            nodes: flow.nodes || [],
                            edges: flow.edges || [],
                            viewport: flow.viewport,
                        });

                        if (flow.viewport && rfInstance) {
                            rfInstance.setViewport(flow.viewport);
                        }

                        setTimeout(() => {
                            isApplyingRef.current = false;
                        }, 100);
                    }
                };
                input.click();
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('[OpenDraw] Failed to load:', err);
            }
        }
    };

    return {
        // State
        nodes: graphState.nodes,
        edges: graphState.edges,
        selectedNodes,
        selectedEdges,

        // React Flow handlers
        onNodesChange,
        onEdgesChange,
        onConnect,
        onInit,
        onSelectionChange,

        // Setters
        setNodes,
        setEdges,

        // History
        undo,
        redo,
        canUndo,
        canRedo,
        undoCount,
        redoCount,

        // File operations
        saveGraph,
        loadGraph,

        // Instance
        rfInstance,
    };
}

export type { UseOpenDrawReturn };
