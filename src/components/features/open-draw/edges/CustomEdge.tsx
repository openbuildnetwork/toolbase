import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    EdgeProps,
    useReactFlow,
    Edge,
} from '@xyflow/react';

interface CustomEdgeData extends Record<string, unknown> {
    label?: string;
    textColor?: string;
    animated?: boolean;
    markerStart?: string;
}

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
}: EdgeProps<Edge<CustomEdgeData>>) {
    const { setEdges } = useReactFlow();

    // Default to SmoothStep if not specified
    // In a real app, 'data.pathType' could switch between bezier/straight/step
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });



    const hasLabel = data?.label && typeof data.label === 'string' && data.label.length > 0;



    // React Flow's BaseEdge style prop handles 'strokeDasharray' and 'animation' if we pass it right.
    // BUT 'animated' prop on BaseEdge controls the class.
    // We can manually add class or styles.

    const edgeStyle = {
        ...style,
        strokeWidth: style.strokeWidth || 2,
        stroke: selected ? '#3b82f6' : (style.stroke || '#b1b1b7'), // Highlight on select
        filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
        transition: 'stroke 0.2s, filter 0.2s',
        cursor: 'pointer',
        // If animated reverse, we might need a custom class or negative animation delay/direction
    };

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                markerStart={data?.markerStart} // Support markerStart from data
                style={edgeStyle}
                // Determine animation class. React Flow adds 'react-flow__edge-path' by default.
                // We can append a custom class for reverse animation if needed.
                className={selected ? 'react-flow__edge-path-selected' : ''}
            />

            {hasLabel && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            // background: 'transparent', 
                            padding: '2px 4px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                            pointerEvents: 'all',
                            color: data?.textColor, // Allow class to dictate if undefined
                            zIndex: 10,
                        }}
                        className="nodrag nopan text-gray-800 dark:text-gray-200 bg-slate-50 dark:bg-[#0f0f0f]"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            const newLabel = prompt('Edit Label:', data.label as string);
                            if (newLabel !== null) {
                                setEdges((eds) =>
                                    eds.map((edge) => {
                                        if (edge.id === id) {
                                            return { ...edge, data: { ...edge.data, label: newLabel } };
                                        }
                                        return edge;
                                    })
                                );
                            }
                        }}
                    >
                        {data.label as string}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
