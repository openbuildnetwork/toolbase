"use strict";
"use client";

import React, { useState, useEffect } from "react";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useImageCompressor } from "@/hooks/useImageCompressor";
import { formatBytes } from "@/lib/utils";
import { Download, Image as ImageIcon, RefreshCw, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageCompressorPage() {
    const { isReady, isProcessing, error, compressImage, getImageInfo } = useImageCompressor();
    
    // State
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [originalInfo, setOriginalInfo] = useState<any>(null);
    
    const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
    const [compressedInfo, setCompressedInfo] = useState<any>(null);
    
    // Settings
    const [quality, setQuality] = useState(80);
    const [format, setFormat] = useState("JPEG");
    const [resizeFactor, setResizeFactor] = useState(1.0);

    // Cleanup URLs
    useEffect(() => {
        return () => {
            if (originalUrl) URL.revokeObjectURL(originalUrl);
            if (compressedUrl) URL.revokeObjectURL(compressedUrl);
        };
    }, [originalUrl, compressedUrl]);

    const handleFileSelect = async (files: File[]) => {
        if (files.length === 0) return;
        const file = files[0];
        
        // Reset previous state
        if (originalUrl) URL.revokeObjectURL(originalUrl);
        if (compressedUrl) URL.revokeObjectURL(compressedUrl);
        setCompressedUrl(null);
        setCompressedInfo(null);
        
        setOriginalFile(file);
        setOriginalUrl(URL.createObjectURL(file));
        
        try {
            const info = await getImageInfo(file) as any;
            setOriginalInfo(info);
            
            // Auto-set format to match original if valid
            if (info.format && ["JPEG", "PNG", "WEBP"].includes(info.format)) {
                setFormat(info.format);
            } else {
                setFormat("JPEG"); // Default
            }

        } catch (err) {
            console.error("Failed to get image info", err);
        }
    };

    const handleCompress = async () => {
        if (!originalFile) return;
        
        try {
            const result = await compressImage(originalFile, {
                quality,
                format,
                resizeFactor
            });
            
            // Result is a Uint8Array (bytes)
            const blob = new Blob([result as BlobPart], { type: `image/${format.toLowerCase()}` });
            const url = URL.createObjectURL(blob);
            
            if (compressedUrl) URL.revokeObjectURL(compressedUrl);
            setCompressedUrl(url);
            
            setCompressedInfo({
                size_bytes: blob.size,
                width: originalInfo?.width ? Math.round(originalInfo.width * resizeFactor) : 0,
                height: originalInfo?.height ? Math.round(originalInfo.height * resizeFactor) : 0,
            });
            
        } catch (err) {
            console.error("Compression failed", err);
        }
    };

    const downloadImage = () => {
        if (!compressedUrl) return;
        const link = document.createElement('a');
        link.href = compressedUrl;
        const ext = format.toLowerCase();
        link.download = `compressed-image.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto space-y-10">
                
                {/* Header */}
                <header className="space-y-4 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <ImageIcon className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Image Compressor</h1>
                                <p className="text-slate-500 font-medium mt-1">Professional-grade compression. 100% Private.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100/50 shadow-sm">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Client-Side Secure</span>
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {!originalFile ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="border-dashed border-2 bg-white/50 backdrop-blur-sm">
                                <CardContent className="pt-12 pb-12">
                                    <FileDropZone
                                        onFileSelected={(file) => handleFileSelect(file ? [file] : [])}
                                        accept="image/png, image/jpeg, image/webp"
                                        className="border-none bg-transparent"
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                        >
                            {/* Left Panel: Settings */}
                            <div className="lg:col-span-4 space-y-6">
                                <Card className="bg-white shadow-sm border-gray-100/50">
                                    <CardHeader>
                                        <CardTitle>Compression Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-sm font-semibold text-slate-700">Quality</label>
                                                <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{quality}%</span>
                                            </div>
                                            <Slider
                                                min={1}
                                                max={100}
                                                value={quality}
                                                onChange={(e) => setQuality(Number(e.target.value))}
                                                className="accent-blue-600"
                                            />
                                            <p className="text-xs text-slate-400">Lower quality = smaller file size</p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-slate-700">Output Format</label>
                                            <Select
                                                value={format}
                                                onChange={(e) => setFormat(e.target.value)}
                                                className="bg-gray-50 border-gray-200"
                                            >
                                                <option value="JPEG">JPEG (Best for photos)</option>
                                                <option value="PNG">PNG (Lossless)</option>
                                                <option value="WEBP">WEBP (Modern & Efficient)</option>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <label className="text-sm font-semibold text-slate-700">Resize</label>
                                                <span className="text-sm font-mono text-slate-500">{Math.round(resizeFactor * 100)}%</span>
                                            </div>
                                            <Slider
                                                min={0.1}
                                                max={1.0}
                                                step={0.1}
                                                value={resizeFactor}
                                                onChange={(e) => setResizeFactor(Number(e.target.value))}
                                            />
                                        </div>

                                        <div className="pt-4 flex gap-3">
                                            <Button 
                                                onClick={handleCompress} 
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 shadow-lg shadow-blue-600/20"
                                                disabled={!isReady || isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        Compressing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-4 h-4 mr-2" />
                                                        Compress
                                                    </>
                                                )}
                                            </Button>
                                            <Button 
                                                variant="outline"
                                                onClick={() => setOriginalFile(null)}
                                                className="px-4 rounded-xl border-gray-200 hover:bg-gray-50"
                                            >
                                                New
                                            </Button>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                                {error}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Panel: Preview */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Original */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Original</span>
                                            {originalInfo && (
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                    {formatBytes(originalInfo.size_bytes)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-checkered border border-gray-200 shadow-sm group">
                                            {originalUrl && (
                                                <img 
                                                    src={originalUrl} 
                                                    alt="Original" 
                                                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" 
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Compressed */}
                                    <div className="space-y-3">
                                         <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                                Compressed
                                                {compressedInfo && (
                                                     <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                                        -{Math.round((1 - compressedInfo.size_bytes / originalInfo.size_bytes) * 100)}%
                                                     </span>
                                                )}
                                            </span>
                                            {compressedInfo && (
                                                <span className="text-xs font-mono bg-blue-50 px-2 py-1 rounded text-blue-700 font-bold border border-blue-100">
                                                    {formatBytes(compressedInfo.size_bytes)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-checkered border-2 border-dashed border-blue-100 group">
                                            {compressedUrl ? (
                                                <img 
                                                    src={compressedUrl} 
                                                    alt="Compressed" 
                                                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" 
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                    <div className="text-center">
                                                        <ArrowRight className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                        <p className="text-sm">Preview will appear here</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {compressedUrl && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-end pt-4"
                                    >
                                        <Button 
                                            onClick={downloadImage}
                                            className="bg-slate-900 text-white hover:bg-black rounded-xl h-12 px-8 shadow-xl shadow-slate-900/10"
                                        >
                                            <Download className="w-5 h-5 mr-2" />
                                            Download Image
                                        </Button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <style jsx global>{`
                .bg-checkered {
                    background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }
            `}</style>
        </div>
    );
}
