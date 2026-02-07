
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    NodeChange,
    ReactFlowProvider,
    useReactFlow,
    ConnectionMode,
    BackgroundVariant,
    NodeTypes,
    EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useOpenDraw } from '@/hooks/useOpenDraw';
import { GenericShapeNode } from '../nodes/GenericShapeNode';
import { IconShapeNode } from '../nodes/IconShapeNode';
import { ShapeDefinition } from '@/types/open-draw.types';
import { SHAPE_DEFINITIONS } from '../nodes/shapes';
import { CustomEdge } from '../edges/CustomEdge';
import { useCallback, useRef, useEffect, useState, useMemo } from 'react';

// Define node types - we use GenericShapeNode for everything now!
const nodeTypes: NodeTypes = {
    'generic-shape': GenericShapeNode,
    'icon': IconShapeNode,
    // Legacy mapping (optional, for safety)
    rectangle: GenericShapeNode,
    circle: GenericShapeNode,
    diamond: GenericShapeNode,
    text: GenericShapeNode,
    cylinder: GenericShapeNode,
    cloud: GenericShapeNode,
    actor: GenericShapeNode,
    document: GenericShapeNode,
    parallelogram: GenericShapeNode,
    triangle: GenericShapeNode,
};

const edgeTypes: EdgeTypes = {
    custom: CustomEdge,
};

interface DrawCanvasProps {
    openDraw: ReturnType<typeof useOpenDraw>;
    isDark?: boolean;
}

export function DrawCanvas({ openDraw, isDark = false }: DrawCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onInit,
        onSelectionChange,
        setNodes,
        rfInstance
    } = openDraw;

    // Handle custom shape import
    const { addNodes } = useReactFlow();

    useEffect(() => {
        const handleImport = async (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            const input = customEvent.detail;
            if (!input) return;

            let def: ShapeDefinition | null = null;

            try {
                // Try XML first (if it starts with <shape)
                if (input.trim().startsWith('<shape')) {
                    const { parseXmlStencil } = await import('../utils/xml-stencil-parser');
                    def = parseXmlStencil(input);
                }
                // Try SVG
                else if (input.trim().includes('<svg')) {
                    const { convertSvgToShapeDefinition } = await import('../utils/svg-parser');
                    def = convertSvgToShapeDefinition(input, 'Custom Shape');
                }
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to parse shape definition.");
            }

            if (def) {
                const newNode: Node = {
                    id: `custom-${Date.now()}`,
                    type: 'rectangle', // We use 'rectangle' as base but render custom shape
                    position: { x: window.innerWidth / 2 - 300 + (Math.random() * 50), y: window.innerHeight / 2 - 50 + (Math.random() * 50) }, // Approx center of canvas
                    data: {
                        label: def.label,
                        customDefinition: def // Passed to GenericShapeNode
                    },
                    width: def.width || 100,
                    height: def.height || 100,
                };

                addNodes(newNode);
            }
        };

        window.addEventListener('open-draw-import-shape', handleImport);
        return () => window.removeEventListener('open-draw-import-shape', handleImport);
    }, [addNodes]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }

            if (!rfInstance || !reactFlowWrapper.current) return;

            const position = rfInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Handle Icon Drops
            if (type === 'icon') {
                const customDataString = event.dataTransfer.getData('application/open-draw-data');
                const customData = customDataString ? JSON.parse(customDataString) : {};

                const newNode = {
                    id: `icon-${Date.now()}`,
                    type: 'icon',
                    position,
                    data: {
                        label: customData.iconName || 'Icon',
                        iconName: customData.iconName || 'Circle',
                        backgroundColor: 'transparent',
                        borderColor: isDark ? '#ffffff' : '#1e1e1e', // Visible border
                        borderWidth: 2,
                        textColor: '#ffffff', // Always white text as requested
                        fontSize: 14,
                        width: 50,
                        height: 50
                    },
                    style: { width: 50, height: 50 }
                };
                setNodes((nds) => nds.concat(newNode));
                return;
            }

            // Handle Standard Shapes
            const shapeDef = SHAPE_DEFINITIONS[type] || SHAPE_DEFINITIONS['rectangle'];

            const newNode = {
                id: `${type}-${Date.now()}`,
                type: 'generic-shape', // Use our generic renderer
                position,
                data: {
                    label: shapeDef.label,
                    shapeType: type, // Store the specific shape type in data
                    backgroundColor: '#1e1e1e', // Greyish background
                    borderColor: '#ffffff', // Visible white border
                    borderWidth: 2,
                    textColor: '#ffffff', // Initial color white
                    fontSize: 14,
                },
                style: {
                    width: shapeDef.width || 100,
                    height: shapeDef.height || 100
                }
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [rfInstance, setNodes]
    );

    const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        // Prompt for new label
        const currentLabel = typeof edge.data?.label === 'string' ? edge.data.label : '';
        const newLabel = prompt('Enter Label:', currentLabel);

        if (newLabel !== null) {
            openDraw.setEdges((eds) =>
                eds.map((e) => {
                    if (e.id === edge.id) {
                        return {
                            ...e,
                            data: { ...e.data, label: newLabel },
                            type: 'custom' // Ensure it's custom type so label renders
                        };
                    }
                    return e;
                })
            );
        }
    }, [openDraw.setEdges]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#0f0f0f]" ref={reactFlowWrapper}>
            {mounted && (
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={onInit}
                    onSelectionChange={onSelectionChange}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    connectionMode={ConnectionMode.Loose}
                    defaultEdgeOptions={{
                        type: 'custom',
                        animated: false,
                        style: { strokeWidth: 2, stroke: isDark ? '#64748b' : '#94a3b8' }
                    }}
                    snapToGrid={true}
                    snapGrid={[20, 20]}
                    fitView
                    colorMode={isDark ? 'dark' : 'light'}
                    deleteKeyCode={['Backspace', 'Delete']}
                    multiSelectionKeyCode="Shift"
                    selectionOnDrag
                    panOnDrag={[1, 2]}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background
                        color={isDark ? '#333' : '#e2e8f0'}
                        gap={20}
                        size={1}
                        variant={BackgroundVariant.Dots}
                    />
                    <Controls className="bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 [&>button]:fill-gray-600 dark:[&>button]:fill-gray-300 shadow-sm" />
                    <MiniMap
                        zoomable
                        pannable
                        className="bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm"
                        nodeColor={() => isDark ? '#333' : '#e2e8f0'}
                        maskColor={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
                    />
                </ReactFlow>
            )}
        </div>
    );
}
