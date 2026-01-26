import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface FileDropZoneProps {
    onFileSelected: (file: File | null) => void;
    accept?: string;
    className?: string;
    disabled?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
    onFileSelected,
    accept = '*',
    className,
    disabled = false,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragOver(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            if (disabled) return;

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                onFileSelected(files[0]);
            }
        },
        [disabled, onFileSelected]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                onFileSelected(e.target.files[0]);
            }
        },
        [onFileSelected]
    );

    const handleClick = () => {
        if (!disabled) {
            inputRef.current?.click();
        }
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden transition-all duration-300 cursor-pointer',
                'border-2 border-dashed backdrop-blur-sm rounded-2xl',
                'bg-linear-to-br from-white/95 to-gray-50/95',
                isDragOver
                    ? 'border-primary/60 bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10'
                    : 'border-gray-300/80 hover:border-primary/40 hover:bg-white/80 hover:shadow-xl',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <div className="relative flex flex-col items-center justify-center py-12 px-4 text-center">
                {isDragOver && (
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
                )}

                <div
                    className={cn(
                        'relative mb-4 rounded-2xl p-4 transition-all duration-300',
                        'bg-linear-to-br from-white to-gray-50 shadow-lg',
                        isDragOver
                            ? 'scale-110 shadow-xl shadow-primary/20 ring-2 ring-primary/20'
                            : 'shadow-md'
                    )}
                >
                    <div
                        className={cn(
                            'rounded-xl p-3 transition-colors duration-300',
                            isDragOver
                                ? 'bg-linear-to-br from-primary/20 to-primary/10'
                                : 'bg-linear-to-br from-gray-100 to-gray-50'
                        )}
                    >
                        <Upload
                            className={cn(
                                'h-6 w-6 transition-all duration-300',
                                isDragOver ? 'text-primary scale-110' : 'text-gray-600'
                            )}
                        />
                    </div>
                </div>

                <div className="relative space-y-2">
                    <h4 className="text-lg font-semibold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {isDragOver ? 'Drop your file here' : 'Drag & drop a file'}
                    </h4>
                    <p className="text-sm text-gray-600">or click to browse</p>
                    {accept !== '*' && (
                        <p className="text-xs text-gray-500">Accepts: {accept}</p>
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={handleFileInput}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};
