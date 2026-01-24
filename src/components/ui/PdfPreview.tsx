import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PdfPreviewProps {
    file?: File;
    pdfDocument?: any; // pdfjs-dist document proxy
    className?: string;
    pageNumber?: number;
    scale?: number;
    onLoadSuccess?: (numPages: number) => void;
    onLoadError?: (error: Error) => void;
}

export const PdfPreview = ({
    file,
    pdfDocument,
    className,
    pageNumber = 1,
    scale = 1,
    onLoadSuccess,
    onLoadError,
}: PdfPreviewProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const renderPage = async () => {
            setLoading(true);
            try {
                let pdf = pdfDocument;

                if (!pdf && file) {
                    // Dynamically import pdfjs-dist for client-side loading
                    const pdfjsLib = await import('pdfjs-dist');

                    if (typeof window !== 'undefined' && 'Worker' in window) {
                        // Use unpkg for worker to ensure version match
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                    }

                    const arrayBuffer = await file.arrayBuffer();
                    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                }

                if (!pdf) return;

                if (!active) return;

                if (onLoadSuccess) onLoadSuccess(pdf.numPages);

                const page = await pdf.getPage(pageNumber);

                if (!active) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;

                if (canvas) {
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({
                            canvasContext: context,
                            viewport: viewport,
                        } as any).promise;
                    }
                }
            } catch (error) {
                console.error('Error rendering PDF:', error);
                if (onLoadError) onLoadError(error as Error);
            } finally {
                if (active) setLoading(false);
            }
        };

        renderPage();

        return () => {
            active = false;
        };
    }, [file, pdfDocument, pageNumber, scale, onLoadSuccess, onLoadError]);

    return (
        <div className={cn("relative flex items-center justify-center overflow-hidden bg-white/50", className)}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 backdrop-blur-sm z-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            )}
            <canvas ref={canvasRef} className="shadow-sm max-w-full h-auto" />
        </div>
    );
};
