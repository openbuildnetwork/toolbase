'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { Button } from '@/components/ui/Button';
import {
    Image as ImageIcon,
    Download,
    CheckCircle,
    ArrowRightLeft,
    Layers,
    Type,
    Settings2,
    FilePlus,
    Move
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useMagicPdfWorker } from '@/hooks/useMagicPdfWorker';
import { cn } from '@/lib/utils';
import { PdfPreview } from '@/components/ui/PdfPreview';

export default function ImageToPdf() {
    const [files, setFiles] = useState<File[]>([]);
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
    const [paperSize, setPaperSize] = useState<'auto' | 'a4' | 'letter'>('auto');
    const { processPdf, isProcessing } = useMagicPdfWorker();

    const handleFilesSelected = (newFiles: File[]) => {
        // Filter only images
        const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            setFiles(prev => [...prev, ...imageFiles]);
            setResultPdfUrl(null);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === files.length - 1)
        ) return;

        setFiles(prev => {
            const newFiles = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
            return newFiles;
        });
    };

    const handleConvert = async () => {
        if (files.length === 0) return;

        try {
            // Convert images to ArrayBuffers
            const imageBuffers = await Promise.all(
                files.map(f => f.arrayBuffer().then(buf => new Uint8Array(buf)))
            );

            // We need to send 'dummy' file as first arg to satisfy signature, 
            // but the worker looks at options.images
            const resultBytes = await processPdf('images_to_pdf', files[0], {
                images: imageBuffers,
                paper_size: paperSize
            });

            const blob = new Blob([resultBytes as Uint8Array], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultPdfUrl(url);

        } catch (error) {
            console.error('Conversion failed:', error);
            alert('Failed to convert Images to PDF');
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">
            <AnimatePresence mode="wait">
                {!resultPdfUrl ? (
                    <motion.div
                        key="setup"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                    >
                        <Card className="p-8">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                                    <FilePlus className="w-8 h-8 text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-semibold mb-2">Image to PDF</h2>
                                <p className="text-gray-500">Combine multiple images into a single professional PDF document.</p>
                            </div>

                            <div className="space-y-8">
                                <FileUploader
                                    onFilesSelected={handleFilesSelected}
                                    accept="image/*"
                                    multiple={true}
                                />

                                {files.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-medium text-gray-900">Selected Images ({files.length})</h3>
                                            <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-red-500 hover:text-red-600 hover:bg-red-50">Clear All</Button>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {files.map((file, idx) => (
                                                <div key={idx} className="group relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                    <div className="aspect-[3/4] bg-gray-100 relative">
                                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            {idx > 0 && (
                                                                <button onClick={() => moveFile(idx, 'up')} className="p-1.5 bg-white rounded-lg hover:bg-gray-100">↑</button>
                                                            )}
                                                            {idx < files.length - 1 && (
                                                                <button onClick={() => moveFile(idx, 'down')} className="p-1.5 bg-white rounded-lg hover:bg-gray-100">↓</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="p-2 flex items-center justify-between text-xs">
                                                        <span className="truncate max-w-[100px] font-medium">{file.name}</span>
                                                        <button onClick={() => removeFile(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">✕</button>
                                                    </div>
                                                    <div className="absolute top-2 left-2 w-6 h-6 bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                        {idx + 1}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex-1 space-y-2 w-full">
                                                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                    <Settings2 className="w-4 h-4" />
                                                    Page Layout
                                                </label>
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: 'auto', label: 'Fit to Image' },
                                                        { id: 'a4', label: 'A4 Page' },
                                                        { id: 'letter', label: 'US Letter' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setPaperSize(opt.id as any)}
                                                            className={cn(
                                                                "flex-1 py-2 px-4 rounded-lg border text-sm transition-all",
                                                                paperSize === opt.id
                                                                    ? "bg-purple-600 text-white border-purple-600 font-bold"
                                                                    : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full md:w-auto h-12 px-8 text-lg shadow-lg hover:shadow-xl transition-all bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                                                onClick={handleConvert}
                                                isLoading={isProcessing}
                                            >
                                                <ArrowRightLeft className="w-5 h-5 mr-2" />
                                                Create PDF
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <Card className="p-12 flex flex-col items-center gap-6">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <CheckCircle className="w-12 h-12" />
                            </div>

                            <div className="space-y-2 text-center">
                                <h3 className="text-2xl font-bold text-gray-900">PDF Created Successfully!</h3>
                                <p className="text-gray-500 text-lg">Your {files.length} images have been combined into a PDF.</p>
                            </div>

                            <div className="w-full max-w-lg h-[400px] border rounded-xl overflow-hidden shadow-inner bg-gray-50">
                                {/* Use typed bytes if available, but here we just have a URL. Preview takes File object usually.
                                    We can fetch the blob and pass as 'data' prop to PdfPreview if implemented, or just use iframe/native viewer.
                                    Actually PdfPreview supports 'file' prop. Let's convert URL to File-like object or update PdfPreview.
                                    Earlier we added 'data' prop to PdfPreview but didn't export it fully? 
                                    Let's essentially assume standard behavior. */}
                                <iframe src={resultPdfUrl} className="w-full h-full" />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                                <a
                                    href={resultPdfUrl}
                                    download="images-combined.pdf"
                                    className="flex-1"
                                >
                                    <Button className="w-full h-12 shadow-lg hover:shadow-xl transition-all">
                                        <Download className="w-5 h-5 mr-3" />
                                        Download PDF
                                    </Button>
                                </a>
                                <Button
                                    variant="outline"
                                    className="h-12"
                                    onClick={() => {
                                        setFiles([]);
                                        setResultPdfUrl(null);
                                    }}
                                >
                                    Create Another
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
