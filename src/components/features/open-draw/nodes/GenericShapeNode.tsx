import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import type { NodeData, ShapeDefinition } from '@/types/open-draw.types';
import { SHAPE_DEFINITIONS } from './shapes';
import { EditableLabel } from './Nodes';

// --- Types ---
interface CustomNodeProps extends NodeProps {
    data: NodeData & { shapeType?: string };
}


// --- Style Helper ---
function useNodeStyle(data: NodeData, defaultBg: string = 'white') {
    return useMemo(() => ({
        backgroundColor: data.backgroundColor || defaultBg,
        borderColor: data.borderColor || '#e5e7eb',
        borderWidth: data.borderWidth ? `${data.borderWidth} ` : '1', // Just number for SVG stroke-width
        color: data.textColor || '#000000',
        fontSize: data.fontSize ? `${data.fontSize} px` : '14px',
    }), [data, defaultBg]);
}

export function GenericShapeNode({ id, selected, data, type }: CustomNodeProps) {
    const style = useNodeStyle(data);

    // Determine shape geometry
    // Fallback to rectangle if not found
    const shapeType = type || 'rectangle';
    // Check if we have a custom definition in data, otherwise look up global
    const def = (data as any).customDefinition as ShapeDefinition || SHAPE_DEFINITIONS[shapeType] || SHAPE_DEFINITIONS['rectangle'];

    return (
        <>
            <NodeResizer
                minWidth={30}
                minHeight={30}
                isVisible={selected}
                lineClassName="border-blue-500"
                handleClassName="h-3 w-3 bg-white border-2 border-blue-500 rounded"
            />

            {/* Main Shape Container */}
            <div className="relative w-full h-full group" style={{ minWidth: 30, minHeight: 30 }}>
                {/* SVG Render */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox={def.viewBox || "0 0 100 100"}
                    preserveAspectRatio="none"
                    className="overflow-visible"
                    style={{
                        filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
                        transition: 'filter 0.2s ease'
                    }}
                >
                    {/* Drop shadow filter definition could go here if we want fancy SVG shadows */}

                    {/* Main Shape Path(s) */}
                    {def.path && (
                        <path
                            d={def.path}
                            fill={String(style.backgroundColor)}
                            stroke={style.borderColor}
                            strokeWidth={style.borderWidth}
                            vectorEffect="non-scaling-stroke" // Keeps stroke width constant on resize
                            className="transition-colors duration-200"
                        />
                    )}

                    {def.paths?.map((p: any, i: number) => (
                        <path
                            key={i}
                            d={p.d}
                            fill={p.fill ? p.fill : (p.fill === 'none' ? 'none' : String(style.backgroundColor))}
                            stroke={p.stroke ? p.stroke : style.borderColor}
                            strokeWidth={style.borderWidth}
                            vectorEffect="non-scaling-stroke"
                            className="transition-colors duration-200"
                        />
                    ))}
                </svg>

                {/* Text Label - Centered Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                    <EditableLabel
                        id={id}
                        label={data.label || def.label}
                        style={{
                            color: data.textColor || '#000000',
                            fontSize: data.fontSize || 14,
                            pointerEvents: 'auto' // Re-enable for text interactions
                        }}
                    />
                </div>

                {/* Connection Handles */}
                <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </>
    );
}
