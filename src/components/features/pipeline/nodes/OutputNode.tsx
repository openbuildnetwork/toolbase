import { Handle, Position } from '@xyflow/react';
import { Download, PackageCheck } from 'lucide-react';

export function OutputNode({ data }: { data: any }) {
    const bundle = data.bundle;
    const status = data.status || 'idle';

    let borderClass = 'border-gray-700/30';
    if (status === 'complete') borderClass = 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]';

    return (
        <div className={`bg-[#1a1a1a] border-2 ${borderClass} rounded-xl p-4 w-64 text-white shadow-xl transition-colors duration-300`}>
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#9ca3af', width: 12, height: 12, border: '2px solid #2a2a2a' }}
            />

            <div className="flex flex-col gap-3">
                <div className="font-semibold text-sm flex items-center gap-2 text-emerald-400">
                    <PackageCheck className="w-4 h-4" /> Pipeline Output
                </div>

                {bundle ? (
                    <div className="bg-[#222] border border-emerald-900/30 rounded-lg p-3 text-xs flex flex-col gap-2">
                        <div className="text-emerald-400 font-medium text-center mb-1 bg-emerald-900/20 py-1 rounded">Execution Complete</div>
                        <div className="flex justify-between items-center px-1">
                            <span className="text-gray-400">Output Files:</span>
                            <span className="font-mono">{bundle.meta.count}</span>
                        </div>
                        <div className="flex justify-between items-center px-1 border-gray-800">
                            <span className="text-gray-400">Total Size:</span>
                            <span className="font-mono">{(bundle.meta.totalSizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                        {data.totalDurationMs !== undefined && (
                            <div className="flex justify-between items-center px-1 border-t border-gray-800 pt-1 border-gray-800 mt-1">
                                <span className="text-gray-400">Total Time:</span>
                                <span className="font-mono text-emerald-400">{(data.totalDurationMs / 1000).toFixed(1)}s</span>
                            </div>
                        )}

                        <button
                            onClick={data.onDownload}
                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 rounded-md py-2 text-xs flex items-center justify-center font-semibold tracking-wide transition-colors"
                        >
                            <Download className="w-3.5 h-3.5 mr-2" />
                            Download
                        </button>
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 text-center py-6 bg-[#222] rounded-lg border border-dashed border-gray-700/50">
                        Awaiting execution stream...
                    </div>
                )}
            </div>
        </div>
    );
}
