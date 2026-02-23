'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { PdfPreview } from '@/components/ui/PdfPreview';
import { Button } from '@/components/ui/Button';
import { Trash2, FilePlus, Merge, Download, Eye, ArrowDown, ArrowUp } from 'lucide-react';
import { mergePdfs } from '@/lib/pdf-actions';
import { Card } from '@/components/ui/Card';
import { createTimer } from '@/lib/performance';

export default function MergePdf() {
    const [files, setFiles] = useState<File[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        setMergedPdfUrl(null);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
        setMergedPdfUrl(null);
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === files.length - 1) return;

        setFiles((prev) => {
            const newFiles = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
            return newFiles;
        });
        setMergedPdfUrl(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) return;

        const timer = createTimer();
        timer.start();

        setIsMerging(true);
        try {
            const mergedBytes = await mergePdfs(files);

            timer.stop('magic-pdf');

            const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setMergedPdfUrl(url);
        } catch (error) {
            console.error('Failed to merge PDFs:', error);
            alert('Failed to merge PDFs. Please try again.');
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <AnimatePresence mode="wait">
                {files.length === 0 ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="p-8">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-semibold mb-2">Upload PDFs to Start</h2>
                                <p className="text-gray-500">Combine multiple PDF files into one document.</p>
                            </div>
                            <FileUploader
                                onFilesSelected={handleFilesSelected}
                                accept=".pdf"
                                multiple={true}
                                className="max-w-2xl mx-auto"
                            />
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="workspace"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Selected Files ({files.length})</h2>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => document.getElementById('add-more-input')?.click()}
                                >
                                    <FilePlus className="w-4 h-4 mr-2" />
                                    Add More
                                </Button>
                                <input
                                    id="add-more-input"
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept=".pdf"
                                    onChange={(e) => {
                                        if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                                    }}
                                />
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => { setFiles([]); setMergedPdfUrl(null); }}
                                >
                                    Clear All
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {files.map((file, index) => (
                                    <motion.div
                                        key={`${file.name}-${index}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className="relative group overflow-hidden border border-gray-100/50 hover:shadow-md transition-all h-[240px] flex flex-col">
                                            <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
                                                <button onClick={() => moveFile(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-30">
                                                    <ArrowUp className="w-4 h-4 text-gray-700" />
                                                </button>
                                                <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-30">
                                                    <ArrowDown className="w-4 h-4 text-gray-700" />
                                                </button>
                                                <button onClick={() => window.open(URL.createObjectURL(file), '_blank')} className="p-1.5 hover:bg-gray-100 rounded-full" title="Preview PDF">
                                                    <Eye className="w-4 h-4 text-gray-700" />
                                                </button>
                                                <button onClick={() => removeFile(index)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-full">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex-1 bg-gray-50/50 flex items-center justify-center p-4 overflow-hidden">
                                                <PdfPreview file={file} scale={0.6} className="shadow-sm max-h-full object-contain" />
                                            </div>

                                            <div className="p-3 bg-white/90 backdrop-blur-sm border-t border-gray-100">
                                                <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
                            <AnimatePresence>
                                {files.length > 0 && !mergedPdfUrl && (
                                    <motion.div
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 100, opacity: 0 }}
                                    >
                                        <Button
                                            size="lg"
                                            onClick={handleMerge}
                                            disabled={files.length < 2 || isMerging}
                                            className="shadow-lg shadow-primary/25 rounded-2xl"
                                            isLoading={isMerging}
                                        >
                                            <Merge className="w-5 h-5 mr-2" />
                                            {files.length < 2 ? 'Add at least 2 files' : 'Merge PDFs'}
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {mergedPdfUrl && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                                >
                                    <Card className="w-full max-w-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">PDFs Merged Successfully!</h3>
                                                <p className="text-sm text-gray-500">Your document is ready to download.</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setMergedPdfUrl(null)}>
                                                <X className="w-5 h-5" />
                                            </Button>
                                        </div>

                                        <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center min-h-[300px]">
                                            <iframe src={`${mergedPdfUrl}#toolbar=0`} className="w-full h-full shadow-lg rounded-lg border border-gray-200" title="Merged PDF Preview" />
                                        </div>

                                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4 justify-end">
                                            <Button variant="outline" onClick={() => window.open(mergedPdfUrl, '_blank')}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                Preview
                                            </Button>
                                            <a href={mergedPdfUrl} download="merged-document.pdf">
                                                <Button>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download PDF
                                                </Button>
                                            </a>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function X(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
