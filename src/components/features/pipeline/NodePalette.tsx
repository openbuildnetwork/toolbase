import React, { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { TIPToolRegistry } from '@/tip/registry';
import { Search, Upload, PackageCheck, ChevronLeft, ChevronRight, X, GripHorizontal } from 'lucide-react';

const TOOL_THUMBNAILS: Record<string, string> = {
    'magic-pdf': '/assets/thumbnails/magic-pdf.png',
    'pixel-axe': '/assets/thumbnails/pixel-axe.png',
    'redact-secrets': '/assets/thumbnails/redact-secrets.png',
    'base64': '/assets/thumbnails/b64EnDc.png',
    'data-lens': '/assets/thumbnails/data-lens.png',
    'json-to-interface': '/assets/thumbnails/json-to-interface.png',
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
    pdf: { label: 'PDF', color: '#ef4444' },
    image: { label: 'Image', color: '#a855f7' },
    security: { label: 'Security', color: '#f59e0b' },
    developer: { label: 'Dev', color: '#3b82f6' },
};

function getCategoryFromId(id: string): string {
    const prefix = id.split('/')[0];
    if (prefix === 'magic-pdf') return 'pdf';
    if (prefix === 'pixel-axe') return 'image';
    if (prefix === 'redact-secrets') return 'security';
    return 'developer';
}

function getThumbnail(toolId: string): string | null {
    const prefix = toolId.split('/')[0];
    return TOOL_THUMBNAILS[prefix] ?? null;
}

/** A single draggable tool card in the palette */
function PaletteToolCard({
    tool,
    onDragStart,
}: {
    tool: ReturnType<typeof TIPToolRegistry.getAll>[0];
    onDragStart: (e: React.DragEvent) => void;
}) {
    const thumbnail = getThumbnail(tool.id);
    const category = getCategoryFromId(tool.id);
    const catMeta = CATEGORY_META[category] ?? CATEGORY_META.developer;
    const [hovered, setHovered] = useState(false);

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 10,
                cursor: 'grab',
                background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                transition: 'all 0.15s ease',
                userSelect: 'none',
            }}
        >
            {thumbnail ? (
                <div style={{
                    width: 32, height: 32, borderRadius: 8, overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    flexShrink: 0, position: 'relative',
                    background: '#1a1a1e',
                }}>
                    <Image src={thumbnail} alt={tool.name} fill style={{ objectFit: 'cover' }} sizes="32px" />
                </div>
            ) : (
                <div style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: `${catMeta.color}18`, border: `1px solid ${catMeta.color}30`,
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: 16 }}>⚙️</span>
                </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 11.5, fontWeight: 600, color: '#e5e7eb',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {tool.name}
                </div>
                <div style={{
                    fontSize: 9, color: catMeta.color,
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2,
                    fontWeight: 600,
                }}>
                    {catMeta.label}
                </div>
            </div>
            <GripHorizontal style={{ width: 13, height: 13, color: '#444', flexShrink: 0 }} />
        </div>
    );
}

/** Special node card (File Input / Output) */
function SpecialNodeCard({
    icon,
    label,
    subtitle,
    color,
    nodeType,
    onDragStart,
}: {
    icon: React.ReactNode;
    label: string;
    subtitle: string;
    color: string;
    nodeType: string;
    onDragStart: (e: React.DragEvent, type: string) => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, nodeType)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10, cursor: 'grab',
                background: hovered ? `${color}12` : `${color}07`,
                border: `1px solid ${hovered ? `${color}35` : `${color}18`}`,
                transition: 'all 0.15s ease', userSelect: 'none',
            }}
        >
            <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `${color}15`, border: `1px solid ${color}25`,
                flexShrink: 0,
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#e5e7eb' }}>{label}</div>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 1.5 }}>
                    {subtitle}
                </div>
            </div>
        </div>
    );
}

/**
 * NodePalette — Floating collapsible left-side panel with tool library.
 * Users drag tools onto the canvas from here.
 */
