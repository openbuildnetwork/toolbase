'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { Button } from '@/components/ui/Button';
import {
    Download,
    RefreshCw,
    CheckCircle,
    Type,
    Upload,
    Trash2,
    X,
    Move,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Plus,
    Square,
    Circle,
    Minus,
    Palette,
    MousePointer2,
    Pencil,
    Edit3,
    Eraser,
    FileType,
    Info,
    Undo2,
    Redo2,
    Search,
    ShieldCheck,
    History,
    Settings2,
    Layers,
    Type as TypeIcon
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { PdfPreview } from '@/components/ui/PdfPreview';
import { magicPdfWorker } from '@/workers/instances';
import { ShieldAlert, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { useDebounce } from '@/hooks/useDebounce';

type ElementType = 'text' | 'image' | 'shape' | 'drawing' | 'whiteout';
type ShapeType = 'rectangle' | 'circle' | 'line';

interface EditElement {
    id: string;
    type: ElementType;
    content?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pageIndex: number;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    shapeType?: ShapeType;
    strokeWidth?: number;
    opacity?: number;
    label?: string;
    existing?: boolean;
    originalContent?: string;
    originalRect?: [number, number, number, number];
    moved?: boolean;
    redact?: boolean;
    content_changed?: boolean;
    is_masked?: boolean;
    maskColor?: string;
    isPreview?: boolean;
}

type BatchMode = 'word' | 'phrase' | 'regex';

export default function MaskPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1);

    // Tools state
    const [activeTool, setActiveTool] = useState<ElementType | 'select'>('whiteout');
    const [activeShapeType, setActiveShapeType] = useState<ShapeType>('rectangle');
    const [elements, setElements] = useState<EditElement[]>([]);
    const [detectedPages, setDetectedPages] = useState<Set<number>>(new Set());
    const [activeElementId, setActiveElementId] = useState<string | null>(null);

    // Global style state
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentFontSize, setCurrentFontSize] = useState(16);
    const [currentFontFamily, setCurrentFontFamily] = useState('Inter');
    const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const [history, setHistory] = useState<EditElement[][]>([]);
    const [redoStack, setRedoStack] = useState<EditElement[][]>([]);

    // Batch Masking State
    const [batchQuery, setBatchQuery] = useState('');
    const [batchMode, setBatchMode] = useState<BatchMode>('word');
    const [previewMatches, setPreviewMatches] = useState<EditElement[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedQuery = useDebounce(batchQuery, 300);

    // Lasso State
    const [lassoStart, setLassoStart] = useState<{ x: number, y: number } | null>(null);
    const [lassoEnd, setLassoEnd] = useState<{ x: number, y: number } | null>(null);

    const [maskOpacity, setMaskOpacity] = useState(100);
    const [showLabel, setShowLabel] = useState(true);

    const previewContainerRef = useRef<HTMLDivElement>(null);

    const recordHistory = useCallback(() => {
        setHistory(prev => [...prev, [...elements]]);
        setRedoStack([]);
    }, [elements]);

    const undo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setRedoStack(prev => [...prev, [...elements]]);
        setElements(previous);
        setHistory(prev => prev.slice(0, -1));
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, [...elements]]);
        setElements(next);
        setRedoStack(prev => prev.slice(0, -1));
    };

    const handleFileSelected = useCallback((files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setCurrentPage(1);
            setElements([]);
        }
    }, []);

    const addElement = useCallback((type: ElementType, options: Partial<EditElement> = {}) => {
        const newEl: EditElement = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: options.x || 50,
            y: options.y || 50,
            width: options.width || 20,
            height: options.height || 10,
            pageIndex: currentPage - 1,
            color: currentColor,
            fontSize: currentFontSize,
            fontFamily: currentFontFamily,
            opacity: maskOpacity / 100,
            label: showLabel ? '[REDACTED]' : '',
            is_masked: type === 'whiteout',
            ...options
        };
        setElements(prev => [...prev, newEl]);
        setActiveElementId(newEl.id);
    }, [currentPage, currentColor, currentFontSize, currentFontFamily, maskOpacity, showLabel]);

    const handleCanvasResize = useCallback((width: number, height: number) => {
        setCanvasSize({ width, height });
    }, []);

    // Lasso Handlers
    const handleLassoMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'whiteout') return;
        const rect = previewContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setLassoStart({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        });
    };

    const handleLassoMouseMove = (e: React.MouseEvent) => {
        if (!lassoStart) return;
        const rect = previewContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setLassoEnd({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        });
    };

    const handleLassoMouseUp = () => {
        if (lassoStart && lassoEnd) {
            const x = Math.min(lassoStart.x, lassoEnd.x);
            const y = Math.min(lassoStart.y, lassoEnd.y);
            const width = Math.abs(lassoStart.x - lassoEnd.x);
            const height = Math.abs(lassoStart.y - lassoEnd.y);

            if (width > 0.5 && height > 0.5) {
                recordHistory();
                addElement('whiteout', { x, y, width, height, is_masked: true, maskColor: currentColor, opacity: maskOpacity / 100, label: showLabel ? '[REDACTED]' : '' });
            }
        }
        setLassoStart(null);
        setLassoEnd(null);
    };

    // Batch Search Effect
    useEffect(() => {
        if (!debouncedQuery || !file) {
            setPreviewMatches([]);
            return;
        }

        const performSearch = async () => {
            setIsSearching(true);
            try {
                const fileBytes = await file.arrayBuffer();
                const results: any = await magicPdfWorker.execute('search', {
                    file_bytes: new Uint8Array(fileBytes),
                    pattern: debouncedQuery,
                    mode: batchMode
                });

                if (results && results.matches) {
                    const matches: EditElement[] = results.matches.map((m: any, i: number) => ({
                        id: `preview-${i}`,
                        type: 'whiteout',
                        x: m.x,
                        y: m.y,
                        width: m.width,
                        height: m.height,
                        pageIndex: m.page_index,
                        color: '#FBBF24', // Yellow preview
                        opacity: 0.4,
                        isPreview: true
                    }));
                    setPreviewMatches(matches);
                }
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setIsSearching(false);
            }
        };

        performSearch();
    }, [debouncedQuery, batchMode, file]);

    const applyBatchMask = () => {
        if (previewMatches.length === 0) return;
        recordHistory();
        const newMasks = previewMatches.map(m => ({
            ...m,
            id: Math.random().toString(36).substr(2, 9),
            color: currentColor,
            maskColor: currentColor,
            opacity: maskOpacity / 100,
            label: showLabel ? '[REDACTED]' : '',
            isPreview: false,
            is_masked: true
        }));
        setElements(prev => [...prev, ...newMasks]);
        setPreviewMatches([]);
        setBatchQuery('');
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (activeTool === 'select' || activeTool === 'image') return;

        const rect = previewContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Check if clicking near an existing element
        const clickedElement = elements.find(el =>
            el.pageIndex === currentPage - 1 &&
            x >= el.x && x <= el.x + el.width &&
            y >= el.y && y <= el.y + el.height
        );

        if (clickedElement && activeTool === 'text') {
            setActiveElementId(clickedElement.id);
            setActiveTool('select');
            return;
        }

        const options: Partial<EditElement> = { x, y };
        if (activeTool === 'text') {
            options.content = 'New Text';
            options.textAlign = 'left';
        }
        if (activeTool === 'shape') options.shapeType = activeShapeType;

        addElement(activeTool, options);
    };

    const updateElement = (id: string, updates: Partial<EditElement>) => {
        setElements(prev => prev.map(el => {
            if (el.id === id) {
                const updated = { ...el, ...updates };
                // If it's an existing element and coordinates/size changed, mark as moved
                if (el.existing && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined || updates.height !== undefined)) {
                    updated.moved = true;
                }
                if (el.existing && updates.content !== undefined && updates.content !== el.originalContent) {
                    updated.content_changed = true;
                }
                return updated;
            }
            return el;
        }));
    };

    const removeElement = (id: string) => {
        setElements(prev => {
            const el = prev.find(e => e.id === id);
            if (el?.existing) {
                return prev.map(e => e.id === id ? { ...e, redact: true } : e);
            }
            return prev.filter(e => e.id !== id);
        });

        if (activeElementId === id) setActiveElementId(null);
    };

    // Image Upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const imgFile = e.target.files?.[0];
        if (!imgFile) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            addElement('image', { content: event.target?.result as string });
        };
        reader.readAsDataURL(imgFile);
    };



    // Apply & Save via Python
    const handleApply = async () => {
        if (!file || elements.length === 0) return;

        setIsProcessing(true);
        try {
            const fileBytes = await file.arrayBuffer();
            const resultBytes: any = await magicPdfWorker.execute('apply_edits', {
                file_bytes: new Uint8Array(fileBytes),
                edits: elements.filter(el => !el.existing || el.moved || el.redact || el.is_masked || el.content !== el.originalContent).map(el => ({
                    ...el,
                    // content is already dataUrl for images/drawings or text
                }))
            });

            if (resultBytes && resultBytes.error) {
                throw new Error(resultBytes.error);
            }

            // resultBytes is now a copied Uint8Array returned by the worker
            const blob = new Blob([resultBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setResultPdfUrl(url);

        } catch (error) {
            console.error('Error editing PDF:', error);
            alert('Failed to save edited PDF: ' + (error as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const activeElement = elements.find(el => el.id === activeElementId);

    // Sync properties when element is selected
    useEffect(() => {
        if (activeElement) {
            if (activeElement.color) setCurrentColor(activeElement.color);
            if (activeElement.fontSize) setCurrentFontSize(activeElement.fontSize);
            if (activeElement.fontFamily) setCurrentFontFamily(activeElement.fontFamily);
        }
    }, [activeElementId]);

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 h-full flex flex-col">
            <AnimatePresence mode="wait">
                {!file ? (
                    <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-1 flex flex-col items-center justify-center p-4">
                        <Card className="max-w-3xl w-full p-12 border-none shadow-2xl bg-white/50 backdrop-blur-xl">
                            <div className="text-center mb-10">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-3xl mb-6 shadow-inner">
                                    <ShieldAlert className="w-10 h-10 text-red-500" />
                                </div>
                                <h2 className="text-4xl font-bold mb-3 tracking-tight">Redact & Mask</h2>
                                <p className="text-gray-500 text-lg max-w-md mx-auto">Permanently remove sensitive information, PII, and secrets from your documents.</p>
                                <div className="flex items-center justify-center gap-6 mt-6">
                                    <div className="px-3 py-1 rounded-full border border-gray-100 bg-white/50 text-[10px] font-bold uppercase shadow-sm flex gap-2 items-center"><Fingerprint className="w-3 h-3 text-red-500" /> Fingerprint Safe</div>
                                    <div className="px-3 py-1 rounded-full border border-gray-100 bg-white/50 text-[10px] font-bold uppercase shadow-sm flex gap-2 items-center"><ShieldCheck className="w-3 h-3 text-green-500" /> 100% Client-side</div>
                                </div>
                            </div>
                            <FileUploader onFilesSelected={handleFileSelected} accept=".pdf" multiple={false} className="max-w-xl mx-auto" />
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 h-full flex-1 min-h-0">
                        <div className="flex flex-1 gap-6 min-h-0 relative">
                            {/* Left Viewport */}
                            <div className="flex-1 bg-gray-50/50 rounded-3xl flex flex-col overflow-hidden border border-gray-200/50 shadow-inner relative group">
                                <div className="h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-8 z-20 shrink-0">
                                    <div className="flex items-center gap-6">
                                        <div className="flex bg-gray-100/80 rounded-xl p-1 shadow-sm">
                                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                                            <div className="px-4 text-xs font-bold text-gray-600 min-w-[70px] flex items-center justify-center tabular-nums">{currentPage} / {totalPages || '?'}</div>
                                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
                                        </div>
                                        <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1 shadow-sm">
                                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                                            <span className="text-[11px] font-bold text-gray-500 w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => setScale(s => Math.min(2, s + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg shadow-sm" onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></Button>
                                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg shadow-sm" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto p-12 flex justify-center items-start custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                                    <div 
                                        ref={previewContainerRef} 
                                        className={cn("relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-300 rounded-sm origin-top", activeTool === 'whiteout' ? "cursor-crosshair" : "cursor-default")} 
                                        style={{ width: canvasSize.width || 'fit-content', height: canvasSize.height || 'auto' }}
                                        onMouseDown={handleLassoMouseDown}
                                        onMouseMove={handleLassoMouseMove}
                                        onMouseUp={handleLassoMouseUp}
                                    >
                                        <PdfPreview file={file} pageNumber={currentPage} scale={scale} onLoadSuccess={setTotalPages} onResize={handleCanvasResize} className="rounded-sm overflow-hidden" />
                                        
                                        {/* Element Overlay Layer */}
                                        <div className="absolute top-0 left-0 pointer-events-none z-30" style={{ width: canvasSize.width, height: canvasSize.height }}>
                                            {elements.filter(el => el.pageIndex === currentPage - 1).map(el => (
                                                <EditableElement key={el.id} el={el} scale={scale} active={activeElementId === el.id} onSelect={() => setActiveElementId(el.id)} onUpdate={(updates) => { recordHistory(); updateElement(el.id, updates); }} />
                                            ))}
                                            
                                            {/* Preview Matches */}
                                            {previewMatches.filter(m => m.pageIndex === currentPage - 1).map(m => (
                                                <div key={m.id} className="absolute border border-amber-400 bg-amber-400/30 animate-pulse rounded-sm" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }} />
                                            ))}

                                            {/* Lasso Preview */}
                                            {lassoStart && lassoEnd && (
                                                <div className="absolute border-2 border-primary bg-primary/10 border-dashed rounded-sm z-50" style={{ left: `${Math.min(lassoStart.x, lassoEnd.x)}%`, top: `${Math.min(lassoStart.y, lassoEnd.y)}%`, width: `${Math.abs(lassoStart.x - lassoEnd.x)}%`, height: `${Math.abs(lassoStart.y - lassoEnd.y)}%` }} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel - Controls */}
                            <div className="w-80 flex flex-col gap-6 shrink-0 min-h-0">
                                {/* Batch Mask Panel */}
                                <Card className="flex flex-col border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden flex-1 max-h-[50%]">
                                    <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50/50">
                                        <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 flex items-center gap-2"><Search className="w-3 h-3" /> Batch Redaction</h4>
                                        {isSearching && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
                                    </div>
                                    <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
                                        <div className="flex bg-gray-100/80 rounded-xl p-1 gap-1">
                                            {(['word', 'phrase', 'regex'] as const).map(mode => (
                                                <button key={mode} onClick={() => setBatchMode(mode)} className={cn("flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", batchMode === mode ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600")}>
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <input type="text" placeholder={batchMode === 'regex' ? '/pattern/gi' : "Type to search..."} className="w-full bg-gray-100/50 border-gray-200/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={batchQuery} onChange={(e) => setBatchQuery(e.target.value)} />
                                            {previewMatches.length > 0 && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-500 text-white font-bold tabular-nums text-[10px] px-2 py-0.5 rounded-full">
                                                    {previewMatches.length} Matches
                                                </div>
                                            )}
                                        </div>
                                        
                                        {previewMatches.length > 0 && (
                                            <Button className="w-full bg-amber-500 hover:bg-amber-600 border-none shadow-lg shadow-amber-500/20" onClick={applyBatchMask}>
                                                Apply to All Matches
                                            </Button>
                                        )}
                                        
                                        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex gap-3 items-start">
                                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
                                                All identified matches across {totalPages} pages will be previewed in yellow before you apply the permanent mask.
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Style & Actions Panel */}
                                <Card className="p-5 border-none shadow-xl bg-white/80 backdrop-blur-md space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Palette className="w-3 h-3" /> Mask Style</label>
                                            <div className="flex gap-1.5">
                                                {['#000000', '#FFFFFF', '#ef4444'].map(color => (
                                                    <button key={color} className={cn("w-5 h-5 rounded-full border transition-all ring-offset-2", currentColor === color && "ring-2 ring-primary scale-110")} style={{ backgroundColor: color }} onClick={() => { recordHistory(); setCurrentColor(color); }} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Opacity</label>
                                                <span className="text-[10px] tabular-nums font-bold text-gray-400">{maskOpacity}%</span>
                                            </div>
                                            <Slider value={maskOpacity} onChange={(e) => { const val = parseInt(e.target.value); setMaskOpacity(val); if (activeElementId) updateElement(activeElementId, { opacity: val / 100 }); }} min={0} max={100} step={1} />
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                {showLabel ? <Eye className="w-3.5 h-3.5 text-gray-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                                                <span className="text-[11px] font-bold text-gray-600">Show Label</span>
                                            </div>
                                            <button onClick={() => { setShowLabel(!showLabel); if (activeElementId) updateElement(activeElementId, { label: !showLabel ? '[REDACTED]' : '' }); }} className={cn("w-9 h-5 rounded-full transition-colors relative", showLabel ? "bg-primary" : "bg-gray-200")}>
                                                <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm", showLabel ? "left-5" : "left-1")} />
                                            </button>
                                        </div>
                                    </div>

                                    {activeElement && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <Button variant="ghost" size="sm" className="w-full text-red-500 hover:bg-red-50 rounded-xl" onClick={() => { recordHistory(); removeElement(activeElement.id); }}>
                                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Selected
                                            </Button>
                                        </div>
                                    )}
                                </Card>

                                <div className="mt-auto flex flex-col gap-3">
                                    <Button className="w-full h-14 shadow-2xl shadow-primary/20 rounded-2xl text-base font-bold tracking-tight" onClick={handleApply} isLoading={isProcessing} disabled={elements.length === 0}>
                                        <ShieldCheck className="w-5 h-5 mr-2" /> Export Masked PDF
                                    </Button>
                                    <Button variant="ghost" className="w-full text-gray-400 hover:text-gray-600 rounded-xl" onClick={() => setFile(null)}>Reset & Close</Button>
                                </div>
                            </div>
                        </div>

                        {resultPdfUrl && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl z-[100] flex items-center justify-center p-8">
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full bg-white rounded-3xl p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] text-center space-y-8 border border-gray-100">
                                    <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-bold tracking-tight">Safely Redacted</h3>
                                        <p className="text-gray-500 text-lg">Your file is ready for secure sharing.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <a href={resultPdfUrl} download={`${file.name.replace('.pdf', '')}_masked.pdf`} className="flex-1"><Button className="w-full h-14 rounded-2xl text-lg"><Download className="w-5 h-5 mr-2" /> Download</Button></a>
                                        <Button variant="ghost" className="h-14 rounded-2xl px-6" onClick={() => setResultPdfUrl(null)}>Close</Button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const ToolButton = ({ active, onClick, icon, label }: { active?: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center p-2 rounded-lg transition-all", active ? "bg-primary text-white" : "hover:bg-gray-100 text-gray-500")}>
        {icon}
        <span className="text-[10px] font-bold uppercase mt-1">{label}</span>
    </button>
);

const EditableElement = ({ el, active, onSelect, onUpdate, scale = 1 }: { el: EditElement, active: boolean, onSelect: () => void, onUpdate: (updates: Partial<EditElement>) => void, scale?: number }) => {
    const elRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditingText, setIsEditingText] = useState(el.type === 'text' && el.content === 'New Text');
    const [resizeDir, setResizeDir] = useState<string | null>(null);

    const isModified = el.existing && (el.content !== el.originalContent || el.moved);
    // Always show background for modified elements, or when actively editing.
    // Also show for new text elements.
    const showBackground = isModified || isEditingText || (!el.existing && el.type === 'text');

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditingText) return;
        e.stopPropagation();
        onSelect();
        setIsDragging(true);
    };

    const handleResizeStart = (e: React.MouseEvent, dir: string) => {
        e.stopPropagation();
        onSelect();
        setResizeDir(dir);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!elRef.current?.parentElement) return;
        const rect = elRef.current.parentElement.getBoundingClientRect();

        if (isDragging) {
            onUpdate({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
        } else if (resizeDir) {
            const mX = ((e.clientX - rect.left) / rect.width) * 100;
            const mY = ((e.clientY - rect.top) / rect.height) * 100;
            const updates: Partial<EditElement> = {};
            if (resizeDir.includes('e')) updates.width = Math.max(2, Math.abs(mX - el.x) * 2);
            if (resizeDir.includes('w')) updates.width = Math.max(2, Math.abs(el.x - mX) * 2);
            if (resizeDir.includes('s')) updates.height = Math.max(1, Math.abs(mY - el.y) * 2);
            if (resizeDir.includes('n')) updates.height = Math.max(1, Math.abs(el.y - mY) * 2);
            onUpdate(updates);
        }
    }, [isDragging, resizeDir, el.x, el.y, onUpdate]);

    useEffect(() => {
        if (isDragging || resizeDir) {
            window.addEventListener('mousemove', handleMouseMove);
            const stop = () => { setIsDragging(false); setResizeDir(null); };
            window.addEventListener('mouseup', stop);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', stop);
            };
        }
    }, [isDragging, resizeDir, handleMouseMove]);

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    if (el.redact) return null;

    if (el.is_masked || el.type === 'whiteout') {
        const bgColor = el.isPreview ? '#FBBF24' : (el.maskColor || el.color || '#000000');
        const displayOpacity = el.opacity !== undefined ? el.opacity : 1;

        return (
            <div
                className={cn("absolute pointer-events-auto z-20 cursor-pointer transition-all flex items-center justify-center overflow-hidden", el.isPreview && "ring-1 ring-amber-500 animate-pulse")}
                style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, backgroundColor: bgColor, opacity: displayOpacity }}
                onMouseDown={handleMouseDown}
            >
                {el.label && !el.isPreview && (
                    <span 
                        className="text-[white] font-bold text-center pointer-events-none break-all p-0.5 leading-none"
                        style={{ fontSize: Math.max(4, Math.min(10, el.height * scale * 0.4)) + 'px' }}
                    >
                        {el.label}
                    </span>
                )}
                {active && (
                    <div className="absolute inset-0 ring-2 ring-primary ring-offset-1 z-30 ring-inset" />
                )}
                {active && !el.isPreview && handles.map(h => (
                    <div key={h} className={cn("absolute w-2 h-2 bg-white border border-primary z-40 rounded-full", h === 'nw' && "-top-1 -left-1", h === 'n' && "-top-1 left-1/2 -translate-x-1/2", h === 'ne' && "-top-1 -right-1", h === 'e' && "top-1/2 -right-1 -translate-y-1/2", h === 'se' && "-bottom-1 -right-1", h === 's' && "-bottom-1 left-1/2 -translate-x-1/2", h === 'sw' && "-bottom-1 -left-1", h === 'w' && "top-1/2 -left-1 -translate-y-1/2")} onMouseDown={e => handleResizeStart(e, h)} />
                ))}
            </div>
        );
    }

    return (
        <div
            ref={elRef}
            className={cn(
                "absolute pointer-events-auto transition-all duration-200",
                active ? "z-30 ring-1 ring-primary bg-primary/5" : "z-20 border border-transparent hover:border-blue-300/30",
                el.existing && !isModified && !active && "cursor-text"
            )}
            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%` }}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => el.type === 'text' && setIsEditingText(true)}
        >
            <div className={cn("w-full h-full flex items-center relative", showBackground && "bg-white")}>
                {el.type === 'text' && (
                    isEditingText ?
                        <textarea autoFocus className="text-left outline-none bg-transparent resize-none w-full h-full p-0 m-0 leading-tight overflow-hidden" style={{ color: el.color || '#000000', fontSize: `${(el.fontSize || 16) * scale}px`, fontFamily: el.fontFamily, textAlign: el.textAlign || 'left' }} value={el.content} onChange={e => { onUpdate({ content: e.target.value }); }} onBlur={() => setIsEditingText(false)} /> :
                        ((!el.existing || isModified) && <p style={{ color: el.color || '#000000', fontSize: `${(el.fontSize || 16) * scale}px`, fontFamily: el.fontFamily, textAlign: el.textAlign || 'left' }} className="text-left wrap-break-word m-0 p-0 w-full leading-tight">{el.content}</p>)
                )}
                {el.type === 'image' && <img src={el.content} className="w-full h-full object-contain pointer-events-none" />}
                {el.type === 'drawing' && <img src={el.content} className="w-full h-full object-contain pointer-events-none" />}
                {el.type === 'shape' && (
                    <div style={{ width: '100%', height: '100%', border: `${(el.strokeWidth || 2) * scale}px solid ${el.color}`, borderRadius: el.shapeType === 'circle' ? '50%' : '0' }} />
                )}
                {el.type === 'whiteout' && (
                    <div style={{ width: '100%', height: '100%', backgroundColor: el.color || '#000000' }} />
                )}
            </div>
            {active && handles.map(h => (
                <div key={h} className={cn("absolute w-2.5 h-2.5 bg-white border border-primary z-40 rounded-full", h === 'nw' && "-top-1 -left-1", h === 'n' && "-top-1 left-1/2 -translate-x-1/2", h === 'ne' && "-top-1 -right-1", h === 'e' && "top-1/2 -right-1 -translate-y-1/2", h === 'se' && "-bottom-1 -right-1", h === 's' && "-bottom-1 left-1/2 -translate-x-1/2", h === 'sw' && "-bottom-1 -left-1", h === 'w' && "top-1/2 -left-1 -translate-y-1/2")} onMouseDown={e => handleResizeStart(e, h)} />
            ))}
        </div>
    );
};
