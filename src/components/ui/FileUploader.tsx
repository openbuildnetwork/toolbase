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
}

export const FileUploader = ({
    onFilesSelected,
    accept = '*',
    multiple = true,
    maxSize,
    className,
    showFileList = true,
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
        <div className={cn('space-y-6', className)}>
            <Card
                className={cn(
                    'relative overflow-hidden transition-all duration-300',
                    'border-2 border-dashed backdrop-blur-sm',
                    'bg-linear-to-br from-white/95 to-gray-50/95',
                    isDragOver
                        ? 'border-primary/60 bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10'
                        : 'border-gray-300/80 hover:border-primary/40 hover:bg-white/80 hover:shadow-xl',
                    'rounded-2xl'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="relative flex flex-col items-center justify-center py-16 px-4 text-center">
                    {/* Animated background effect */}
                    {isDragOver && (
                        <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
                    )}
                    
                    {/* Icon with gradient background */}
                    <div className={cn(
                        "relative mb-6 rounded-2xl p-5 transition-all duration-300",
                        "bg-linear-to-br from-white to-gray-50 shadow-lg",
                        isDragOver 
                            ? "scale-110 shadow-xl shadow-primary/20 ring-2 ring-primary/20" 
                            : "shadow-md"
                    )}>
                        <div className={cn(
                            "rounded-xl p-3 transition-colors duration-300",
                            isDragOver  
                                ? "bg-linear-to-br from-primary/20 to-primary/10" 
                                : "bg-linear-to-br from-gray-100 to-gray-50"
                        )}>
                            <Upload className={cn(
                                "h-8 w-8 transition-all duration-300",
                                isDragOver 
                                    ? "text-primary scale-110" 
                                    : "text-gray-600"
                            )} />
                        </div>
                    </div>

                    {/* Main text */}
                    <div className="relative space-y-3 mb-8">
                        <h3 className="text-2xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            {isDragOver ? 'Release to upload' : 'Drag & drop files here'}
                        </h3>
                        <p className="text-gray-600 text-base max-w-sm">
                            Upload {multiple ? 'files' : 'a file'} to get started. 
                            {accept !== '*' && ` Supports ${accept}`}
                        </p>
                        <div className="pt-2">
                            <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100/80 px-4 py-2 rounded-full">
                                <AlertCircle className="h-4 w-4" />
                                Max size: {maxSize ? formatFileSize(maxSize) : 'Unlimited'}
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <Button 
                            onClick={() => inputRef.current?.click()} 
                            className="relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Browse Files
                            </span>
                            <div className="absolute inset-0 bg-linear-to-r from-primary to-primary/80 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Button>
                        
                        {uploadedFiles.length > 0 && (
                            <Button 
                                onClick={clearAllFiles}
                                variant="ghost"
                                className="hover:bg-red-50 hover:text-red-600"
                            >
                                Clear All
                            </Button>
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        multiple={multiple}
                        accept={accept}
                        onChange={handleFileInput}
                    />
                </div>
            </Card>

            {/* File list with progress indicators */}
            {showFileList && uploadedFiles.length > 0 && (
                <Card className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Uploaded Files</h4>
                                    <p className="text-sm text-gray-600">
                                        {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'} selected
                                    </p>
                                </div>
                            </div>
                            <Button 
                                onClick={clearAllFiles}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-red-600"
                            >
                                Clear all
                            </Button>
                        </div>

                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                            {uploadedFiles.map((file) => {
                                const progress = uploadProgress[file.name] || 0;
                                const isComplete = progress === 100;
                                
                                return (
                                    <div
                                        key={file.name}
                                        className="group flex items-center gap-4 p-4 rounded-xl border border-gray-200/60 hover:border-gray-300 hover:bg-gray-50/50 transition-all duration-200"
                                    >
                                        <div className="shrink-0">
                                            <div className={cn(
                                                "p-3 rounded-xl transition-colors",
                                                isComplete 
                                                    ? "bg-green-50 text-green-600" 
                                                    : "bg-gray-100 text-gray-600"
                                            )}>
                                                {getFileIcon(file)}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-medium text-gray-900 truncate">
                                                    {file.name}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500">
                                                        {formatFileSize(file.size)}
                                                    </span>
                                                    <button
                                                        onClick={() => removeFile(file.name)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Progress bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className={cn(
                                                        "font-medium",
                                                        isComplete ? "text-green-600" : "text-primary"
                                                    )}>
                                                        {isComplete ? 'Uploaded' : `${progress.toFixed(0)}%`}
                                                    </span>
                                                    {isComplete && (
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                    )}
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-300 rounded-full",
                                                            isComplete 
                                                                ? "bg-linear-to-r from-green-500 to-green-400" 
                                                                : "bg-linear-to-r from-primary to-primary/80"
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