export function NodePalette() {
    const [isOpen, setIsOpen] = useState(true);
    const [search, setSearch] = useState('');

    const tools = useMemo(() => {
        let all = TIPToolRegistry.getAll();
        if (search) {
            const q = search.toLowerCase();
            all = all.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
        }
        return all;
    }, [search]);

    const grouped = useMemo(() => {
        const acc: Record<string, typeof tools> = {};
        tools.forEach(t => {
            const cat = getCategoryFromId(t.id);
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(t);
        });
        return acc;
    }, [tools]);

    const onDragStart = (e: React.DragEvent, nodeType: string, toolId?: string) => {
        e.dataTransfer.setData('application/reactflow', nodeType);
        if (toolId) e.dataTransfer.setData('application/toolId', toolId);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Collapsed state — show a thin rail with a toggle button
    if (!isOpen) {
        return (
            <div style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
            }}>
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        pointerEvents: 'all',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 4,
                        marginLeft: 10,
                        width: 36, height: 80,
                        background: 'rgba(20,20,22,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(12px)',
                        transition: 'all 0.2s ease',
                    }}
                    title="Open tool palette"
                >
                    <span style={{ fontSize: 11, color: '#666', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em', fontWeight: 600 }}>Tools</span>
                    <ChevronRight style={{ width: 13, height: 13, color: '#555' }} />
                </button>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            zIndex: 20,
            width: 260,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(14,14,16,0.97)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
        }}>
            {/* Scoped dark scrollbar — avoids touching globals.css */}
            <style>{`
                #tip-palette-scroll::-webkit-scrollbar { width: 4px; }
                #tip-palette-scroll::-webkit-scrollbar-track { background: transparent; }
                #tip-palette-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                #tip-palette-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.22);
                }
                #tip-palette-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
            `}</style>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 14px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', letterSpacing: '0.02em' }}>
                        Tool Library
                    </div>
                    <div style={{ fontSize: 9.5, color: '#555', marginTop: 1 }}>
                        Drag tools onto the canvas
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: 7,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                    }}
                >
                    <ChevronLeft style={{ width: 13, height: 13, color: '#666' }} />
                </button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ position: 'relative' }}>
                    <Search style={{
                        position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                        width: 13, height: 13, color: '#555',
                    }} />
                    <input
                        type="text"
                        placeholder="Search tools..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '7px 9px 7px 28px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#e5e7eb',
                            fontSize: 12,
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                            }}
                        >
                            <X style={{ width: 12, height: 12, color: '#555' }} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable content */}
            <div id="tip-palette-scroll" style={{
                flex: 1, overflowY: 'auto', padding: '12px',
                display: 'flex', flexDirection: 'column', gap: 16,
            }}>
                {/* Special nodes */}
                {(!search || 'file input output'.includes(search.toLowerCase())) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{
                            fontSize: 9, fontWeight: 700, color: '#444',
                            textTransform: 'uppercase', letterSpacing: '0.12em',
                            padding: '0 2px 4px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            Pipeline Nodes
                        </div>
                        <SpecialNodeCard
                            icon={<Upload style={{ width: 14, height: 14, color: '#4ade80' }} />}
                            label="File Input"
                            subtitle="Starting point"
                            color="#4ade80"
                            nodeType="fileInput"
                            onDragStart={onDragStart}
                        />
                        <SpecialNodeCard
                            icon={<PackageCheck style={{ width: 14, height: 14, color: '#34d399' }} />}
                            label="Output"
                            subtitle="Terminal / download"
                            color="#34d399"
                            nodeType="output"
                            onDragStart={onDragStart}
                        />
                    </div>
                )}

                {/* Tool groups */}
                {Object.entries(grouped).map(([cat, catTools]) => {
                    const meta = CATEGORY_META[cat] ?? CATEGORY_META.developer;
                    return (
                        <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 9, fontWeight: 700,
                                color: meta.color,
                                textTransform: 'uppercase', letterSpacing: '0.12em',
                                padding: '0 2px 4px',
                                borderBottom: `1px solid ${meta.color}18`,
                            }}>
                                <div style={{
                                    width: 5, height: 5, borderRadius: '50%',
                                    background: meta.color,
                                }} />
                                {meta.label}
                            </div>
                            {catTools.map(tool => (
                                <PaletteToolCard
                                    key={tool.id}
                                    tool={tool}
                                    onDragStart={(e) => onDragStart(e, 'tool', tool.id)}
                                />
                            ))}
                        </div>
                    );
                })}

                {/* Empty state */}
                {Object.keys(grouped).length === 0 && search && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 8, padding: '32px 16px', textAlign: 'center',
                    }}>
                        <Search style={{ width: 28, height: 28, color: '#333' }} />
                        <div style={{ fontSize: 12, color: '#555' }}>
                            No tools found for &ldquo;{search}&rdquo;
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                padding: '10px 14px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <span style={{ fontSize: 9.5, color: '#444' }}>
                    {tools.length} tools available
                </span>
            </div>
        </div>
    );
}
