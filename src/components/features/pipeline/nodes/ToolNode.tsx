import { Handle, Position } from '@xyflow/react';
import { TIPToolRegistry } from '@/tip/registry';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export function getTypeColor(type: string): string {
    if (type === 'application/pdf') return '#ef4444';
    if (type.startsWith('image/')) return '#a855f7';
    if (type.startsWith('text/')) return '#3b82f6';
    if (type === 'application/json') return '#eab308';
    if (type === 'application/zip') return '#f97316';
    if (type === 'application/octet-stream') return '#64748b';
    return '#6b7280';
}

const TOOL_THUMBNAILS: Record<string, string> = {
    'magic-pdf': '/assets/thumbnails/magic-pdf.png',
    'pixel-axe': '/assets/thumbnails/pixel-axe.png',
    'redact-secrets': '/assets/thumbnails/redact-secrets.png',
    'base64': '/assets/thumbnails/b64EnDc.png',
    'data-lens': '/assets/thumbnails/data-lens.png',
    'json-to-interface': '/assets/thumbnails/json-to-interface.png',
    'open-draw': '/assets/thumbnails/open-draw.png',
    'ping-tester': '/assets/thumbnails/ping-tester.png',
    'speed-test': '/assets/thumbnails/speed-test.png',
    'passwordx': '/assets/thumbnails/passwordx.png',
};

export function getToolThumbnail(toolId: string): string | null {
    const prefix = toolId.split('/')[0];
    return TOOL_THUMBNAILS[prefix] ?? null;
}

export function ToolNode({ data }: { data: any }) {
    const tool = TIPToolRegistry.get(data.toolId);
    if (!tool) return null;

    const status = data.status || 'idle';
    const thumbnail = getToolThumbnail(data.toolId);

    const inColor = getTypeColor(tool.consumes[0] || '');
    const outColor = getTypeColor(tool.produces[0] || '');

    const containerStyle: React.CSSProperties = {
        width: 220,
        background: status === 'complete'
            ? 'linear-gradient(145deg, #0d1f14 0%, #0f1a10 100%)'
            : status === 'error'
                ? 'linear-gradient(145deg, #1f0d0d 0%, #1a0f0f 100%)'
                : status === 'running'
                    ? 'linear-gradient(145deg, #0d1020 0%, #0f1028 100%)'
                    : 'linear-gradient(145deg, #161618 0%, #111113 100%)',
        border: `1.5px solid ${status === 'running' ? 'rgba(99,102,241,0.7)' :
            status === 'complete' ? 'rgba(34,197,94,0.5)' :
                status === 'error' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14,
        padding: '12px',
        boxShadow: status === 'running'
            ? '0 0 20px rgba(99,102,241,0.25), 0 8px 32px rgba(0,0,0,0.4)'
            : status === 'complete'
                ? '0 0 20px rgba(34,197,94,0.15), 0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
    };

    return (
        <div style={containerStyle}>
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Left}
                style={{
                    background: inColor,
                    width: 11,
                    height: 11,
                    border: '2px solid #111',
                    boxShadow: `0 0 6px ${inColor}66`,
                }}
            />

            {/* Header row: thumbnail + name + status icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                {thumbnail ? (
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#1a1a1e',
                        flexShrink: 0,
                        position: 'relative',
                    }}>
                        <Image
                            src={thumbnail}
                            alt={tool.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="36px"
                        />
                    </div>
                ) : (
                    <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: 'rgba(139,92,246,0.15)',
                        border: '1px solid rgba(139,92,246,0.2)',
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: 18 }}>⚙️</span>
                    </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#f0f0f0',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {tool.name}
                    </div>
                    <div style={{
                        fontSize: 9,
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginTop: 2,
                    }}>
                        {tool.id.split('/')[1]}
                    </div>
                </div>

                {/* Status indicator */}
                <div style={{ flexShrink: 0 }}>
                    {status === 'running' && (
                        <Loader2 style={{ width: 15, height: 15, color: '#818cf8', animation: 'spin 1s linear infinite' }} />
                    )}
                    {status === 'complete' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CheckCircle2 style={{ width: 14, height: 14, color: '#4ade80' }} />
                            <span style={{ fontSize: 10, color: '#4ade80', fontFamily: 'monospace' }}>
                                {((data.durationMs || 0) / 1000).toFixed(1)}s
                            </span>
                        </div>
                    )}
                    {status === 'error' && (
                        <AlertCircle style={{ width: 15, height: 15, color: '#f87171' }} />
                    )}
                </div>
            </div>

            {/* I/O flow pill */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 7,
                padding: '5px 8px',
                fontSize: 9.5,
                fontFamily: 'monospace',
            }}>
                <span style={{ color: inColor, fontWeight: 600, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tool.consumes[0]?.split('/')[1]?.toUpperCase() || 'ANY'}
                </span>
                <span style={{ color: '#444', fontSize: 11 }}>→</span>
                <span style={{ color: outColor, fontWeight: 600, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                    {tool.produces[0]?.split('/')[1]?.toUpperCase() || 'ANY'}
                </span>
            </div>

            {/* Error message */}
            {status === 'error' && data.error && (
                <div style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: '#f87171',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 6,
                    padding: '5px 7px',
                    lineHeight: 1.4,
                }}>
                    {data.error}
                </div>
            )}

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                style={{
                    background: outColor,
                    width: 11,
                    height: 11,
                    border: '2px solid #111',
                    boxShadow: `0 0 6px ${outColor}66`,
                }}
            />
        </div>
    );
}
