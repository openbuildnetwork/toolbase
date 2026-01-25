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
    Eraser
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { PdfPreview } from '@/components/ui/PdfPreview';
import { useMagicPdfWorker } from '@/hooks/useMagicPdfWorker';

type ElementType = 'text' | 'image' | 'shape' | 'drawing' | 'whiteout';
type ShapeType = 'rectangle' | 'circle' | 'line';

interface EditElement {
    id: string;
    type: ElementType;
    content?: string; // dataUrl for image/drawing, text for text
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width: number; // percentage
    height: number; // percentage
    pageIndex: number;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    shapeType?: ShapeType;
    strokeWidth?: number;
    opacity?: number;
    existing?: boolean; // If it's an element detected from the original PDF
    originalRect?: [number, number, number, number]; // Coordinates in PDF points
    moved?: boolean;
    redact?: boolean;
}

export default function EditPdf() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1);

    // Tools state
    const [activeTool, setActiveTool] = useState<ElementType | 'select'>('select');
    const [elements, setElements] = useState<EditElement[]>([]);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [detectedPages, setDetectedPages] = useState<Set<number>>(new Set());

    // Global style state
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentFontSize, setCurrentFontSize] = useState(16);
    const [currentFontFamily, setCurrentFontFamily] = useState('Inter');
    const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);

    const { processPdf, isReady } = useMagicPdfWorker();
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Reset editor when file change
    useEffect(() => {
        if (file) {
            setElements([]);
            setDetectedPages(new Set());
            setResultPdfUrl(null);
            setCurrentPage(1);
        }
    }, [file]);

    // Detect existing elements on the page
    useEffect(() => {
        if (!file || !isReady || detectedPages.has(currentPage - 1)) return;

        const detectElements = async () => {
            try {
                const results: any = await processPdf('detect', file, { page_index: currentPage - 1 });
                if (results && Array.isArray(results.elements)) {
                    const { width: p_W, height: p_H } = results;
                    const newElements: EditElement[] = results.elements.map((res: any) => {
                        return {
                            id: res.id,
                            type: res.type,
                            content: res.content,
                            x: ((res.rect[0] + res.rect[2]) / 2 / p_W) * 100,
                            y: ((res.rect[1] + res.rect[3]) / 2 / p_H) * 100,
                            width: ((res.rect[2] - res.rect[0]) / p_W) * 100,
                            height: ((res.rect[3] - res.rect[1]) / p_H) * 100,
                            pageIndex: currentPage - 1,
                            existing: true,
                            originalRect: res.rect
                        };
                    });
                    setElements(prev => [...prev.filter(el => !el.existing || el.pageIndex !== currentPage - 1), ...newElements]);
                }
                setDetectedPages(prev => new Set(prev).add(currentPage - 1));
            } catch (err) {
                console.error('Detection failed:', err);
            }
        };

        detectElements();
    }, [file, currentPage, isReady, processPdf, detectedPages]);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    // Add Element Helpers
    const addElement = (type: ElementType, options: Partial<EditElement> = {}) => {
        const newElement: EditElement = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: 50,
            y: 50,
            width: type === 'text' ? 15 : 20,
            height: type === 'text' ? 5 : 15,
            pageIndex: currentPage - 1,
            color: type === 'whiteout' ? '#FFFFFF' : currentColor,
            fontSize: currentFontSize,
            fontFamily: currentFontFamily,
            strokeWidth: currentStrokeWidth,
            opacity: 1,
            ...options
        };

        setElements([...elements, newElement]);
        setActiveElementId(newElement.id);
        setActiveTool('select');
    };

    const updateElement = (id: string, updates: Partial<EditElement>) => {
        setElements(prev => prev.map(el => {
            if (el.id === id) {
                const updated = { ...el, ...updates };
                // If it's an existing element and coordinates/size changed, mark as moved
                if (el.existing && (updates.x !== undefined || updates.y !== undefined || updates.width !== undefined || updates.height !== undefined || updates.content !== undefined)) {
                    updated.moved = true;
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
            // Use the Python apply_edits action
            const resultBytes = await processPdf('apply_edits', file, {
                edits: elements.filter(el => !el.existing || el.moved || el.redact).map(el => ({
                    ...el,
                    // content is already dataUrl for images/drawings or text
                }))
            });

            const blob = new Blob([resultBytes as any], { type: 'application/pdf' });
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

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 h-full flex flex-col">
            <AnimatePresence mode="wait">
                {!file ? (
                    <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <Card className="p-8">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                    <Edit3 className="w-8 h-8 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-semibold mb-2">Edit PDF</h2>
                                <p className="text-gray-500">Add content or mask existing parts of your document.</p>
                            </div>
                            <FileUploader onFilesSelected={handleFileSelected} accept=".pdf" multiple={false} className="max-w-2xl mx-auto" />
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-6 h-[80vh]">
                        {/* Toolbar */}
                        <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0 overflow-y-auto pr-2 custom-scrollbar">
                            <Card className="p-3 flex flex-col gap-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <ToolButton active={activeTool === 'select'} onClick={() => setActiveTool('select')} icon={<MousePointer2 className="w-4 h-4" />} label="Select" />
                                    <ToolButton active={activeTool === 'text'} onClick={() => addElement('text', { content: 'New Text' })} icon={<Type className="w-4 h-4" />} label="Text" />
                                    <ToolButton active={activeTool === 'whiteout'} onClick={() => addElement('whiteout')} icon={<Eraser className="w-4 h-4" />} label="Mask" />
                                    <ToolButton onClick={() => addElement('shape', { shapeType: 'rectangle' })} icon={<Square className="w-4 h-4" />} label="Rect" />
                                    <ToolButton onClick={() => addElement('shape', { shapeType: 'circle' })} icon={<Circle className="w-4 h-4" />} label="Circle" />
                                    <label className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-all text-gray-500">
                                        <Upload className="w-4 h-4 mb-1" />
                                        <span className="text-[10px] uppercase font-bold">Image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </Card>

                            {/* Property Editor */}
                            {(activeElement || activeTool !== 'select') && (
                                <Card className="p-4 space-y-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Properties</h4>
                                    <div className="space-y-3">
                                        {activeElement?.type !== 'whiteout' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Color</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#FFFFFF'].map(color => (
                                                        <button
                                                            key={color}
                                                            className={cn("w-6 h-6 rounded-full border transition-all", (activeElement?.color === color || currentColor === color) && "ring-2 ring-primary ring-offset-2 scale-110")}
                                                            style={{ backgroundColor: color }}
                                                            onClick={() => activeElement ? updateElement(activeElement.id, { color }) : setCurrentColor(color)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeElement?.type === 'text' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Font Size</label>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateElement(activeElement.id, { fontSize: Math.max(8, (activeElement.fontSize || 12) - 2) })}><Minus className="w-3 h-3" /></Button>
                                                    <span className="text-sm font-medium w-8 text-center">{activeElement.fontSize}</span>
                                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateElement(activeElement.id, { fontSize: (activeElement.fontSize || 12) + 2 })}><Plus className="w-3 h-3" /></Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {activeElement && <Button variant="ghost" size="sm" className="w-full text-red-500 hover:bg-red-50" onClick={() => removeElement(activeElement.id)}><Trash2 className="w-3 h-3 mr-2" /> Delete</Button>}
                                </Card>
                            )}

                            <div className="mt-auto space-y-3">
                                <Button className="w-full h-12 shadow-lg" onClick={handleApply} isLoading={isProcessing} disabled={elements.length === 0}>Save PDF Changes</Button>
                                <Button variant="ghost" className="w-full text-gray-400" onClick={() => setFile(null)}>Cancel</Button>
                            </div>
                        </div>

                        {/* Viewport */}
                        <div className="flex-1 bg-gray-100 rounded-2xl flex flex-col overflow-hidden border border-gray-200 shadow-inner relative">
                            <div className="h-14 bg-white border-b flex items-center justify-between px-6 z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                                        <div className="px-3 text-xs font-bold text-gray-600 min-w-[60px] flex items-center justify-center">{currentPage} / {totalPages || '?'}</div>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                                        <span className="text-[10px] font-bold text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setScale(s => Math.min(2, s + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-12 flex justify-center items-start custom-scrollbar">
                                <div ref={previewContainerRef} className="relative shadow-2xl transition-all duration-300 transform-gpu" style={{ width: 'fit-content', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                                    <PdfPreview file={file} pageNumber={currentPage} onLoadSuccess={setTotalPages} className="rounded-lg overflow-hidden" />
                                    <div className="absolute inset-0 pointer-events-none z-30">
                                        {elements.filter(el => el.pageIndex === currentPage - 1).map(el => (
                                            <EditableElement key={el.id} el={el} active={activeElementId === el.id} onSelect={() => setActiveElementId(el.id)} onUpdate={(updates) => updateElement(el.id, updates)} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {resultPdfUrl && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-40 flex items-center justify-center p-8">
                                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full text-center space-y-6">
                                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                                        <h3 className="text-2xl font-bold">PDF Updated!</h3>
                                        <p className="text-gray-500">Your edits have been applied successfully.</p>
                                        <div className="flex gap-3">
                                            <a href={resultPdfUrl} download={`edited_${file.name}`} className="flex-1"><Button className="w-full">Download</Button></a>
                                            <Button variant="ghost" onClick={() => setResultPdfUrl(null)}>Close</Button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>
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

const EditableElement = ({ el, active, onSelect, onUpdate }: { el: EditElement, active: boolean, onSelect: () => void, onUpdate: (updates: Partial<EditElement>) => void }) => {
    const elRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditingText, setIsEditingText] = useState(false);
    const [resizeDir, setResizeDir] = useState<string | null>(null);

    if (el.redact) return null;

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

    return (
        <div
            ref={elRef}
            className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-shadow",
                active ? "z-30 ring-2 ring-primary bg-primary/5" : "z-20",
                el.existing && "hover:bg-primary/5"
            )}
            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%` }}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => el.type === 'text' && setIsEditingText(true)}
        >
            <div className={cn("w-full h-full flex items-center justify-center relative", el.type === 'whiteout' && "bg-white shadow-inner")}>
                {el.type === 'text' && (
                    isEditingText ?
                        <textarea autoFocus className="text-center outline-none bg-transparent resize-none w-full" style={{ color: el.color, fontSize: `${el.fontSize}px` }} value={el.content} onChange={e => onUpdate({ content: e.target.value })} onBlur={() => setIsEditingText(false)} /> :
                        <p style={{ color: el.color, fontSize: `${el.fontSize}px` }} className="text-center wrap-break-word">{el.content}</p>
                )}
                {el.type === 'image' && <img src={el.content} className="w-full h-full object-contain pointer-events-none" />}
                {el.type === 'drawing' && <img src={el.content} className="w-full h-full object-contain pointer-events-none" />}
                {el.type === 'shape' && (
                    <div style={{ width: '100%', height: '100%', border: `${el.strokeWidth}px solid ${el.color}`, borderRadius: el.shapeType === 'circle' ? '50%' : '0' }} />
                )}
            </div>
            {active && handles.map(h => (
                <div key={h} className={cn("absolute w-2.5 h-2.5 bg-white border border-primary z-40 rounded-full", h === 'nw' && "-top-1 -left-1", h === 'n' && "-top-1 left-1/2 -translate-x-1/2", h === 'ne' && "-top-1 -right-1", h === 'e' && "top-1/2 -right-1 -translate-y-1/2", h === 'se' && "-bottom-1 -right-1", h === 's' && "-bottom-1 left-1/2 -translate-x-1/2", h === 'sw' && "-bottom-1 -left-1", h === 'w' && "top-1/2 -left-1 -translate-y-1/2")} onMouseDown={e => handleResizeStart(e, h)} />
            ))}
        </div>
    );
};
