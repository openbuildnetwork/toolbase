
"use client";

import React, { useState, useEffect } from "react";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { Button } from "@/components/ui/Button";
import { useImageCompressor } from "@/hooks/useImageCompressor";
import { Download, RefreshCw, Zap, ShieldCheck, ImagePlus, ChevronRight, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBytes } from "@/lib/utils";

// Feature Components
import { ImagePreview } from "@/components/features/image-compressor/ImagePreview";
import { CompressionSettings } from "@/components/features/image-compressor/CompressionSettings";

export default function ImageCompressorPage() {
    const { isReady, isProcessing, error, compressImage, getImageInfo } = useImageCompressor();
    
    // State
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [originalInfo, setOriginalInfo] = useState<any>(null);
    
    const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
    const [compressedInfo, setCompressedInfo] = useState<any>(null);
    
    // Settings use dedicated state for UI responsiveness
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

    // Auto-compress removed. Manual trigger only.

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
                setFormat("JPEG"); 
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
        <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800 pb-20">
            
            {/* Header / Nav */}
            <nav className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                            <Zap className="w-5 h-5 fill-white" />
                         </div>
                        <span className="font-bold text-lg tracking-tight">PixelSqueeze</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100/50 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Client-Side Secure</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {!originalFile ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-2xl mx-auto mt-20"
                        >
                            <div className="text-center mb-10 space-y-4">
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                                    Compress Images <br/>
                                    <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-violet-600">Without Quality Loss</span>
                                </h1>
                                <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                                    Professional grade compression powered by WebAssembly. 
                                    Photos never leave your device.
                                </p>
                            </div>

                            <div className="p-1.5 bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 border border-gray-100">
                                <FileDropZone
                                    onFileSelected={(file) => handleFileSelect(file ? [file] : [])}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="border-2 border-dashed border-gray-200 rounded-[28px] bg-gray-50/50 hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-300 min-h-[300px]"
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]"
                        >
                            {/* Left Panel: Preview (Takes up most space) */}
                            <div className="lg:col-span-8 flex flex-col h-full gap-4">
                                <div className="flex-1 bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-white p-2">
                                    <div className="w-full h-full rounded-[24px] overflow-hidden bg-gray-50 relative">
                                        <ImagePreview 
                                            originalUrl={originalUrl}
                                            compressedUrl={compressedUrl}
                                            originalInfo={originalInfo}
                                            compressedInfo={compressedInfo}
                                            isProcessing={isProcessing}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Settings Sidebar */}
                            <div className="lg:col-span-4 flex flex-col gap-6">
                                <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-white flex-1">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2.5 bg-gray-50 rounded-xl">
                                            <Settings2 className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Config</h3>
                                            <p className="text-xs text-gray-500">Fine-tune your output</p>
                                        </div>
                                    </div>

                                    <CompressionSettings 
                                        quality={quality}
                                        setQuality={setQuality}
                                        format={format}
                                        setFormat={setFormat}
                                        resizeFactor={resizeFactor}
                                        setResizeFactor={setResizeFactor}
                                        isProcessing={isProcessing}
                                    />
                                </div>

                                {/* Actions Card */}
                                <div className="bg-slate-900 rounded-[24px] p-5 shadow-2xl shadow-slate-900/20 text-white space-y-4">
                                    <div className="flex justify-between items-center opacity-80 text-sm">
                                         <span>Ready to save?</span>
                                         {compressedInfo && (
                                            <span className="font-mono text-emerald-400">
                                                {formatBytes(compressedInfo.size_bytes)}
                                            </span>
                                         )}
                                    </div>
                                    <Button 
                                        onClick={handleCompress}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-12 font-bold shadow-lg shadow-blue-900/20 border-0 mb-3"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Compressing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4 mr-2" />
                                                Compress Now
                                            </>
                                        )}
                                    </Button>

                                    <Button 
                                        onClick={downloadImage}
                                        className="w-full bg-white text-slate-900 hover:bg-gray-100 rounded-xl h-12 font-bold shadow-none border-0"
                                        disabled={!compressedUrl}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Image
                                    </Button>
                                    <button 
                                        onClick={() => setOriginalFile(null)}
                                        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors py-2"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Compress Another
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
