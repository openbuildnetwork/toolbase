'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { Button } from '@/components/ui/Button';
import {
    Download,
    RefreshCw,
    RotateCw,
    Trash2,
    CheckCircle,
    Undo2,
    ArrowUpDown
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { rearrangePdf, getPdfPageCount, renderPdfPageToImage, PageOperation } from '@/lib/pdf-actions';

interface PageItem {
    id: string;
    index: number;
    originalIndex: number;
    thumbnail: string | null;
    rotation: number;
    deleted: boolean;
}

export default function RearrangePdf() {
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
    const [loadingThumbnails, setLoadingThumbnails] = useState(false);

    const handleFileSelected = async (files: File[]) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setResultPdfUrl(null);
            setIsLoading(true);
            setLoadingThumbnails(true);

            try {
                const pageCount = await getPdfPageCount(selectedFile);
                const pageItems: PageItem[] = [];

                // Initialize pages
                for (let i = 0; i < pageCount; i++) {
                    pageItems.push({
                        id: `page-${i}`,
                        index: i,
                        originalIndex: i,
                        thumbnail: null,
                        rotation: 0,
                        deleted: false,
                    });
                }

                setPages(pageItems);

                // Load thumbnails asynchronously
                for (let i = 0; i < pageCount; i++) {
                    try {
                        const thumbnail = await renderPdfPageToImage(selectedFile, i, 0.5);
                        setPages(prev => prev.map(p =>
                            p.originalIndex === i ? { ...p, thumbnail } : p
                        ));
                    } catch (error) {
                        console.error(`Failed to render page ${i}:`, error);
                    }
                }

                setLoadingThumbnails(false);
            } catch (error) {
                console.error('Error loading PDF:', error);
                alert('Failed to load PDF: ' + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
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

    const handleProcess = async () => {
        if (!file) return;

        setIsProcessing(true);

        try {
            // Get the new order (excluding deleted pages)
            const activePages = pages.filter(p => !p.deleted);
            const newOrder = activePages.map(p => p.originalIndex);

            // Prepare operations
            const operations: PageOperation[] = pages.map(p => ({
                pageIndex: p.originalIndex,
                rotation: p.rotation,
                delete: p.deleted,
            }));

            const resultBytes = await rearrangePdf(file, newOrder, operations);
            const blob = new Blob([resultBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setResultPdfUrl(url);
        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Failed to process PDF: ' + (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
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
                                    {!resultPdfUrl && (
                                        <Button variant="ghost" onClick={() => setFile(null)}>
                                            Change File
                                        </Button>
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
                                            <p className="text-sm text-gray-500">Click and drag pages to reorder</p>
                                        </div>
                                        <Button
                                            onClick={handleProcess}
                                            disabled={isProcessing || !hasChanges || activePages.length === 0}
                                            isLoading={isProcessing}
                                        >
                                            {isProcessing ? 'Processing...' : 'Apply Changes'}
                                        </Button>
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
        </div>
    );
}

interface DraggableGridProps {
    pages: PageItem[];
    onReorder: (fromIndex: number, toIndex: number) => void;
    onRotate: (pageId: string) => void;
    onDelete: (pageId: string) => void;
}

const DraggableGrid = ({ pages, onReorder, onRotate, onDelete }: DraggableGridProps) => {
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
    isDeleted?: boolean;
    isDragging?: boolean;
}

const PageCard = ({ page, onRotate, onDelete, isDeleted = false, isDragging = false }: PageCardProps) => {
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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex gap-2 justify-center">
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
