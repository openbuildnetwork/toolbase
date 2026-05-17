"use client";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Edge,
    Node,
    useReactFlow,
    ConnectionMode,
    BackgroundVariant,
    NodeTypes,
    EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useOpenDraw } from '@/app/(tools)/open-draw/hooks/useOpenDraw';
import { GenericShapeNode } from '../nodes/GenericShapeNode';
import { IconShapeNode } from '../nodes/IconShapeNode';
import { ShapeDefinition } from '@/app/(tools)/open-draw/types/open-draw.types';
import { SHAPE_DEFINITIONS } from '../nodes/shapes';
import { CustomEdge } from '../edges/CustomEdge';
import { useCallback, useRef, useEffect, useState } from 'react';
import { StyleManager } from '../utils/style-manager';
import { ContextMenu } from './ContextMenu';

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
        selectedNodes,
        onNodesChange,
        onEdgesChange,
        onConnect,
        onInit,
        onSelectionChange,
        setNodes,
        setEdges,
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
                // Try Image data first
                if (input.startsWith('IMAGE_DATA:')) {
                    const base64 = input.replace('IMAGE_DATA:', '');
                    const newNode: Node = {
                        id: `image-${Date.now()}`,
                        type: 'generic-shape',
                        position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 },
                        data: {
                            label: '',
                            imageUrl: base64,
                            shapeType: 'rectangle', // Default to rectangle
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            borderWidth: 0,
                            ...StyleManager.getDefaultStyle(),
                        },
                        width: 300,
                        height: 200,
                    };
                    addNodes(newNode);
                    return;
                }

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
                    type: 'generic-shape',
                    position: { x: window.innerWidth / 2 - 300 + (Math.random() * 50), y: window.innerHeight / 2 - 50 + (Math.random() * 50) }, // Approx center of canvas
                    data: {
                        label: def.label,
                        shapeType: 'custom',
                        customDefinition: def, // Passed to GenericShapeNode
                        backgroundColor: '#1e1e1e', // Defaults for custom shape if not in style
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        textColor: '#ffffff',
                        fontSize: 14,
                        ...StyleManager.getDefaultStyle(), // Apply user default style
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
                        iconType: customData.iconType,
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
                    ...StyleManager.getDefaultStyle(), // Apply user default style if any
                },
                style: {
                    width: shapeDef.width || 100,
                    height: shapeDef.height || 100
                }
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [rfInstance, setNodes, isDark]
    );

    const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        // Prompt for new label
        const currentLabel = typeof edge.data?.label === 'string' ? edge.data.label : '';
        const newLabel = prompt('Enter Label:', currentLabel);

        if (newLabel !== null) {
            setEdges((eds) =>
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
    }, [setEdges]);

    const [menu, setMenu] = useState<{ id: string; type: 'node' | 'edge'; top?: number; left?: number; right?: number; bottom?: number } | null>(null);

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();

            if (!reactFlowWrapper.current) return;
            const pane = reactFlowWrapper.current.getBoundingClientRect();

            // Precise offset calculation to keep menu within bounds (Relative to container)
            const menuWidth = 180;
            const menuHeight = 350;

            let left = event.clientX - pane.left;
            let top = event.clientY - pane.top;

            if (left + menuWidth > pane.width) left = pane.width - menuWidth - 10;
            if (top + menuHeight > pane.height) top = pane.height - menuHeight - 10;

            setMenu({
                id: node.id,
                type: 'node',
                top,
                left,
            });
        },
        [setMenu]
    );

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.preventDefault();

            if (!reactFlowWrapper.current) return;
            const pane = reactFlowWrapper.current.getBoundingClientRect();

            const menuWidth = 180;
            const menuHeight = 150; // Edges have smaller menu usually

            let left = event.clientX - pane.left;
            let top = event.clientY - pane.top;

            if (left + menuWidth > pane.width) left = pane.width - menuWidth - 10;
            if (top + menuHeight > pane.height) top = pane.height - menuHeight - 10;

            setMenu({
                id: edge.id,
                type: 'edge',
                top,
                left,
            });
        },
        [setMenu]
    );

    const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

    const groupNodes = useCallback(() => {
        if (!selectedNodes || selectedNodes.length < 2) return;

        setNodes((currentNodes) => {
            const selected = currentNodes.filter(n => selectedNodes.includes(n.id));
            if (selected.length < 2) return currentNodes;

            // Calculate Bounding Box
            const minX = Math.min(...selected.map(n => n.position.x));
            const minY = Math.min(...selected.map(n => n.position.y));
            const maxX = Math.max(...selected.map(n => n.position.x + (n.measured?.width || 100)));
            const maxY = Math.max(...selected.map(n => n.position.y + (n.measured?.height || 100)));

            const padding = 24;
            const groupId = `group-${Date.now()}`;

            const groupNode: Node = {
                id: groupId,
                type: 'generic-shape',
                position: { x: minX - padding, y: minY - padding },
                zIndex: -1,
                data: {
                    label: 'Group',
                    shapeType: 'rectangle',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderColor: '#3b82f6',
                    borderStyle: 'dashed',
                    borderWidth: 1,
                    fontSize: 10,
                    textColor: '#3b82f6'
                },
                style: {
                    width: (maxX - minX) + padding * 2,
                    height: (maxY - minY) + padding * 2
                },
            };

            const updatedNodes = currentNodes.map(node => {
                if (selectedNodes.includes(node.id)) {
                    return {
                        ...node,
                        parentId: groupId,
                        extent: 'parent' as const,
                        position: {
                            x: node.position.x - (minX - padding),
                            y: node.position.y - (minY - padding)
                        }
                    };
                }
                return node;
            });

            return [...updatedNodes, groupNode];
        });
        setMenu(null);
    }, [selectedNodes, setNodes]);

    const ungroupNodes = useCallback((targetId?: string) => {
        setNodes((currentNodes) => {
            // Determine targets: either specific targetId or all selected nodes that are groups
            const targets = targetId
                ? [currentNodes.find(n => n.id === targetId)]
                : currentNodes.filter(n => selectedNodes.includes(n.id) && n.data?.label === 'Group'); // Simple heuristic for now

            const targetIds = targets.filter(Boolean).map(n => n!.id);
            if (targetIds.length === 0) return currentNodes;

            let newNodes = [...currentNodes];

            targetIds.forEach(groupId => {
                const groupNode = newNodes.find(n => n.id === groupId);
                if (!groupNode) return;

                newNodes = newNodes.map(node => {
                    if (node.parentId === groupId) {
                        return {
                            ...node,
                            parentId: undefined,
                            extent: undefined,
                            position: {
                                x: node.position.x + groupNode.position.x,
                                y: node.position.y + groupNode.position.y
                            }
                        };
                    }
                    return node;
                }).filter(n => n.id !== groupId); // Remove the group node
            });

            return newNodes;
        });
        setMenu(null);
    }, [selectedNodes, setNodes]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if we are not typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            // Copy
            if (e.ctrlKey && e.key === 'c') {
                const selected = nodes.find(n => selectedNodes.includes(n.id));
                if (selected) {
                    localStorage.setItem('open-draw-clipboard', JSON.stringify({ type: 'node', data: selected }));
                }
            }

            // Paste
            if (e.ctrlKey && e.key === 'v') {
                const clipboard = localStorage.getItem('open-draw-clipboard');
                if (clipboard) {
                    const { type, data } = JSON.parse(clipboard);
                    if (type === 'node') {
                        const newNode: Node = {
                            ...data,
                            id: `${data.id}-paste-${Date.now()}`,
                            position: {
                                x: data.position.x + 40,
                                y: data.position.y + 40,
                            },
                        };
                        setNodes(nds => nds.concat(newNode));
                    }
                }
            }

            // Duplicate
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                const selected = nodes.filter(n => selectedNodes.includes(n.id));
                if (selected.length > 0) {
                    const newNodes = selected.map(n => ({
                        ...n,
                        id: `${n.id}-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        position: { x: n.position.x + 20, y: n.position.y + 20 },
                        selected: true
                    }));
                    setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(newNodes));
                }
            }

            // Group (Ctrl+G)
            if (e.ctrlKey && e.key === 'g' && !e.shiftKey) {
                e.preventDefault();
                groupNodes();
            }

            // Ungroup (Ctrl+Shift+G)
            if (e.ctrlKey && e.shiftKey && e.key === 'G') {
                e.preventDefault();
                ungroupNodes();
            }

            // Bring to Front/To Back (Ctrl+Shift+F/B)
            if (e.ctrlKey && e.shiftKey) {
                if (e.key === 'F') {
                    e.preventDefault();
                    const maxZ = Math.max(...nodes.map(n => n.zIndex || 0), 0);
                    setNodes(nds => nds.map(n => selectedNodes.includes(n.id) ? { ...n, zIndex: maxZ + 1 } : n));
                }
                if (e.key === 'B') {
                    e.preventDefault();
                    const minZ = Math.min(...nodes.map(n => n.zIndex || 0), 0);
                    setNodes(nds => nds.map(n => selectedNodes.includes(n.id) ? { ...n, zIndex: minZ - 1 } : n));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, selectedNodes, setNodes, groupNodes, ungroupNodes]);

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
                    onNodeContextMenu={onNodeContextMenu}
                    onEdgeContextMenu={onEdgeContextMenu}
                    onPaneClick={onPaneClick}
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
                    onlyRenderVisibleElements
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
                    {menu && (
                        <ContextMenu
                            {...menu}
                            selectedNodes={selectedNodes}
                            onClick={onPaneClick}
                            onNodeChange={setNodes}
                            onEdgeChange={setEdges}
                            onGroup={groupNodes}
                            onUngroup={() => ungroupNodes(menu.id)}
                        />
                    )}
                </ReactFlow>
            )}
        </div>
    );
}
