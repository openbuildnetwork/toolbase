import { Handle, Position } from '@xyflow/react';
import { TIPToolRegistry } from '@/tip/registry';
import { Loader2 } from 'lucide-react';

export function getTypeColor(type: string): string {
    if (type === 'application/pdf') return '#ef4444';
    if (type.startsWith('image/')) return '#a855f7';
    if (type.startsWith('text/')) return '#3b82f6';
    if (type === 'application/json') return '#eab308';
    if (type === 'application/zip') return '#f97316';
    return '#9ca3af';
}

export function ToolNode({ data }: { data: any }) {
    const tool = TIPToolRegistry.get(data.toolId);
    if (!tool) return null;

    const status = data.status || 'idle';

    let borderClass = 'border-gray-700/30';
    if (status === 'running') borderClass = 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse';
    if (status === 'complete') borderClass = 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
    if (status === 'error') borderClass = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]';

    return (
        <div className={`bg-[#1a1a1a] border-2 ${borderClass} rounded-xl p-4 w-64 text-white shadow-xl transition-colors duration-300`}>
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: getTypeColor(tool.consumes[0] || ''), width: 12, height: 12, border: '2px solid #2a2a2a' }}
            />

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm tracking-wide">{tool.name}</span>
                    {status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {status === 'complete' && <span className="text-xs font-mono text-green-400">✓ {((data.durationMs || 0) / 1000).toFixed(1)}s</span>}
                </div>

                <div className="text-[11px] bg-[#222] p-2 rounded-lg border border-gray-800 flex items-center justify-between">
                    <span style={{ color: getTypeColor(tool.consumes[0]) }} className="truncate max-w-[40%]">{tool.consumes[0]?.split('/')[1]?.toUpperCase() || 'ANY'}</span>
                    <span className="text-gray-600">→</span>
                    <span style={{ color: getTypeColor(tool.produces[0]) }} className="truncate max-w-[40%] text-right">{tool.produces[0]?.split('/')[1]?.toUpperCase() || 'ANY'}</span>
                </div>

                {status === 'error' && (
                    <div className="text-[11px] text-red-400 mt-1 break-words bg-red-950/30 p-2 rounded border border-red-900/50">
                        {data.error}
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{ background: getTypeColor(tool.produces[0] || ''), width: 12, height: 12, border: '2px solid #2a2a2a' }}
            />
        </div>
    );
}
