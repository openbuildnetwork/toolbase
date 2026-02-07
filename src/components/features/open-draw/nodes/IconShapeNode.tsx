import { Handle, Position, NodeResizer, NodeProps } from '@xyflow/react';
import { icons } from 'lucide-react';
import { EditableLabel } from './Nodes';
import { useMemo } from 'react';
import type { NodeData } from '@/types/open-draw.types';

interface IconNodeProps extends NodeProps {
    data: NodeData & { iconName: keyof typeof icons };
}

export function IconShapeNode({ id, selected, data, width, height }: IconNodeProps) {
    const IconComponent = icons[data.iconName] || icons.Circle; // Fallback

    // Default size if not yet measured or provided
    const w = width ?? 50;
    const h = height ?? 50;

    const style = useMemo(() => ({
        color: data.textColor || '#000000',
        stroke: data.borderColor || '#000000',
        strokeWidth: data.borderWidth || 2,
        fill: data.backgroundColor !== 'transparent' ? data.backgroundColor : 'none',
    }), [data]);

    return (
        <>
            <NodeResizer
                isVisible={selected}
                minWidth={30}
                minHeight={30}
                handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
            />

            {/* Icon Render */}
            <div className="relative w-full h-full group flex flex-col items-center justify-center p-2" style={{ minWidth: 30, minHeight: 30 }}>
                <div className="relative w-full h-full flex items-center justify-center overflow-visible">
                    <IconComponent
                        size={Math.min(Number(w), Number(h))}
                        color={style.stroke} // Lucide uses 'color' for stroke (currentColor)
                        // Also explicitly pass stroke in case 'color' is ignored or overridden
                        stroke={style.stroke}
                        strokeWidth={Number(style.strokeWidth)}
                        fill={style.fill}
                        className="w-full h-full transition-all duration-200"
                        style={{
                            filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
                        }}
                    />
                </div>

                {/* Text Label - Below Icon */}
                <div className="absolute -bottom-8 w-[200%] flex items-center justify-center pointer-events-none z-50">
                    <EditableLabel
                        id={id}
                        label={data.label || ''}
                        style={{
                            color: style.color,
                            fontSize: data.fontSize || 14,
                            pointerEvents: 'auto'
                        }}
                    />
                </div>

                {/* Connection Handles - All Source to allow dragging FROM any side. Loose mode allows TO any side. Unique IDs needed! */}
                <Handle id="top" type="source" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-50" />
                <Handle id="bottom" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-50" />
                <Handle id="left" type="source" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-50" />
                <Handle id="right" type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity z-50" />
            </div>
        </>
    );
}
