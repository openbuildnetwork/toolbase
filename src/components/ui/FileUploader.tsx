import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, File, Image, Music, FileText, Film, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // in bytes
    className?: string;
    showFileList?: boolean;
    disabled?: boolean;
}

export const FileUploader = ({
    onFilesSelected,
    accept = '*',
    multiple = true,
    maxSize,
    className,
    showFileList = true,
    disabled = false,
}: FileUploaderProps) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            validateAndPassFiles(files);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) {
                const files = Array.from(e.target.files);
                validateAndPassFiles(files);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const validateAndPassFiles = (files: File[]) => {
        // Filter accept
        const acceptedFiles = files.filter((file) => {
            if (accept === '*') return true;
            const acceptTypes = accept.split(',').map(t => t.trim());
            return acceptTypes.some(type => {
                if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
                return file.type.match(new RegExp(type.replace('*', '.*')));
            });
        });

        // Simulate upload progress for demo
        acceptedFiles.forEach((file, index) => {
            const fileName = file.name;
            // Simulate progressive upload
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10 + Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                }
                setUploadProgress(prev => ({ ...prev, [fileName]: progress }));
            }, 100);
        });

        setUploadedFiles(prev => [...prev, ...acceptedFiles]);
        onFilesSelected(acceptedFiles);
        // Reset input
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (fileName: string) => {
        setUploadedFiles(prev => prev.filter(file => file.name !== fileName));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
    };

    const clearAllFiles = () => {
        setUploadedFiles([]);
        setUploadProgress({});
    };

    const getFileIcon = (file: File) => {
        const type = file.type.split('/')[0];
        switch (type) {
            case 'image':
                return <Image className="h-4 w-4" />;
            case 'audio':
                return <Music className="h-4 w-4" />;
            case 'video':
                return <Film className="h-4 w-4" />;
            case 'text':
            case 'application':
                if (file.type.includes('pdf') || file.type.includes('document')) {
                    return <FileText className="h-4 w-4" />;
                }
                return <File className="h-4 w-4" />;
            default:
                return <File className="h-4 w-4" />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={cn('space-y-5', className)}>
            <div
                className={cn(
                    'relative overflow-hidden transition-all duration-300 cursor-pointer',
                    'border-2 border-dashed rounded-2xl backdrop-blur-sm',
                    'bg-gradient-to-br from-white/90 via-gray-50/50 to-white/90',
                    isDragOver
                        ? 'border-purple-500 bg-purple-50/30 scale-[1.01] shadow-lg shadow-purple-500/10'
                        : 'border-gray-300/70 hover:border-purple-400/50 hover:bg-white/80 hover:shadow-xl',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && inputRef.current?.click()}
            >
                {/* Animated background effect on drag */}
                {isDragOver && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 animate-pulse pointer-events-none" />
                )}

                <div className="relative flex flex-col items-center justify-center py-12 px-6 text-center">
                    {/* Icon container */}
                    <div className={cn(
                        "relative mb-5 rounded-2xl p-4 transition-all duration-300",
                        "bg-gradient-to-br from-white to-gray-50 shadow-md",
                        isDragOver
                            ? "scale-110 shadow-xl shadow-purple-500/20 ring-2 ring-purple-200"
                            : "shadow-md"
                    )}>
                        <div className={cn(
                            "rounded-xl p-3 transition-colors duration-300",
                            isDragOver
                                ? "bg-gradient-to-br from-purple-100/50 to-purple-50/50"
                                : "bg-gradient-to-br from-gray-100 to-gray-50"
                        )}>
                            <Upload className={cn(
                                "h-8 w-8 transition-all duration-300",
                                isDragOver
                                    ? "text-purple-600 scale-110"
                                    : "text-gray-600"
                            )} />
                        </div>
                    </div>

                    {/* Main text */}
                    <div className="relative space-y-2 mb-6 max-w-sm">
                        <h3 className={cn(
                            "text-xl font-bold transition-all duration-300",
                            "bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent",
                            isDragOver && "from-purple-600 to-purple-700"
                        )}>
                            {isDragOver ? 'Drop files to upload' : 'Drag & drop files here'}
                        </h3>
                        <p className={cn(
                            "text-sm transition-all duration-300",
                            isDragOver ? "text-purple-600 font-medium" : "text-gray-500"
                        )}>
                            Upload {multiple ? 'files' : 'a file'} to get started.
                            {accept !== '*' && accept !== '*' && (
                                <span className="block mt-1 text-xs text-gray-400">
                                    Supports: {accept}
                                </span>
                            )}
                        </p>

                        {/* Max size badge */}
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <div className="h-px w-8 bg-gray-200" />
                            <div className={cn(
                                "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full",
                                isDragOver
                                    ? "bg-purple-100/70 text-purple-700"
                                    : "bg-gray-100/70 text-gray-500"
                            )}>
                                <AlertCircle className="h-3.5 w-3.5" />
                                Max: {maxSize ? formatFileSize(maxSize) : 'Unlimited'}
                            </div>
                            <div className="h-px w-8 bg-gray-200" />
                        </div>
                    </div>

                    {/* Browse button */}
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            inputRef.current?.click();
                        }}
                        className="relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Browse Files
                        </span>
                    </Button>

                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        multiple={multiple}
                        accept={accept}
                        onChange={handleFileInput}
                        disabled={disabled}
                    />
                </div>
            </div>

            {/* File list with progress indicators */}
            {showFileList && uploadedFiles.length > 0 && (
                <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100/60">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Uploaded Files</h4>
                                    <p className="text-xs text-gray-500">
                                        {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={clearAllFiles}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear all
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                            {uploadedFiles.map((file) => {
                                const progress = uploadProgress[file.name] || 0;
                                const isComplete = progress === 100;

                                return (
                                    <div
                                        key={file.name}
                                        className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-200"
                                    >
                                        <div className="shrink-0">
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                isComplete
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-gray-100 text-gray-600"
                                            )}>
                                                {getFileIcon(file)}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-medium text-gray-900 truncate text-sm">
                                                    {file.name}
                                                </p>
                                                <button
                                                    onClick={() => removeFile(file.name)}
                                                    className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className={cn(
                                                        "font-medium",
                                                        isComplete ? "text-green-600" : "text-purple-600"
                                                    )}>
                                                        {isComplete ? 'Ready' : `${progress.toFixed(0)}%`}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-300 rounded-full",
                                                            isComplete
                                                                ? "bg-green-500"
                                                                : "bg-gradient-to-r from-purple-500 to-purple-400"
                                                        )}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};