'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { PdfPreview } from '@/components/ui/PdfPreview';
import { Button } from '@/components/ui/Button';
import { Scissors, Download, RefreshCw, SplitSquareHorizontal, Eye, Check } from 'lucide-react';
import { splitPdf } from '@/lib/pdf-actions';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export default function SplitPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    const [splitIndices, setSplitIndices] = useState<number[]>([]); // Indices AFTER which to split (0-based page index)
    const [isSplitting, setIsSplitting] = useState(false);
    const [splitResult, setSplitResult] = useState<{ name: string, url: string }[]>([]);

    useEffect(() => {
        if (!file) {
            setPdfDocument(null);
            setNumPages(0);
            setSplitIndices([]);
            setSplitResult([]);
        }
    }, [file]);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);

            // Pre-load document for faster thumbnail rendering
            try {
                const pdfjsLib = await import('pdfjs-dist');
                if (typeof window !== 'undefined' && 'Worker' in window) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }
                const arrayBuffer = await selectedFile.arrayBuffer();
                const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                setPdfDocument(doc);
                setNumPages(doc.numPages);
            } catch (e) {
                console.error("Error loading PDF", e);
            }
        }
    };

    const toggleSplit = (pageIndex: number) => {
        setSplitIndices(prev => {
            if (prev.includes(pageIndex)) {
                return prev.filter(i => i !== pageIndex);
            } else {
                return [...prev, pageIndex].sort((a, b) => a - b);
            }
        });
        setSplitResult([]);
    };

    const handleSplit = async () => {
        if (!file || splitIndices.length === 0) return;
        setIsSplitting(true);

        try {
            // Calculate groups
            const groups: number[][] = [];
            let startIndex = 0;

            // splitIndices represents the page index AFTER which we split
            // e.g. if we have pages [0, 1, 2, 3] and split at 1 (after page index 1, i.e. after Page 2)
            // Group 1: 0 to 1
            // Group 2: 2 to end

            [...splitIndices, numPages - 1].forEach(endIndex => {
                const group = [];
                for (let i = startIndex; i <= endIndex; i++) {
                    group.push(i);
                }
                groups.push(group);
                startIndex = endIndex + 1;
            });

            // Handle case where last split is NOT the end (already handled by adding numPages-1 above? 
            // If splitIndices includes numPages-1, we filter/uniq it or just logic checks. 
            // My logic: [...splitIndices, numPages-1] ensures we capture the last segment.
            // If user unselects the last page, we just process.
            // Wait, splitIndices are "cuts". 
            // Visual: Page 0 | Page 1. Click separator between 0 and 1 -> splitIndex = 0.
            // So splitIndex 0 means "Split after Page 1".

            const pdfBytes = await splitPdf(file, groups);

            const results = pdfBytes.map((bytes, i) => {
                const blob = new Blob([bytes as any], { type: 'application/pdf' });
                return {
                    name: `${file.name.replace('.pdf', '')}_part_${i + 1}.pdf`,
                    url: URL.createObjectURL(blob)
                };
            });

            setSplitResult(results);

        } catch (error) {
            console.error(error);
            alert("Failed to split PDF");
        } finally {
            setIsSplitting(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
            <AnimatePresence mode="wait">
                {!file ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <Card className="p-8">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-semibold mb-2">Split PDF Document</h2>
                                <p className="text-gray-500">Extract pages or split your document into multiple files.</p>
                            </div>
                            <FileUploader
                                onFilesSelected={handleFileSelected}
                                accept=".pdf"
                                multiple={false}
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
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-30">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                                    <Scissors className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 truncate max-w-[200px]" title={file.name}>{file.name}</h3>
                                    <p className="text-xs text-gray-500">{numPages} Pages • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setFile(null)}>
                                    Change File
                                </Button>
                                {splitResult.length > 0 ? (
                                    <Button onClick={() => setSplitResult([])} variant="outline">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reset
                                    </Button>
                                ) : (
                                    <Button onClick={handleSplit} disabled={splitIndices.length === 0} isLoading={isSplitting}>
                                        <Scissors className="w-4 h-4 mr-2" />
                                        Split PDF ({splitIndices.length + 1} Files)
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Results View */}
                        {splitResult.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                                {splitResult.map((result, i) => (
                                    <Card key={i} className="p-4 flex items-center justify-between border-green-100 bg-green-50/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                                                <span className="font-bold text-gray-400 text-lg">{i + 1}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 truncate max-w-[200px]">{result.name}</span>
                                                <span className="text-xs text-green-600 font-medium">Ready to download</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => window.open(result.url, '_blank')}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <a href={result.url} download={result.name}>
                                                <Button size="sm" variant="outline" className="bg-white hover:bg-green-50 border-green-200 text-green-700">
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download
                                                </Button>
                                            </a>
                                        </div>
                                    </Card>
                                ))}
                            </motion.div>
                        )}

                        {/* Editor View */}
                        {!splitResult.length && (
                            <div className="bg-gray-100/50 p-6 rounded-2xl border border-dashed border-gray-300">
                                <p className="text-center text-sm text-gray-500 mb-6">Click the scissors to split the document at that point.</p>

                                <div className="flex flex-wrap gap-y-8 gap-x-2 justify-center">
                                    {Array.from({ length: numPages }).map((_, i) => (
                                        <React.Fragment key={i}>
                                            <div className="relative group">
                                                <Card className="w-[140px] h-[180px] p-2 flex flex-col items-center gap-2 hover:shadow-md transition-all relative overflow-visible">
                                                    <div className="w-full h-full bg-gray-50 rounded border border-gray-100 overflow-hidden relative">
                                                        <PdfPreview
                                                            pdfDocument={pdfDocument}
                                                            pageNumber={i + 1}
                                                            scale={0.4}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400">Page {i + 1}</span>

                                                    {/* Selection Overlay (Future: for Extract mode) */}
                                                </Card>
                                            </div>

                                            {/* Divider / Split Point */}
                                            {i < numPages - 1 && (
                                                <div className="flex flex-col items-center justify-center -mx-1 z-10 w-8">
                                                    <button
                                                        onClick={() => toggleSplit(i)}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm",
                                                            splitIndices.includes(i)
                                                                ? "bg-red-500 border-red-600 text-white scale-110"
                                                                : "bg-white border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200 hover:scale-110"
                                                        )}
                                                        title="Split here"
                                                    >
                                                        {splitIndices.includes(i) ? (
                                                            <Scissors className="w-4 h-4 transform rotate-90" />
                                                        ) : (
                                                            <SplitSquareHorizontal className="w-4 h-4 opacity-50 hover:opacity-100" />
                                                        )}
                                                    </button>
                                                    {splitIndices.includes(i) && (
                                                        <div className="h-full w-0.5 bg-red-500/20 absolute -z-10" />
                                                    )}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
