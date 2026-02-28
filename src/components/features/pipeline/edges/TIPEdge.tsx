import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, EdgeProps } from '@xyflow/react';

export function TIPEdge({
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
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isInvalid = data?.isInvalid;
    const isRunning = data?.isRunning;
    const strokeColor = isInvalid ? '#ef4444' : (data?.color || '#9ca3af');

    const edgeStyle = {
        ...style,
        strokeWidth: selected ? 3 : 2,
        stroke: strokeColor as string,
    };

    const className = isRunning ? 'react-flow__edge-path animate-pulse' : 'react-flow__edge-path';

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} id={id} className={className} />
            {isInvalid && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        className="nodrag nopan"
                    >
                        Incompatible types
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
