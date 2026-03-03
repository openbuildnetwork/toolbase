import React, { useState, useEffect, useMemo } from "react";
import { FileDropZone } from "@/components/ui/FileDropZone";
import { Button } from "@/components/ui/Button";
import { Download, RefreshCw, Zap, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBytes, cn } from "@/lib/utils";
import { ImagePreview } from "@/components/features/pixel-axe/ImagePreview";
import { CompressionSettings } from "@/components/features/pixel-axe/CompressionSettings";

import { useTIPTool } from "@/hooks/useTIPTool";
import { getImageInfo } from "@/lib/image-utils";


export function CompressImage() {
    // State
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [originalInfo, setOriginalInfo] = useState<any>(null);

    const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
    const [compressedInfo, setCompressedInfo] = useState<any>(null);

    // Engine Hook — config defaults come directly from the TIP schema.
    // This keeps the direct tool and the pipeline node in sync automatically.
    const { execute, isProcessing, error, tool } = useTIPTool('pixel-axe/compress');

    const defaultConfig = useMemo(
        () => Object.fromEntries(
            (tool?.configSchema.fields ?? []).map(f => [f.key, f.default])
        ),
        [tool]
    );

    const [config, setConfig] = useState<Record<string, any>>(defaultConfig);

    /** Update a single config field by key */
    const updateConfig = (key: string, value: any) =>
        setConfig(prev => ({ ...prev, [key]: value }));

    const isReady = true;

    // Seed config from schema defaults on first mount (handles the case where
    // `tool` resolves after initial render due to registry lookup timing).
    const seededRef = React.useRef(false);
    useEffect(() => {
        if (!seededRef.current && Object.keys(defaultConfig).length > 0) {
            setConfig(defaultConfig);
            seededRef.current = true;
        }
    }, [defaultConfig]);

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
            const info = await getImageInfo(file);
            setOriginalInfo(info);

            // Auto-set format to match original if valid, otherwise fall back to JPEG
            const detectedFormat = info.format && ["JPEG", "PNG", "WEBP"].includes(info.format)
                ? info.format
                : "JPEG";
            setConfig(prev => ({ ...prev, format: detectedFormat, resizeFactor: 1.0 }));

        } catch (err) {
            console.error("Failed to get image info", err);
        }
    };

    const handleCompress = async () => {
        if (!originalFile) return;

        try {
            const resultFiles = await execute([originalFile], config);

            if (resultFiles && resultFiles.length > 0) {
                const blob = resultFiles[0];
                const url = URL.createObjectURL(blob);

                if (compressedUrl) URL.revokeObjectURL(compressedUrl);
                setCompressedUrl(url);

                const resizeFactor = Number(config.resizeFactor ?? 1.0);
                setCompressedInfo({
                    size_bytes: blob.size,
                    width: originalInfo?.width ? Math.round(originalInfo.width * resizeFactor) : 0,
                    height: originalInfo?.height ? Math.round(originalInfo.height * resizeFactor) : 0,
                });
            }

        } catch (err) {
            console.error("Compression failed", err);
        }
    };

    const downloadImage = () => {
        if (!compressedUrl) return;
        const link = document.createElement('a');
        link.href = compressedUrl;
        const ext = String(config.format ?? 'jpeg').toLowerCase();
        link.download = `compressed-image.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
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
                            Compress Images <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-violet-600">Without Quality Loss</span>
                        </h1>
                        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                            Professional grade compression powered by WebAssembly.
                            Photos never leave your device.
                        </p>
                    </div>

                    <div className="p-1.5 bg-white rounded-[32px] shadow-2xl shadow-gray-200/50 border border-gray-100 relative">
                        {!isReady && (
                            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[32px]">
                                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                                <p className="text-gray-500 font-medium">Initializing Engine...</p>
                            </div>
                        )}
                        <FileDropZone
                            onFileSelected={(file) => handleFileSelect(file ? [file] : [])}
                            accept="image/png, image/jpeg, image/webp"
                            className={cn(
                                "border-2 border-dashed border-gray-200 rounded-[28px] bg-gray-50/50 transition-all duration-300 min-h-[300px]",
                                isReady ? "hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer" : "cursor-wait opacity-50"
                            )}
                            disabled={!isReady || isProcessing}
                        />
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full"
                >
                    {/* Left Panel: Preview */}
                    <div className="lg:col-span-8 flex flex-col h-full gap-4">
                        <div className="flex-1 bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-white p-2">
                            <div className="w-full h-full rounded-[24px] overflow-hidden bg-gray-50 relative">
                                <ImagePreview
                                    originalUrl={originalUrl}
                                    compressedUrl={compressedUrl}
                                    originalInfo={originalInfo}
                                    compressedInfo={compressedInfo}
                                    isProcessing={isProcessing}
                                    mode="compress"
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
                                    <h3 className="font-bold text-gray-900">Compression</h3>
                                    <p className="text-xs text-gray-500">Optimize file size</p>
                                </div>
                            </div>

                            <CompressionSettings
                                mode="compress"
                                quality={Number(config.quality ?? 80)}
                                setQuality={v => updateConfig('quality', v)}
                                format={String(config.format ?? 'JPEG')}
                                setFormat={v => updateConfig('format', v)}
                                resizeFactor={Number(config.resizeFactor ?? 1.0)}
                                setResizeFactor={v => updateConfig('resizeFactor', v)}
                                enhance={Boolean(config.enhance ?? false)}
                                setEnhance={v => updateConfig('enhance', v)}
                                stripMetadata={config.stripMetadata !== undefined ? Boolean(config.stripMetadata) : true}
                                setStripMetadata={v => updateConfig('stripMetadata', v)}
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
    );
}
