import { Handle, Position } from '@xyflow/react';
import { Upload, File } from 'lucide-react';
import { getTypeColor } from './ToolNode';

export function FileInputNode({ data }: { data: any }) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && data.onFileSelect) {
            data.onFileSelect(file);
        }
    };

    const contentType = data.file?.type || 'application/octet-stream';
    const status = data.status || 'idle';
    let borderClass = 'border-gray-700/30';

    if (status === 'running') borderClass = 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse';
    if (status === 'complete') borderClass = 'border-green-500';

    return (
        <div className={`bg-[#1a1a1a] border-2 ${borderClass} rounded-xl p-4 w-64 text-white shadow-xl transition-colors duration-300`}>
            <div className="flex flex-col gap-3">
                <div className="font-semibold text-sm flex items-center gap-2 text-green-400">
                    <File className="w-4 h-4" /> File Input
                </div>

                {!data.file ? (
                    <label className="border border-dashed border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-400">Click to upload</span>
                        <input type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="bg-[#222] border border-gray-800 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                        <div className="truncate font-medium">{data.file.name}</div>
                        <div className="flex items-center justify-between text-gray-400 border-t border-gray-800 pt-1.5 mt-0.5">
                            <span>{(data.file.size / 1024).toFixed(1)} KB</span>
                            <span style={{ color: getTypeColor(contentType) }}>{contentType.split('/')[1]?.toUpperCase() || 'BIN'}</span>
                        </div>
                        <button onClick={() => data.onFileSelect?.(null)} className="mt-1 text-red-400 hover:text-red-300 w-full text-right text-[11px] font-semibold">
                            Remove
                        </button>
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                style={{ background: data.file ? getTypeColor(contentType) : '#9ca3af', width: 12, height: 12, border: '2px solid #2a2a2a' }}
            />
        </div>
    );
}
