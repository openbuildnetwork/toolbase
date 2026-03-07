'use client';
/**
 * RearrangePdf — unified component for the direct tool page and the pipeline INP.
 *
 * Standalone mode  (direct tool):   <RearrangePdf />
 *   → Reorder, rotate, delete pages → apply changes → download
 *
 * Interaction mode (pipeline INP):  <RearrangePdf files={[pdf]} onConfirm={fn} onCancel={fn} />
 *   → Pre-seeded with upstream file, same UI
 *   → Confirm saves pageOrder+operations as config (no execution here)
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { Button } from '@/components/ui/Button';
import {
    Download,
    RefreshCw,
    RotateCw,
    Trash2,
    CheckCircle,
    CheckCheck,
    Undo2,
    ArrowUpDown,
    X,
    ChevronLeft,
    ChevronRight,
    Eye
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { rearrangePdf, getPdfPageCount, renderPdfPageToImage, PageOperation } from '@/lib/pdf-actions';
import type { TIPInteractionProps } from '@/tip/protocol';

export type RearrangePdfProps = Partial<TIPInteractionProps>;

interface PageItem {
    id: string;
    index: number;
    originalIndex: number;
    thumbnail: string | null;
    rotation: number;
    deleted: boolean;
}

export default function RearrangePdf({
    files: seedFiles,
    onConfirm,
    onCancel,
}: RearrangePdfProps = {}) {
    /**true when used inside the pipeline InteractionModal */
    const isInteractionMode = typeof onConfirm === 'function';

    const [file, setFile] = useState<File | null>(seedFiles?.[0] ?? null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
    const [loadingThumbnails, setLoadingThumbnails] = useState(false);
    const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

    // ── Load the PDF whenever file changes (covers seedFiles pre-seed and user picks) ──
    const loadFile = async (selectedFile: File) => {
        setResultPdfUrl(null);
        setIsLoading(true);
        setLoadingThumbnails(true);
        try {
            const pageCount = await getPdfPageCount(selectedFile);
            const pageItems: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
                id: `page-${i}`,
                index: i,
                originalIndex: i,
                thumbnail: null,
                rotation: 0,
                deleted: false,
            }));
            setPages(pageItems);
            // Load thumbnails progressively
            for (let i = 0; i < pageCount; i++) {
                try {
                    const thumbnail = await renderPdfPageToImage(selectedFile, i, 1.5);
                    setPages(prev => prev.map(p => p.originalIndex === i ? { ...p, thumbnail } : p));
                } catch (err) {
                    console.error(`Failed to render page ${i}:`, err);
                }
            }
            setLoadingThumbnails(false);
        } catch (err) {
            console.error('Error loading PDF:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-load when file is set (covers seedFiles initial value)
    useEffect(() => {
        if (file) loadFile(file);
        else { setPages([]); setResultPdfUrl(null); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    /** Called by the FileUploader drop zone in standalone mode */
    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) setFile(files[0]);
    };

    const handleRotatePage = (pageId: string) => {
        setPages(prev => prev.map(p =>
            p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p
        ));
    };

    const handleDeletePage = (pageId: string) => {
        setPages(prev => prev.map(p =>
            p.id === pageId ? { ...p, deleted: true } : p
        ));
    };

    const handleRestorePage = (pageId: string) => {
        setPages(prev => prev.map(p =>
            p.id === pageId ? { ...p, deleted: false } : p
        ));
    };

    const handleResetAll = () => {
        setPages(prev => [...prev]
            .sort((a, b) => a.originalIndex - b.originalIndex)
            .map(p => ({ ...p, rotation: 0, deleted: false }))
        );
    };

    const handleReorder = (fromIndex: number, toIndex: number) => {
        setPages(prev => {
            const activePagesOnly = prev.filter(p => !p.deleted);
            const deletedPagesOnly = prev.filter(p => p.deleted);

            const newActivePages = [...activePagesOnly];
            const [movedPage] = newActivePages.splice(fromIndex, 1);
            newActivePages.splice(toIndex, 0, movedPage);

            return [...newActivePages, ...deletedPagesOnly];
        });
    };

    // ── Standalone: execute rearrangement via pdf-lib ─────────────────────────
    const handleProcess = async () => {
        if (!file) return;
        setIsProcessing(true);
        try {
            const activePages = pages.filter(p => !p.deleted);
            const newOrder = activePages.map(p => p.originalIndex);
            const operations: PageOperation[] = pages.map(p => ({
                pageIndex: p.originalIndex,
                rotation: p.rotation,
                delete: p.deleted,
            }));
            const resultBytes = await rearrangePdf(file, newOrder, operations);
            const blob = new Blob([resultBytes as any], { type: 'application/pdf' });
            setResultPdfUrl(URL.createObjectURL(blob));
        } catch (err) {
            console.error('Error processing PDF:', err);
            alert('Failed to process PDF: ' + (err as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Interaction: confirm page arrangement to the pipeline ──────────────────
    const handleConfirm = () => {
        if (!file || !onConfirm) return;
        const activePages = pages.filter(p => !p.deleted);
        const newOrder = activePages.map(p => p.originalIndex);
        const operations: PageOperation[] = pages.map(p => ({
            pageIndex: p.originalIndex,
            rotation: p.rotation,
            delete: p.deleted,
        }));
        onConfirm({
            files: [file],
            config: {
                pageOrder: JSON.stringify(newOrder),
                operations: JSON.stringify(operations),
            },
        });
    };

    const activePages = pages.filter(p => !p.deleted);
    const deletedPages = pages.filter(p => p.deleted);
    const hasChanges = pages.some((p, idx) => {
        const activePagesOnly = pages.filter(pg => !pg.deleted);
        const currentPositionInActive = activePagesOnly.findIndex(pg => pg.id === p.id);
        return p.rotation !== 0 || p.deleted || (currentPositionInActive !== -1 && currentPositionInActive !== p.originalIndex);
    });

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8">
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
                                <h2 className="text-2xl font-semibold mb-2">Rearrange PDF Pages</h2>
                                <p className="text-gray-500">Reorder, rotate, and delete pages from your PDF.</p>
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
                        {/* Header */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                        <ArrowUpDown className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{file.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {activePages.length} page{activePages.length !== 1 ? 's' : ''}
                                            {deletedPages.length > 0 && ` • ${deletedPages.length} deleted`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {hasChanges && !resultPdfUrl && (
                                        <Button variant="ghost" onClick={handleResetAll}>
                                            <Undo2 className="w-4 h-4 mr-2" />
                                            Reset All
                                        </Button>
                                    )}
                                    {!resultPdfUrl && !isInteractionMode && (
                                        <Button variant="ghost" onClick={() => setFile(null)}>
                                            Change File
                                        </Button>
                                    )}
                                    {/* Mode-specific action */}
                                    {isInteractionMode && (
                                        <>
                                            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                                            <Button onClick={handleConfirm} disabled={activePages.length === 0} className="gap-2">
                                                <CheckCheck className="w-4 h-4" />
                                                Confirm Arrangement ({activePages.length} pages)
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Result Section */}
                        {resultPdfUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="p-8 bg-green-50/50 border-green-100">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">PDF Rearranged!</h3>
                                        <p className="text-gray-600 mb-6">Your PDF has been successfully processed.</p>

                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setFile(null);
                                                    setPages([]);
                                                    setResultPdfUrl(null);
                                                }}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Process Another
                                            </Button>
                                            <a href={resultPdfUrl} download={`rearranged_${file.name}`}>
                                                <Button>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download Result
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Pages Grid */}
                        {!resultPdfUrl && (
                            <>
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">Pages</h4>
                                            <p className="text-sm text-gray-500">
                                                {isInteractionMode
                                                    ? 'Drag pages to reorder, rotate, or delete.'
                                                    : 'Click and drag pages to reorder'}
                                            </p>
                                        </div>
                                        {/* Standalone Apply Changes button */}
                                        {!isInteractionMode && (
                                            <Button
                                                onClick={handleProcess}
                                                disabled={isProcessing || !hasChanges || activePages.length === 0}
                                                isLoading={isProcessing}
                                            >
                                                {isProcessing ? 'Processing...' : 'Apply Changes'}
                                            </Button>
                                        )}
                                    </div>

                                    {loadingThumbnails && (
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block mr-2" />
                                            Loading page previews...
                                        </div>
                                    )}

                                    <DraggableGrid
                                        pages={activePages}
                                        onReorder={handleReorder}
                                        onRotate={handleRotatePage}
                                        onDelete={handleDeletePage}
                                        onPreview={(index) => setPreviewPageIndex(index)}
                                    />

                                    {activePages.length === 0 && !loadingThumbnails && (
                                        <div className="text-center py-12 text-gray-400">
                                            <p>All pages have been deleted. Restore some pages to continue.</p>
                                        </div>
                                    )}
                                </Card>

                                {/* Deleted Pages */}
                                {deletedPages.length > 0 && (
                                    <Card className="p-6 bg-red-50/30 border-red-100">
                                        <h4 className="font-semibold text-gray-900 mb-4">Deleted Pages</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {deletedPages.map((page) => (
                                                <div key={page.id} className="relative opacity-60">
                                                    <PageCard
                                                        page={page}
                                                        onRotate={() => { }}
                                                        onDelete={() => { }}
                                                        isDeleted
                                                        isDragging={false}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="absolute inset-0 m-auto w-fit h-fit bg-white"
                                                        onClick={() => handleRestorePage(page.id)}
                                                    >
                                                        <Undo2 className="w-3 h-3 mr-1" />
                                                        Restore
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewPageIndex !== null && (
                    <PagePreviewModal
                        page={activePages[previewPageIndex]}
                        currentIndex={previewPageIndex}
                        totalPages={activePages.length}
                        onClose={() => setPreviewPageIndex(null)}
                        onNext={() => setPreviewPageIndex(prev =>
                            prev !== null && prev < activePages.length - 1 ? prev + 1 : prev
                        )}
                        onPrevious={() => setPreviewPageIndex(prev =>
                            prev !== null && prev > 0 ? prev - 1 : prev
                        )}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface DraggableGridProps {
    pages: PageItem[];
    onReorder: (fromIndex: number, toIndex: number) => void;
    onRotate: (pageId: string) => void;
    onDelete: (pageId: string) => void;
    onPreview: (index: number) => void;
}

const DraggableGrid = ({ pages, onReorder, onRotate, onDelete, onPreview }: DraggableGridProps) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Create a semi-transparent drag image
        if (e.currentTarget instanceof HTMLElement) {
            const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
            dragImage.style.opacity = '0.5';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 50, 50);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        }
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedIndex === null || draggedIndex === index) return;
        setOverIndex(index);
    };

    const handleDragLeave = () => {
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
            onReorder(draggedIndex, overIndex);
        }
        setDraggedIndex(null);
        setOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        handleDragEnd();
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((page, index) => (
                <div
                    key={page.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    className={cn(
                        "transition-all duration-200 relative",
                        draggedIndex === index && "opacity-30 scale-95",
                        overIndex === index && draggedIndex !== null && draggedIndex !== index && "ring-4 ring-primary/50 scale-105"
                    )}
                >
                    <PageCard
                        page={page}
                        onRotate={() => onRotate(page.id)}
                        onDelete={() => onDelete(page.id)}
                        onPreview={() => onPreview(index)}
                        isDragging={draggedIndex === index}
                    />
                </div>
            ))}
        </div>
    );
};

interface PageCardProps {
    page: PageItem;
    onRotate: () => void;
    onDelete: () => void;
    onPreview?: () => void;
    isDeleted?: boolean;
    isDragging?: boolean;
}

const PageCard = ({ page, onRotate, onDelete, onPreview, isDeleted = false, isDragging = false }: PageCardProps) => {
    return (
        <div
            className={cn(
                "group relative bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden select-none",
                isDeleted
                    ? "border-red-200 opacity-50"
                    : "border-gray-200 hover:border-primary/40 hover:shadow-lg",
                !isDeleted && "cursor-move active:cursor-grabbing",
                isDragging && "shadow-2xl"
            )}
        >
            {/* Page Number Badge */}
            <div className="absolute top-2 right-2 z-10 pointer-events-none">
                <div className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md">
                    {page.originalIndex + 1}
                </div>
            </div>

            {/* Thumbnail */}
            <div
                className="aspect-[1/1.414] bg-gray-100 flex items-center justify-center overflow-hidden pointer-events-none"
                style={{ transform: `rotate(${page.rotation}deg)` }}
            >
                {page.thumbnail ? (
                    <img
                        src={page.thumbnail}
                        alt={`Page ${page.originalIndex + 1}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                    />
                ) : (
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            {/* Action Buttons */}
            {!isDeleted && (
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex gap-2 justify-center">
                        {onPreview && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onPreview();
                                }}
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                className="p-2 bg-white/90 hover:bg-blue-50 rounded-lg transition-colors pointer-events-auto group/preview"
                                title="Preview page"
                            >
                                <Eye className="w-4 h-4 text-gray-700 group-hover/preview:text-blue-600" />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onRotate();
                            }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors pointer-events-auto"
                            title="Rotate 90°"
                        >
                            <RotateCw className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onDelete();
                            }}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            className="p-2 bg-white/90 hover:bg-red-50 rounded-lg transition-colors group/delete pointer-events-auto"
                            title="Delete page"
                        >
                            <Trash2 className="w-4 h-4 text-gray-700 group-hover/delete:text-red-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Preview Modal Component
interface PagePreviewModalProps {
    page: PageItem;
    currentIndex: number;
    totalPages: number;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
}

const PagePreviewModal = ({ page, currentIndex, totalPages, onClose, onNext, onPrevious }: PagePreviewModalProps) => {
    const [zoom, setZoom] = useState(1.5);
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3;
    const ZOOM_STEP = 0.25;

    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && currentIndex < totalPages - 1) onNext();
            if (e.key === 'ArrowLeft' && currentIndex > 0) onPrevious();
            // Zoom with + and - keys
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
            }
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
            }
            // Reset zoom with 0
            if (e.key === '0') {
                e.preventDefault();
                setZoom(1.5);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, totalPages, onClose, onNext, onPrevious]);

    // Mouse wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY / 1000;
            setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
        }
    };

    // Reset zoom when page changes
    React.useEffect(() => {
        setZoom(1.5);
    }, [currentIndex]);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
    };

    const handleResetZoom = () => {
        setZoom(1.5);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                title="Close (Esc)"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* Page Info */}
            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                <p className="text-sm font-medium">
                    Page {page.originalIndex + 1} of {totalPages}
                </p>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomOut();
                    }}
                    disabled={zoom <= MIN_ZOOM}
                    className="p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom Out (-)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleResetZoom();
                    }}
                    className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-sm font-medium min-w-[60px]"
                    title="Reset Zoom (0)"
                >
                    {Math.round(zoom * 100)}%
                </button>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleZoomIn();
                    }}
                    disabled={zoom >= MAX_ZOOM}
                    className="p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom In (+)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                </button>

                <div className="ml-2 pl-2 border-l border-white/20 text-xs text-gray-300">
                    Ctrl+Scroll to zoom
                </div>
            </div>

            {/* Navigation Buttons */}
            {currentIndex > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPrevious();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    title="Previous (←)"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
            )}

            {currentIndex < totalPages - 1 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNext();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    title="Next (→)"
                >
                    <ChevronRight className="w-6 h-6 text-white" />
                </button>
            )}

            {/* Preview Image Container with Scroll */}
            <div
                className="max-w-[90vw] max-h-[90vh] overflow-auto p-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                onClick={(e) => e.stopPropagation()}
                onWheel={handleWheel}
            >
                <motion.div
                    key={`${page.id}-${zoom}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl overflow-hidden transition-transform duration-200"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                    >
                        {page.thumbnail ? (
                            <img
                                src={page.thumbnail}
                                alt={`Page ${page.originalIndex + 1}`}
                                className="max-w-none"
                                style={{
                                    transform: `rotate(${page.rotation}deg)`,
                                    maxHeight: '80vh',
                                    width: 'auto'
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center p-20">
                                <div className="w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Rotation indicator */}
                    {page.rotation !== 0 && (
                        <div className="mt-4 text-center">
                            <span className="inline-block bg-white/10 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
                                Rotated {page.rotation}°
                            </span>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};
