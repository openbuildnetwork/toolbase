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

            <div className="relative w-full h-full group flex flex-col items-center justify-center p-2" style={{ minWidth: 30, minHeight: 30 }}>
                {/* Icon Render */}
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <IconComponent
                        size={Math.min(Number(w), Number(h))}
                        color={style.stroke}
                        strokeWidth={Number(style.strokeWidth)}
                        fill={style.fill}
                        className="w-full h-full transition-all duration-200"
                        style={{
                            filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : 'none',
                        }}
                    />
                </div>

                {/* Text Label - Below Icon */}
                <div className="absolute -bottom-6 w-[150%] flex items-center justify-center pointer-events-none">
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

                {/* Connection Handles */}
                <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </>
    );
}
