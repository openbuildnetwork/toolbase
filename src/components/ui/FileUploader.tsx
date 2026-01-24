import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, File as FileIcon } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // in bytes
    className?: string;
}

export const FileUploader = ({
    onFilesSelected,
    accept = '*',
    multiple = true,
    maxSize,
    className,
}: FileUploaderProps) => {
    const [isDragOver, setIsDragOver] = useState(false);
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

        onFilesSelected(acceptedFiles);
        // Reset input
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <Card
            className={cn(
                'relative overflow-hidden border-2 border-dashed transition-all duration-300',
                isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50',
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className={cn(
                    "mb-4 rounded-full p-4 transition-colors",
                    isDragOver ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                )}>
                    <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {isDragOver ? 'Drop files here' : 'Click or drop files here'}
                </h3>
                <p className="text-sm text-gray-500 max-w-xs mb-6">
                    Upload {multiple ? 'files' : 'a file'} to start.
                    {accept !== '*' && ` Supports ${accept}`}
                </p>
                <Button onClick={() => inputRef.current?.click()} variant="secondary">
                    Select Files
                </Button>
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
    );
};
