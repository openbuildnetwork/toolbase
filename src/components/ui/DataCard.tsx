import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { FileText, Download, Info } from 'lucide-react';
import { Button } from './Button';

interface DataCardProps {
    title: string;
    description?: string;
    fileSize?: string;
    preview?: string;
    onDownload?: () => void;
    className?: string;
    children?: React.ReactNode;
}

export const DataCard: React.FC<DataCardProps> = ({
    title,
    description,
    fileSize,
    preview,
    onDownload,
    className,
    children,
}) => {
    return (
        <Card className={cn('border border-gray-200/80 bg-white/90 backdrop-blur-sm', className)}>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-base">{title}</CardTitle>
                            {description && (
                                <p className="text-sm text-gray-600 mt-1">{description}</p>
                            )}
                            {fileSize && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Info className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-500">Size: {fileSize}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {onDownload && (
                        <Button
                            onClick={onDownload}
                            variant="primary"
                            size="sm"
                            className="shrink-0"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    )}
                </div>
            </CardHeader>

            {preview && (
                <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Preview:</p>
                        <pre className="text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                            {preview}
                        </pre>
                    </div>
                </CardContent>
            )}

            {children && <CardContent>{children}</CardContent>}
        </Card>
    );
};
