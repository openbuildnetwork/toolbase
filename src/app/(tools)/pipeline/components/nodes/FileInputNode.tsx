import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Upload, FileCheck, X, FileText, Eye } from 'lucide-react';
import { getTypeColor } from './ToolNode';
import { PdfPreview } from '@/components/ui/PdfPreview';

interface FileInputNodeData {
    file: File | null;
    status?: 'idle' | 'running' | 'complete';
    onFileSelect?: (file: File | null) => void;
    onPreview?: (file: File) => void;
}

/**
 * FileInputNode — The pipeline starting node where a user drops/selects their file.
 *
 * Uses useReactFlow().updateNodeData() directly — no callback prop needed,
 * so there is no race condition with the parent's effect-based wiring.
 */
export const FileInputNode = React.memo(function FileInputNode({ id, data }: { id: string; data: FileInputNodeData }) {
    const { updateNodeData } = useReactFlow();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (data.file && data.file.type.startsWith('image/')) {
            const url = URL.createObjectURL(data.file);
            Promise.resolve().then(() => setPreviewUrl(url));
            return () => URL.revokeObjectURL(url);
        }
        Promise.resolve().then(() => setPreviewUrl(null));
    }, [data.file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        updateNodeData(id, { file });
        // Also call the parent callback if provided (e.g. for pipeline engine)
        data.onFileSelect?.(file);
    };

    const handleRemove = () => {
        updateNodeData(id, { file: null });
        data.onFileSelect?.(null);
    };

    const status = data.status || 'idle';

    const borderColor = status === 'running'
        ? 'rgba(74,222,128,0.7)'
        : status === 'complete'
            ? 'rgba(74,222,128,0.5)'
            : data.file
                ? 'rgba(74,222,128,0.35)'
                : 'rgba(255,255,255,0.07)';

    const glowColor = (status === 'running' || status === 'complete' || data.file)
        ? 'rgba(74,222,128,0.15), 0 8px 32px rgba(0,0,0,0.4)'
        : 'rgba(0,0,0,0.4)';

    return (
        <div style={{
            width: 220,
            background: 'linear-gradient(145deg, #0a110f 0%, #060a09 100%)',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 16,
            padding: '12px',
            boxShadow: `0 0 15px ${glowColor}`,
            transition: 'all 0.3s ease',
        }}>
            {/* Header info */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: data.file ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.02)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${data.file ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.3s',
                }}>
                    <Upload style={{ width: 16, height: 16, color: data.file ? '#4ade80' : '#888' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Input File</span>
                    <span style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Pipeline Entry
                    </span>
                </div>
            </div>

            {/* Input state */}
            {!data.file ? (
                <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '24px 10px',
                    border: '1.5px dashed rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.01)',
                    transition: 'all 0.2s',
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)';
                        e.currentTarget.style.background = 'rgba(74,222,128,0.02)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                    }}
                    className="nodrag nopan"
                >
                    <Upload style={{ width: 16, height: 16, color: '#666' }} />
                    <span style={{ fontSize: 10.5, color: '#888', fontWeight: 600 }}>
                        Click or drag to upload
                    </span>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </label>
            ) : (
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    {/* Preview (for images) */}
                    {previewUrl && (
                        <div style={{
                            width: '100%',
                            height: 100,
                            position: 'relative',
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    )}

                    {/* PDF Preview (for pdf files) */}
                    {data.file.type === 'application/pdf' && (
                        <div style={{
                            width: '100%',
                            height: 100,
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: '#141416'
                        }}>
                            <PdfPreview file={data.file} scale={0.25} />
                        </div>
                    )}

                    {/* File metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {data.file.type === 'application/pdf' ? (
                            <FileText style={{ width: 14, height: 14, color: '#f87171' }} />
                        ) : data.file.type.startsWith('image/') ? (
                            <Upload style={{ width: 14, height: 14, color: '#c084fc' }} />
                        ) : (
                            <FileCheck style={{ width: 14, height: 14, color: '#60a5fa' }} />
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <span style={{
                                fontSize: 10.5,
                                color: '#fff',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {data.file.name}
                            </span>
                            <span style={{ fontSize: 8.5, color: '#555' }}>
                                {(data.file.size / 1024).toFixed(1)} KB
                            </span>
                        </div>

                        {/* Preview payload button */}
                        <button
                            onClick={() => data.onPreview?.(data.file!)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="nodrag nopan"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 5,
                                padding: '2px 5px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            }}
                        >
                            <Eye style={{ width: 11, height: 11, color: '#999' }} />
                        </button>

                        <button
                            onClick={handleRemove}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="nodrag nopan"
                            style={{
                                background: 'rgba(239,68,68,0.05)',
                                border: '1px solid rgba(239,68,68,0.15)',
                                borderRadius: 5,
                                padding: '2px 5px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                            }}
                        >
                            <X style={{ width: 11, height: 11, color: '#f87171' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Right}
                style={{
                    background: data.file ? '#4ade80' : '#444',
                    width: 11, height: 11,
                    border: '2px solid #0a1210',
                    boxShadow: '0 0 6px rgba(74,222,128,0.5)',
                }}
            />
        </div>
    );
});
