'use client';
/**
 * MergePdf — unified component for both the direct tool page and the pipeline INP.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Standalone mode  (direct tool):  <MergePdf />             │
 * │   → Merge button → download result                         │
 * │                                                             │
 * │  Interaction mode (pipeline INP): <MergePdf                │
 * │       files={[...]} onConfirm={fn} onCancel={fn} />        │
 * │   → Pre-seeded file grid, Confirm Order button              │
 * │   → No execution here — handled by the pipeline engine     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * The registry's getInteractionComponent points here, so there is
 * zero code duplication between the two use-cases.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { PdfPreview } from '@/components/ui/PdfPreview';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
    Trash2, FilePlus, Merge, Download, Eye,
    ArrowDown, ArrowUp, CheckCheck, X,
} from 'lucide-react';
import { useTIPTool } from '@/hooks/useTIPTool';
import { createTimer } from '@/lib/performance';
import type { TIPInteractionProps } from '@/tip/protocol';

/** Props for MergePdf — all fields optional so it works as a bare <MergePdf /> too */
export type MergePdfProps = Partial<TIPInteractionProps>;

export default function MergePdf({
    files: seedFiles,
    config,
    onConfirm,
    onCancel,
}: MergePdfProps = {}) {
    /** true when used as a pipeline INP component */
    const isInteractionMode = typeof onConfirm === 'function';

    const [files, setFiles] = useState<File[]>(() => {
        let initial = seedFiles ?? [];
        if (config && config.fileOrder) {
            try {
                const order: string[] = JSON.parse(config.fileOrder as string);
                const orderedFiles = [];
                const remaining = [...initial];
                for (const name of order) {
                    const idx = remaining.findIndex(f => f.name === name);
                    if (idx !== -1) {
                        orderedFiles.push(remaining[idx]);
                        remaining.splice(idx, 1);
                    }
                }
                initial = [...orderedFiles, ...remaining];
            } catch (e) {
                // ignore
            }
        }
        return initial;
    });
    const { execute, isProcessing, progress, progressMessage } = useTIPTool('magic-pdf/merge');
    const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);

    // ── File management ──────────────────────────────────────────────────────────

    const addFiles = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
        setMergedPdfUrl(null);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setMergedPdfUrl(null);
    };

    const moveFile = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === files.length - 1) return;
        setFiles(prev => {
            const next = [...prev];
            const target = direction === 'up' ? index - 1 : index + 1;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setMergedPdfUrl(null);
    };

    // ── Actions (mode-specific) ───────────────────────────────────────────────────

    /** Standalone: execute the merge via the TIP worker */
    const handleMerge = async () => {
        if (files.length < 2) return;
        const timer = createTimer();
        timer.start();
        try {
            const outputFiles = await execute(files, {});
            timer.stop('magic-pdf');
            if (outputFiles && outputFiles.length > 0) {
                setMergedPdfUrl(URL.createObjectURL(outputFiles[0]));
            }
        } catch (err) {
            console.error('Failed to merge PDFs:', err);
        }
    };

    /** Interaction: confirm the chosen file order back to the pipeline */
    const handleConfirm = () => {
        if (files.length < 2 || !onConfirm) return;
        onConfirm({
            files,
            config: { fileOrder: JSON.stringify(files.map(f => f.name)) }
        });
    };

    // ── Shared file card grid ─────────────────────────────────────────────────────

    const fileGrid = (
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
                            {/* Order badge */}
                            <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-white/90 border border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-center shadow-sm">
                                {index + 1}
                            </div>

                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
                                <button onClick={() => moveFile(index, 'up')} disabled={index === 0} className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-30" title="Move up">
                                    <ArrowUp className="w-4 h-4 text-gray-700" />
                                </button>
                                <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-30" title="Move down">
                                    <ArrowDown className="w-4 h-4 text-gray-700" />
                                </button>
                                <button onClick={() => window.open(URL.createObjectURL(file), '_blank')} className="p-1.5 hover:bg-gray-100 rounded-full" title="Preview">
                                    <Eye className="w-4 h-4 text-gray-700" />
                                </button>
                                <button onClick={() => removeFile(index)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-full" title="Remove">
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
    );

    // ── Workspace (files loaded) ──────────────────────────────────────────────────

    const workspace = (
        <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={isInteractionMode ? 'flex flex-col gap-6 h-full' : 'space-y-6'}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-xl font-semibold">
                    {files.length} PDF{files.length !== 1 ? 's' : ''} selected — reorder as needed
                </h2>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => document.getElementById('merge-add-more')?.click()}
                    >
                        <FilePlus className="w-4 h-4 mr-2" />
                        Add More
                    </Button>
                    <input
                        id="merge-add-more"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                            if (e.target.files) addFiles(Array.from(e.target.files));
                            e.target.value = '';
                        }}
                    />
                    <Button variant="danger" size="sm" onClick={() => { setFiles([]); setMergedPdfUrl(null); }}>
                        Clear All
                    </Button>
                </div>
            </div>

            {/* File grid */}
            <div className={isInteractionMode ? 'flex-1 overflow-y-auto min-h-0 pb-2' : ''}>
                {fileGrid}
            </div>

            {/* ── Mode-specific action bar ── */}
            {isInteractionMode ? (
                /* Interaction: confirm / cancel */
                <div className="flex items-center justify-end gap-3 shrink-0 pt-2 border-t border-gray-100">
                    {files.length < 2 && (
                        <span className="text-sm text-amber-500 mr-auto">Add at least one more PDF to confirm.</span>
                    )}
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={files.length < 2} className="gap-2">
                        <CheckCheck className="w-4 h-4" />
                        Confirm Order ({files.length} PDFs)
                    </Button>
                </div>
            ) : (
                /* Standalone: floating merge button */
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
                                    disabled={files.length < 2 || isProcessing}
                                    className="shadow-lg shadow-primary/25 rounded-2xl flex flex-col items-center justify-center p-6 h-auto"
                                    isLoading={isProcessing}
                                >
                                    <div className="flex items-center">
                                        <Merge className="w-5 h-5 mr-2" />
                                        {files.length < 2 ? 'Add at least 2 files' : isProcessing ? (progressMessage || 'Merging PDFs…') : 'Merge PDFs'}
                                    </div>
                                    {isProcessing && progress > 0 && (
                                        <div className="w-full mt-2 bg-white/20 rounded-full h-1 overflow-hidden">
                                            <div className="bg-white/80 h-1 transition-all duration-300" style={{ width: `${progress}%` }} />
                                        </div>
                                    )}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );

    // ── Empty state (upload prompt) ───────────────────────────────────────────────

    const uploadPrompt = (
        <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-8">
                <div className="text-center mb-8">
                    <Merge className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <h2 className="text-2xl font-semibold mb-2">Upload PDFs to Start</h2>
                    <p className="text-gray-500">
                        {isInteractionMode
                            ? 'Add PDFs and confirm their order for the pipeline.'
                            : 'Combine multiple PDF files into one document.'}
                    </p>
                </div>
                <FileUploader onFilesSelected={addFiles} accept=".pdf,application/pdf" multiple className="max-w-2xl mx-auto" />
            </Card>
        </motion.div>
    );

    // ── Standalone: merged result overlay ────────────────────────────────────────

    const resultOverlay = !isInteractionMode && mergedPdfUrl && (
        <AnimatePresence>
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
        </AnimatePresence>
    );

    // ── Root layout (different container per mode) ────────────────────────────────

    return (
        <div className={isInteractionMode ? 'w-full h-full flex flex-col' : 'w-full max-w-5xl mx-auto space-y-8'}>
            <AnimatePresence mode="wait">
                {files.length === 0 ? uploadPrompt : workspace}
            </AnimatePresence>

            {resultOverlay}
        </div>
    );
}
