import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import type { NodeData, ShapeDefinition } from '@/app/(tools)/open-draw/types/open-draw.types';
import { SHAPE_DEFINITIONS } from './shapes';
import { EditableLabel, useNodeStyle } from './Nodes';

// --- Types ---
interface CustomNodeProps extends NodeProps {
    data: NodeData & { shapeType?: string };
}

export function GenericShapeNode({ id, selected, data, type }: CustomNodeProps) {
    const style = useNodeStyle(data);

    // Determine shape geometry
    // Fallback to rectangle if not found
    // FIX: We must check data.shapeType first because 'type' is often 'generic-shape'
    const specificType = (data.shapeType as string) || type || 'rectangle';

    // Check if we have a custom definition in data, otherwise look up global
    const def = (data as NodeData & { customDefinition?: ShapeDefinition }).customDefinition || SHAPE_DEFINITIONS[specificType] || SHAPE_DEFINITIONS['rectangle'];

    // Gradient ID
    const gradientId = `grad-${id}`;

    // Fill logic
    let fill = String(style.backgroundColor);
    if (data.gradient) {
        fill = `url(#${gradientId})`;
    } else if (!data.backgroundColor && !style.backgroundColor) {
        fill = '#ffffff';
    }

    // Shadow logic
    const shadowFilter = data.shadow ? 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.15))' : 'none';
    const selectionFilter = selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : '';
    const combinedFilter = [shadowFilter !== 'none' ? shadowFilter : '', selectionFilter].filter(Boolean).join(' ') || 'none';

    // Line Style logic
    let strokeDasharray: string | undefined = undefined;
    if (data.borderStyle === 'dashed') strokeDasharray = '5,5';
    if (data.borderStyle === 'dotted') strokeDasharray = '2,2';

    return (
        <>
            <NodeResizer
                minWidth={30}
                minHeight={30}
                isVisible={selected}
                lineClassName="border-blue-500"
                handleClassName="h-3 w-3 bg-white border-2 border-blue-500 rounded"
            />

            {/* Outer Container - Position & Handles (No Overflow Hidden) */}
            <div
                className="relative w-full h-full group"
                style={{
                    minWidth: 30,
                    minHeight: 30,
                    opacity: style.opacity
                }}
            >
                {/* Conditional Render: Rectangle/Square vs Generic Path */}
                {(specificType === 'rectangle' || specificType === 'square') && !(data as NodeData & { customDefinition?: ShapeDefinition }).customDefinition ? (
                    // --------------------------------------------------------
                    // CASE 1: Rectangle/Square - Uses SVG <rect> for proper 'rx'
                    // --------------------------------------------------------
                    <svg
                        width="100%"
                        height="100%"
                        // No viewBox ensures rx units are pixels
                        className="overflow-visible absolute inset-0"
                        style={{
                            filter: combinedFilter,
                            transition: 'filter 0.2s ease'
                        }}
                    >
                        <defs>
                            {data.gradient && (
                                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={String(style.backgroundColor || '#ffffff')} />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
                                </linearGradient>
                            )}
                            {data.sketch && (
                                <filter id={`sketch-${id}`}>
                                    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                                </filter>
                            )}
                        </defs>

                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            rx={data.borderRadius}
                            ry={data.borderRadius}
                            fill={data.imageUrl ? 'none' : fill}
                            stroke={style.borderColor}
                            strokeWidth={data.borderWidth}
                            strokeDasharray={strokeDasharray}
                            className="transition-colors duration-200"
                            style={{
                                filter: data.sketch ? `url(#sketch-${id})` : undefined
                            }}
                        />

                        {/* Image for Rect */}
                        {data.imageUrl && (
                            <image
                                href={data.imageUrl}
                                x="-50%" y="-50%" width="200%" height="200%"
                                preserveAspectRatio={
                                    data.imageMode === 'contain' ? 'xMidYMid meet' :
                                        data.imageMode === 'stretch' ? 'none' :
                                            'xMidYMid slice'
                                }
                                style={{
                                    clipPath: data.borderRadius ? `inset(25% round ${data.borderRadius}px)` : 'inset(25%)',
                                    transform: `translate(${data.imageX || 0}%, ${data.imageY || 0}%) scale(${data.imageZoom ? data.imageZoom / 100 : 1})`,
                                    transformOrigin: 'center',
                                    transformBox: 'fill-box'
                                }}
                            />
                        )}

                        {/* Glass Overlay for Rect */}
                        {data.glass && (
                            <rect
                                x="0" y="0" width="100%" height="100%"
                                rx={data.borderRadius} ry={data.borderRadius}
                                fill="white"
                                fillOpacity="0.2"
                                style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
                            />
                        )}
                    </svg>
                ) : (
                    // --------------------------------------------------------
                    // CASE 2: Generic Path (Circle, Triangle, etc.)
                    // --------------------------------------------------------
                    <div className="w-full h-full">
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={def.viewBox || "0 0 100 100"}
                            preserveAspectRatio="none"
                            className="overflow-visible"
                            style={{
                                filter: combinedFilter,
                                transition: 'filter 0.2s ease'
                            }}
                        >
                            <defs>
                                {data.gradient && (
                                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={String(style.backgroundColor || '#ffffff')} />
                                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
                                    </linearGradient>
                                )}
                                {data.sketch && (
                                    <filter id={`sketch-${id}`}>
                                        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                                    </filter>
                                )}
                                {data.imageUrl && (
                                    <clipPath id={`clip-${id}`}>
                                        {def.path ? (
                                            <path d={def.path} />
                                        ) : (
                                            def.paths?.map((p: { d: string; fill?: string; stroke?: string }, i: number) => (
                                                <path key={i} d={p.d} />
                                            ))
                                        )}
                                    </clipPath>
                                )}
                            </defs>

                            {!data.imageUrl && def.path && (
                                <path
                                    d={def.path}
                                    fill={fill}
                                    stroke={style.borderColor}
                                    strokeWidth={data.borderWidth}
                                    strokeDasharray={strokeDasharray}
                                    vectorEffect="non-scaling-stroke"
                                    className="transition-colors duration-200"
                                    style={{
                                        filter: data.sketch ? `url(#sketch-${id})` : undefined,
                                        strokeLinejoin: data.borderRadius ? "round" : "miter"
                                    }}
                                />
                            )}

                            {!data.imageUrl && def.paths?.map((p: { d: string; fill?: string; stroke?: string }, i: number) => (
                                <path
                                    key={i}
                                    d={p.d}
                                    fill={p.fill ? p.fill : (p.fill === 'none' ? 'none' : fill)}
                                    stroke={p.stroke ? p.stroke : style.borderColor}
                                    strokeWidth={data.borderWidth}
                                    strokeDasharray={strokeDasharray}
                                    vectorEffect="non-scaling-stroke"
                                    className="transition-colors duration-200"
                                    style={{
                                        filter: data.sketch ? `url(#sketch-${id})` : undefined,
                                        strokeLinejoin: data.borderRadius ? "round" : "miter"
                                    }}
                                />
                            ))}

                            {/* Image for Path with ClipPath */}
                            {data.imageUrl && (
                                <image
                                    href={data.imageUrl}
                                    x="0" y="0" width="100%" height="100%"
                                    preserveAspectRatio={
                                        data.imageMode === 'contain' ? 'xMidYMid meet' :
                                            data.imageMode === 'stretch' ? 'none' :
                                                'xMidYMid slice'
                                    }
                                    clipPath={`url(#clip-${id})`}
                                    style={{
                                        transform: `translate(${data.imageX || 0}%, ${data.imageY || 0}%) scale(${data.imageZoom ? data.imageZoom / 100 : 1})`,
                                        transformOrigin: 'center',
                                        transformBox: 'fill-box'
                                    }}
                                />
                            )}

                            {/* Always draw stroke on top if image has border */}
                            {data.imageUrl && (
                                def.path ? (
                                    <path
                                        d={def.path}
                                        fill="none"
                                        stroke={style.borderColor}
                                        strokeWidth={data.borderWidth}
                                        strokeDasharray={strokeDasharray}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                ) : (
                                    def.paths?.map((p: { d: string; fill?: string; stroke?: string }, i: number) => (
                                        <path
                                            key={i}
                                            d={p.d}
                                            fill="none"
                                            stroke={style.borderColor}
                                            strokeWidth={data.borderWidth}
                                            strokeDasharray={strokeDasharray}
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    ))
                                )
                            )}
                        </svg>
                        {/* Glass Overlay (if glass is on) */}
                        {data.glass && (
                            <div className="absolute inset-0 pointer-events-none mix-blend-overlay bg-white/20"></div>
                        )}
                    </div>
                )}

                {/* Text Label - Centered Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                    <EditableLabel
                        id={id}
                        label={data.label || def.label}
                        style={{
                            color: data.textColor || '#000000',
                            fontSize: data.fontSize || 14,
                            pointerEvents: 'auto'
                        }}
                    />
                </div>

                {/* Connection Handles - Outside wrapper to avoid clipping */}
                <Handle id="top" type="source" position={Position.Top} className="w-3! h-3! bg-blue-500! opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle id="bottom" type="source" position={Position.Bottom} className="w-3! h-3! bg-blue-500! opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle id="left" type="source" position={Position.Left} className="w-3! h-3! bg-blue-500! opacity-0 group-hover:opacity-100 transition-opacity" />
                <Handle id="right" type="source" position={Position.Right} className="w-3! h-3! bg-blue-500! opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
        </>
    );
}
