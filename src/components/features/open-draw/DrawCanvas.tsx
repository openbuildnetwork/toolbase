import { ReactFlow, Background, Controls, MiniMap, ConnectionMode, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useOpenDraw } from '@/modules/open-draw/hooks/useOpenDraw';
import {
    RectangleNode,
    CircleNode,
    DiamondNode,
    TextNode,
    CylinderNode,
    CloudNode,
    ActorNode,
    DocumentNode,
    ParallelogramNode,
    TriangleNode
} from './nodes/Nodes';
import { useCallback, useRef, useEffect, useState } from 'react';

const nodeTypes = {
    rectangle: RectangleNode,
    circle: CircleNode,
    diamond: DiamondNode,
    text: TextNode,
    cylinder: CylinderNode,
    cloud: CloudNode,
    actor: ActorNode,
    document: DocumentNode,
    parallelogram: ParallelogramNode,
    triangle: TriangleNode,
};

export function DrawCanvas({ openDraw, isDark = false }: { openDraw: ReturnType<typeof useOpenDraw>, isDark?: boolean }) {
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

            if (!rfInstance) return;

            const position = rfInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Default size and label logic
            let width = 120;
            let height = 80;
            let label = type.charAt(0).toUpperCase() + type.slice(1);

            if (type === 'circle') { width = 100; height = 100; label = 'Start/End'; }
            if (type === 'diamond') { width = 120; height = 120; label = 'Decision'; }
            if (type === 'cylinder') { width = 100; height = 120; label = 'Database'; }
            if (type === 'cloud') { width = 140; height = 100; label = 'Cloud'; }
            if (type === 'actor') { width = 60; height = 120; label = 'User'; }
            if (type === 'text') { width = 100; height = 40; label = 'Text'; }

            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label },
                style: { width, height }
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [rfInstance, setNodes]
    );

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#050505]" ref={reactFlowWrapper}>
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
                    nodeTypes={nodeTypes}
                    connectionMode={ConnectionMode.Loose}
                    defaultEdgeOptions={{ type: 'smoothstep', animated: false, style: { strokeWidth: 2, stroke: '#94a3b8' } }}
                    snapToGrid={true}
                    snapGrid={[20, 20]}
                    fitView
                    colorMode={isDark ? 'dark' : 'light'}
                    deleteKeyCode={['Backspace', 'Delete']}
                    multiSelectionKeyCode="Shift"
                    selectionOnDrag
                    panOnDrag={[1, 2]}
                >
                    <Background color="#94a3b8" gap={20} size={1} variant={BackgroundVariant.Dots} className="opacity-20" />
                    <Controls className="bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 [&>button]:fill-gray-600 dark:[&>button]:fill-gray-300 shadow-sm" />
                    <MiniMap
                        zoomable
                        pannable
                        className="bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm"
                        nodeColor={() => '#e2e8f0'}
                        maskColor="rgba(0,0,0,0.05)"
                    />
                </ReactFlow>
            )}
        </div>
    );
}
