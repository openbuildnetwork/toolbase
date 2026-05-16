"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { 
    Upload, 
    Trash2, 
    Download, 
    Maximize2, 
    Layers, 
    Wand2, 
    ArrowRight, 
    Sparkles,
    CheckCircle2,
    History,
    Shield,
    Zap,
    Image as ImageIcon,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { cn } from "@/lib/utils";
import { removeBackground, Config } from '@imgly/background-removal';

interface ProcessedImage {
    id: string;
    originalUrl: string;
    processedUrl: string | null;
    status: 'idle' | 'processing' | 'completed' | 'error';
    name: string;
    size: number;
    file?: File;
}

export default function BgRemoverView() {
    const [images, setImages] = useState<ProcessedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [showComparison, setShowComparison] = useState<string | null>(null);
    const [processingCount, setProcessingCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-process queue
    useEffect(() => {
        const processQueue = async () => {
            const nextImage = images.find(img => img.status === 'idle');
            if (!nextImage) return;

            setImages(prev => prev.map(img => 
                img.id === nextImage.id ? { ...img, status: 'processing' } : img
            ));
            setProcessingCount(prev => prev + 1);

            try {
                const config: Config = {
                    progress: (status, progress) => {
                        console.log(`Processing ${status}: ${Math.round(progress * 100)}%`);
                    },
                    output: {
                        format: 'image/png',
                        quality: 0.8
                    }
                };

                const blob = await removeBackground(nextImage.file || nextImage.originalUrl, config);
                const processedUrl = URL.createObjectURL(blob);

                setImages(prev => prev.map(img => 
                    img.id === nextImage.id ? { ...img, status: 'completed', processedUrl } : img
                ));
            } catch (error) {
                console.error('Background removal failed:', error);
                setImages(prev => prev.map(img => 
                    img.id === nextImage.id ? { ...img, status: 'error' } : img
                ));
            } finally {
                setProcessingCount(prev => Math.max(0, prev - 1));
            }
        };

        if (processingCount < 2) { // Process up to 2 images concurrently
            processQueue();
        }
    }, [images, processingCount]);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (files: File[]) => {
        const newImages: ProcessedImage[] = files
            .filter(file => file.type.startsWith('image/'))
            .map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                originalUrl: URL.createObjectURL(file),
                processedUrl: null,
                status: 'idle',
                name: file.name,
                size: file.size,
                file
            }));

        setImages(prev => [...newImages, ...prev]);
    };

    const removeImage = (id: string) => {
        setImages(prev => {
            const img = prev.find(i => i.id === id);
            if (img) {
                URL.revokeObjectURL(img.originalUrl);
                if (img.processedUrl) URL.revokeObjectURL(img.processedUrl);
            }
            return prev.filter(i => i.id !== id);
        });
    };

    const downloadImage = (img: ProcessedImage) => {
        if (!img.processedUrl) return;
        const link = document.createElement('a');
        link.href = img.processedUrl;
        link.download = `no-bg-${img.name.split('.')[0]}.png`;
        link.click();
    };

    const stats = {
        total: images.length,
        completed: images.filter(i => i.status === 'completed').length,
        processing: images.filter(i => i.status === 'processing').length,
    };

    return (
        <div className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary">
            {/* Header Section */}
            <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border-subtle px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-text-primary leading-none">Background Remover</h1>
                        <p className="text-xs text-text-muted mt-1 font-medium">In-browser AI Processing</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {stats.total > 0 && (
                        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-surface-secondary rounded-full border border-border-subtle">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-text-secondary">{stats.completed} Done</span>
                            </div>
                            <div className="w-px h-3 bg-border-medium" />
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full bg-primary", stats.processing > 0 && "animate-pulse")} />
                                <span className="text-xs font-bold text-text-secondary">{stats.processing} Processing</span>
                            </div>
                        </div>
                    )}
                    <ReturnToToolsButton />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Hero / Upload Zone */}
                <div 
                    className={cn(
                        "relative group mb-12",
                        "rounded-[2.5rem] border-2 border-dashed transition-all duration-500",
                        isDragging 
                            ? "border-primary bg-primary/5 scale-[0.99]" 
                            : "border-border-medium bg-surface-overlay hover:border-primary/50 hover:bg-primary/5"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const files = Array.from(e.dataTransfer.files);
                        handleFiles(files);
                    }}
                >
                    <div className="relative z-10 px-8 py-16 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6 group-hover:scale-105 transition-transform">
                            <Sparkles className="w-3 h-3" />
                            New: High-Res Export
                        </div>
                        
                        <div className="relative mb-8 inline-block">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative w-20 h-20 mx-auto rounded-[2rem] bg-linear-to-br from-primary to-primary-hover flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:rotate-6 transition-transform">
                                <Upload className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-text-primary mb-3">Drop images to start</h2>
                        <p className="text-text-muted mb-8 max-w-sm mx-auto text-sm leading-relaxed font-medium">
                            Remove backgrounds from multiple images at once. 
                            Processing happens 100% locally for maximum privacy.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button 
                                onClick={() => fileInputRef.current?.click()}
                                size="lg"
                                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/25 border-0 group/btn"
                            >
                                <ImageIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Select Images
                                <span className="ml-2 px-2 py-0.5 rounded-md bg-white/20 text-[10px]">Free</span>
                            </Button>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={onFileSelect}
                            />
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-8 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Privacy First</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">GPU Accelerated</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Batch Ready</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid of Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {images.map((img) => (
                        <Card 
                            key={img.id}
                            className="group/card relative overflow-hidden bg-surface-overlay border-border-subtle hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem]"
                        >
                            {/* Comparison View */}
                            <div className="relative aspect-square bg-surface-secondary overflow-hidden">
                                <div className="absolute inset-0 bg-[url('/assets/images/checkerboard.png')] opacity-20" />
                                
                                {img.status === 'completed' && img.processedUrl ? (
                                    <div className="relative h-full w-full">
                                        <Image 
                                            src={img.processedUrl}
                                            alt="Processed"
                                            fill
                                            className="object-contain p-4 z-10"
                                        />
                                        <Image 
                                            src={img.originalUrl}
                                            alt="Original"
                                            fill
                                            className="object-contain p-4 opacity-10 blur-sm scale-95"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative h-full w-full">
                                        <Image 
                                            src={img.originalUrl}
                                            alt="Original"
                                            fill
                                            className={cn(
                                                "object-contain p-4 transition-all duration-700",
                                                img.status === 'processing' && "blur-md scale-95 opacity-50"
                                            )}
                                        />
                                        {img.status === 'processing' && (
                                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                                                        <div className="w-16 h-16 rounded-full border-4 border-t-primary animate-spin" />
                                                    </div>
                                                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse">
                                                        Removing Background...
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Card Actions Overly */}
                                <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 translate-x-12 opacity-0 group-hover/card:translate-x-0 group-hover/card:opacity-100 transition-all duration-300">
                                    <button 
                                        onClick={() => removeImage(img.id)}
                                        className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white backdrop-blur-md border border-red-500/20 transition-all flex items-center justify-center"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {img.status === 'completed' && (
                                        <>
                                            <button 
                                                onClick={() => setShowComparison(img.id)}
                                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-primary text-text-primary hover:text-white backdrop-blur-md border border-white/20 transition-all flex items-center justify-center"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => downloadImage(img)}
                                                className="w-10 h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white backdrop-blur-md border border-emerald-500/20 transition-all flex items-center justify-center"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Footer Info */}
                            <div className="p-5 border-t border-border-subtle bg-surface-elevated/30">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-text-primary truncate max-w-[180px]">{img.name}</h4>
                                    <span className="text-[10px] font-bold text-text-muted bg-surface-secondary px-2 py-0.5 rounded-md border border-border-subtle">
                                        {(img.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {img.status === 'completed' ? (
                                        <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Ready to save
                                        </div>
                                    ) : img.status === 'error' ? (
                                        <div className="text-red-500 text-[10px] font-bold uppercase tracking-wider">
                                            Processing failed
                                        </div>
                                    ) : (
                                        <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <History className="w-3 h-3 animate-spin" />
                                            In Queue...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Empty State */}
                {images.length === 0 && (
                    <div className="text-center py-20 bg-surface-secondary/30 rounded-[3rem] border border-border-subtle border-dashed">
                        <ImageIcon className="w-16 h-16 text-text-faint mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-text-secondary mb-2">No images uploaded yet</h3>
                        <p className="text-sm text-text-muted font-medium">Your processed images will appear here</p>
                    </div>
                )}
            </main>

            {/* Lightbox / Comparison Modal */}
            {showComparison && (() => {
                const img = images.find(i => i.id === showComparison);
                if (!img || !img.processedUrl) return null;

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
                        <div className="absolute inset-0 bg-surface/95 backdrop-blur-2xl" onClick={() => setShowComparison(null)} />
                        
                        <div className="relative w-full max-w-6xl aspect-video bg-surface-secondary rounded-[2.5rem] overflow-hidden border border-border-subtle shadow-2xl">
                            <div className="absolute inset-0 bg-[url('/assets/images/checkerboard.png')] opacity-30" />
                            
                            <div className="flex h-full">
                                <div className="flex-1 relative border-r border-border-subtle group/side">
                                    <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest">
                                        Before
                                    </div>
                                    <Image 
                                        src={img.originalUrl}
                                        alt="Original"
                                        fill
                                        className="object-contain p-8"
                                    />
                                </div>
                                <div className="flex-1 relative group/side">
                                    <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-primary/80 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest">
                                        After
                                    </div>
                                    <Image 
                                        src={img.processedUrl}
                                        alt="Processed"
                                        fill
                                        className="object-contain p-8"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowComparison(null)}
                                className="absolute top-6 right-6 z-20 w-12 h-12 rounded-2xl bg-surface border border-border-subtle text-text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-xl"
                            >
                                <ArrowRight className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
