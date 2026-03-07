'use client';
/**
 * SplitPdf — unified component for both the direct tool page and the pipeline INP.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Standalone mode  (direct tool):  <SplitPdf />                     │
 * │   → File upload → visual page selector → split → download results  │
 * │                                                                     │
 * │  Interaction mode (pipeline INP): <SplitPdf                        │
 * │       files={[pdf]} onConfirm={fn} onCancel={fn} />               │
 * │   → Pre-seeded with upstream file, visual selector,                │
 * │     "Confirm Split Points" saves pageRanges into node config       │
 * │   → No execution — pipeline engine handles that                    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Mode is detected by the presence of `onConfirm`.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { PdfPreview } from '@/components/ui/PdfPreview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
    Scissors, Download, RefreshCw,
    SplitSquareHorizontal, Eye, CheckCheck,
} from 'lucide-react';
import { useTIPTool } from '@/hooks/useTIPTool';
import type { TIPInteractionProps } from '@/tip/protocol';

/** Props for SplitPdf — all optional so it works as a bare <SplitPdf /> */
export type SplitPdfProps = Partial<TIPInteractionProps>;

export default function SplitPdf({
    files: seedFiles,
    config: seedConfig,
    onConfirm,
    onCancel,
}: SplitPdfProps = {}) {
    /** true when rendered inside the pipeline InteractionModal */
    const isInteractionMode = typeof onConfirm === 'function';

    // ── File state ───────────────────────────────────────────────────────────────
    const [file, setFile] = useState<File | null>(seedFiles?.[0] ?? null);
    const [numPages, setNumPages] = useState(0);
    const [pdfDocument, setPdfDocument] = useState<any>(null);

    // ── Split state ──────────────────────────────────────────────────────────────
    // Split indices = 0-based page indices AFTER which to insert a split
    const [splitIndices, setSplitIndices] = useState<number[]>([]);

    // ── Standalone state ─────────────────────────────────────────────────────────
    const { execute, isProcessing, progress, progressMessage } = useTIPTool('magic-pdf/split');
    const [splitResult, setSplitResult] = useState<{ name: string; url: string }[]>([]);

    // ── Load PDF whenever file changes ───────────────────────────────────────────
    useEffect(() => {
        if (!file) {
            setPdfDocument(null);
            setNumPages(0);
            setSplitIndices([]);
            setSplitResult([]);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                if (typeof window !== 'undefined' && 'Worker' in window) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc =
                        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }
                const buf = await file.arrayBuffer();
                const doc = await pdfjsLib.getDocument({ data: buf }).promise;
                if (!cancelled) {
                    setPdfDocument(doc);
                    setNumPages(doc.numPages);
                }
            } catch (e) {
                console.error('Error loading PDF', e);
            }
        })();

        return () => { cancelled = true; };
    }, [file]);

    // ── File select ──────────────────────────────────────────────────────────────
    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    // ── Split point toggle ───────────────────────────────────────────────────────
    const toggleSplit = (pageIndex: number) => {
        setSplitIndices(prev =>
            prev.includes(pageIndex)
                ? prev.filter(i => i !== pageIndex)
                : [...prev, pageIndex].sort((a, b) => a - b)
        );
        setSplitResult([]);
    };

    // ── Compute page ranges from split indices ───────────────────────────────────
    const computePageRanges = (): string => {
        const groups: number[][] = [];
        let start = 0;
        [...splitIndices, numPages - 1].forEach(end => {
            const group: number[] = [];
            for (let i = start; i <= end; i++) group.push(i);
            groups.push(group);
            start = end + 1;
        });
        return groups.map(g =>
            g.length === 1 ? `${g[0] + 1}` : `${g[0] + 1}-${g[g.length - 1] + 1}`
        ).join(',');
    };

    // ── Standalone: execute split ────────────────────────────────────────────────
    const handleSplit = async () => {
        if (!file || splitIndices.length === 0) return;
        try {
            const pageRanges = computePageRanges();
            const outputFiles = await execute([file], { pageRanges });
            if (outputFiles) {
                setSplitResult(outputFiles.map(f => ({
                    name: f.name,
                    url: URL.createObjectURL(f),
                })));
            }
        } catch (err) {
            console.error('Failed to split PDF', err);
        }
    };

    // ── Interaction: confirm split points back to the pipeline ───────────────────
    const handleConfirm = () => {
        if (!file || !onConfirm) return;
        onConfirm({
            files: [file],
            config: { pageRanges: computePageRanges() },
        });
    };

    // ── Shared page selector UI ──────────────────────────────────────────────────
    const pageSelector = (
        <div className="bg-gray-100/50 p-6 rounded-2xl border border-dashed border-gray-300">
            <p className="text-center text-sm text-gray-500 mb-6">
                {isInteractionMode
                    ? 'Click the scissors between pages to define split points, then confirm.'
                    : 'Click the scissors to split the document at that point.'}
            </p>

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
                            </Card>
                        </div>

                        {/* Split point button between pages */}
                        {i < numPages - 1 && (
                            <div className="flex flex-col items-center justify-center -mx-1 z-10 w-8">
                                <button
                                    onClick={() => toggleSplit(i)}
                                    className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-sm',
                                        splitIndices.includes(i)
                                            ? 'bg-red-500 border-red-600 text-white scale-110'
                                            : 'bg-white border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200 hover:scale-110'
                                    )}
                                    title="Split here"
                                >
                                    {splitIndices.includes(i)
                                        ? <Scissors className="w-4 h-4 transform rotate-90" />
                                        : <SplitSquareHorizontal className="w-4 h-4 opacity-50 hover:opacity-100" />
                                    }
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
    );

    // ── Empty state (upload prompt) ───────────────────────────────────────────────
    const uploadPrompt = (
        <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
        >
            <Card className="p-8">
                <div className="text-center mb-8">
                    <Scissors className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <h2 className="text-2xl font-semibold mb-2">
                        {isInteractionMode ? 'Select PDF to Split' : 'Split PDF Document'}
                    </h2>
                    <p className="text-gray-500">
                        {isInteractionMode
                            ? 'Upload the PDF you want to split in the pipeline, then mark the split points.'
                            : 'Extract pages or split your document into multiple files.'}
                    </p>
                </div>
                <FileUploader
                    onFilesSelected={handleFileSelected}
                    accept=".pdf,application/pdf"
                    multiple={false}
                    className="max-w-2xl mx-auto"
                />
            </Card>
        </motion.div>
    );

    // ── Workspace (file loaded) ───────────────────────────────────────────────────
    const workspace = (
        <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={isInteractionMode ? 'flex flex-col gap-5 h-full' : 'space-y-6'}
        >
            {/* Sticky toolbar */}
            <div className={cn(
                'flex items-center justify-between p-4 rounded-xl border border-gray-100 shadow-sm',
                isInteractionMode ? 'flex-shrink-0' : 'bg-white sticky top-0 z-30'
            )}>
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                        <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900 truncate max-w-[200px]" title={file?.name}>
                            {file?.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {numPages} Pages · {((file?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                            {splitIndices.length > 0 && ` · ${splitIndices.length + 1} segments`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!isInteractionMode && (
                        <Button variant="ghost" onClick={() => setFile(null)}>Change File</Button>
                    )}

                    {/* ── Mode-specific action ── */}
                    {isInteractionMode ? (
                        <>
                            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={splitIndices.length === 0}
                                className="gap-2"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Confirm Split Points ({splitIndices.length + 1} parts)
                            </Button>
                        </>
                    ) : splitResult.length > 0 ? (
                        <Button onClick={() => setSplitResult([])} variant="outline">
                            <RefreshCw className="w-4 h-4 mr-2" /> Reset
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSplit}
                            disabled={splitIndices.length === 0 || isProcessing}
                            isLoading={isProcessing}
                        >
                            <Scissors className="w-4 h-4 mr-2" />
                            {isProcessing
                                ? progressMessage || 'Splitting…'
                                : `Split PDF (${splitIndices.length + 1} files)`}
                        </Button>
                    )}
                </div>
            </div>

            {/* Download results (standalone only) */}
            {!isInteractionMode && splitResult.length > 0 && (
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
                                        <Download className="w-4 h-4 mr-2" /> Download
                                    </Button>
                                </a>
                            </div>
                        </Card>
                    ))}
                </motion.div>
            )}

            {/* Page selector (shown when no results yet) */}
            {(isInteractionMode || !splitResult.length) && (
                <div className={isInteractionMode ? 'flex-1 overflow-y-auto min-h-0' : ''}>
                    {numPages > 0 ? pageSelector : (
                        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                            Loading pages…
                        </div>
                    )}
                </div>
            )}

            {/* Interaction mode: hint at bottom */}
            {isInteractionMode && splitIndices.length === 0 && numPages > 0 && (
                <p className="text-xs text-amber-600 text-center flex-shrink-0">
                    Select at least one split point to confirm.
                </p>
            )}
        </motion.div>
    );

    // ── Root ─────────────────────────────────────────────────────────────────────
    return (
        <div className={isInteractionMode ? 'w-full h-full flex flex-col' : 'w-full max-w-6xl mx-auto space-y-8 pb-20'}>
            <AnimatePresence mode="wait">
                {!file ? uploadPrompt : workspace}
            </AnimatePresence>
        </div>
    );
}
