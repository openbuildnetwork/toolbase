'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBase64 } from '@/hooks/useBase64Worker';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { FileDropZone } from '@/components/ui/FileDropZone';
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';
import Editor from '@monaco-editor/react';
import {
    FileText,
    FileCode,
    Loader2,
    AlertCircle,
    Download,
    ArrowRight,
    Settings,
    ChevronDown,
    Sparkles,
    Eye,
    Upload,
    Copy,
    Check,
    Type,
    Binary,
    Image as ImageIcon,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import type { Base64Mode } from '@/types/base64';
import { motion, AnimatePresence } from 'framer-motion';

export default function Base64Page() {
    const {
        process,
        isReady,
        isProcessing,
        result,
        previewText,
        isLargeFile,
        error,
        downloadResult,
        reset,
    } = useBase64();

    // UI State
    const [mode, setMode] = useState<'text' | 'file'>('text');
    const [operation, setOperation] = useState<'encode' | 'decode'>('encode');
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImage, setIsImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    // Decoded Previews
    const [decodedImageUrl, setDecodedImageUrl] = useState<string | null>(null);
    const [decodedPdfUrl, setDecodedPdfUrl] = useState<string | null>(null);
    const [detectedLanguage, setDetectedLanguage] = useState<'text' | 'json' | 'xml' | 'markdown' | 'javascript' | 'html'>('text');
    const [formattedPreview, setFormattedPreview] = useState<string | null>(null);

    // Advanced options
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [urlSafe, setUrlSafe] = useState(false);
    const [addMimeHeader, setAddMimeHeader] = useState(false);
    const [mimeType, setMimeType] = useState('text/plain');
    const [liveMode, setLiveMode] = useState(false);

    const debounceTimerRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleProcess = useCallback(
        async (inputData?: string | Uint8Array) => {
            try {
                // Clean up previous decoded previews
                if (decodedImageUrl) { URL.revokeObjectURL(decodedImageUrl); setDecodedImageUrl(null); }
                if (decodedPdfUrl) { URL.revokeObjectURL(decodedPdfUrl); setDecodedPdfUrl(null); }
                setFormattedPreview(null);
                setDetectedLanguage('text');

                let processMode: Base64Mode;
                let data: string | number[];

                if (mode === 'text') {
                    const textData = inputData || inputText;
                    if (!textData || typeof textData !== 'string') return;

                    processMode = operation === 'encode' ? 'text_encode' : 'text_decode';
                    data = textData;
                } else {
                    if (!selectedFile && !inputData) return;

                    const fileData = inputData || (await selectedFile!.arrayBuffer());
                    const uint8Array = new Uint8Array(fileData as ArrayBuffer);

                    if (operation === 'encode') {
                        processMode = 'file_encode';
                        data = Array.from(uint8Array);
                    } else {
                        processMode = 'file_decode';
                        const decoder = new TextDecoder();
                        data = decoder.decode(uint8Array);
                    }
                }

                const result = await process({
                    mode: processMode,
                    data,
                    url_safe: urlSafe,
                    mime_type: addMimeHeader ? mimeType : '',
                });

                // After processing, detect format if it's a decode operation
                if (operation === 'decode' && result.success) {
                    let bytes: Uint8Array | null = null;
                    if (Array.isArray(result.result)) {
                        bytes = new Uint8Array(result.result);
                    } 

                    if (bytes && bytes.length > 0) {
                        // 1. Binary Detection (Image, PDF)
                        let detectedMimeType = null;
                        if (bytes.length >= 4) {
                            if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) detectedMimeType = 'image/png';
                            else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) detectedMimeType = 'image/jpeg';
                            else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) detectedMimeType = 'image/gif';
                            else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes.length >= 12 && bytes[8] === 0x57) detectedMimeType = 'image/webp';
                            else if (bytes[0] === 0x42 && bytes[1] === 0x4D) detectedMimeType = 'image/bmp';
                            else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) detectedMimeType = 'application/pdf';
                        }

                        if (detectedMimeType) {
                            const blob = new Blob([bytes], { type: detectedMimeType });
                            const url = URL.createObjectURL(blob);
                            if (detectedMimeType === 'application/pdf') setDecodedPdfUrl(url);
                            else setDecodedImageUrl(url);
                        } else {
                            // 2. Text-based format detection
                            const decoder = new TextDecoder();
                            try {
                                const text = decoder.decode(bytes);
                                detectTextFormat(text);
                            } catch (err) {
                                // Fallback to raw bytes
                                setDetectedLanguage('text');
                            }
                        }
                    } else if (typeof result.result === 'string') {
                        // Text mode decode result might be a string already in some hook versions
                        detectTextFormat(result.result);
                    }
                }
            } catch (err) {
                console.error('Processing error:', err);
            }
        },
        [mode, operation, inputText, selectedFile, urlSafe, addMimeHeader, mimeType, process, decodedImageUrl, decodedPdfUrl]
    );

    const detectTextFormat = (text: string) => {
        const trimmed = text.trim();
        
        // JSON detection
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                const parsed = JSON.parse(trimmed);
                setFormattedPreview(JSON.stringify(parsed, null, 4));
                setDetectedLanguage('json');
                return;
            } catch (e) { /* ignore */ }
        }

        // XML/HTML detection
        if (trimmed.startsWith('<')) {
            if (trimmed.toLowerCase().startsWith('<!doctype html') || trimmed.toLowerCase().includes('<html')) {
                setDetectedLanguage('html');
            } else {
                setDetectedLanguage('xml');
            }
            return;
        }

        // Markdown detection (Heuristic)
        if (
            trimmed.startsWith('# ') || 
            trimmed.includes('\n# ') || 
            (trimmed.includes('**') && trimmed.includes('**')) ||
            (trimmed.includes('[') && trimmed.includes(']('))
        ) {
            setDetectedLanguage('markdown');
            return;
        }

        setDetectedLanguage('text');
    };

    useEffect(() => {
        if (liveMode && mode === 'text' && inputText && isReady) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => handleProcess(), 500);
        }
        return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
    }, [liveMode, mode, inputText, isReady, handleProcess]);

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            if (decodedImageUrl) URL.revokeObjectURL(decodedImageUrl);
            if (decodedPdfUrl) URL.revokeObjectURL(decodedPdfUrl);
        };
    }, [imagePreview, decodedImageUrl, decodedPdfUrl]);

    const handleFileSelected = (file: File | null) => {
        setSelectedFile(file);
        reset();
        if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
        if (file) {
            const isImageFile = file.type.startsWith('image/');
            setIsImage(isImageFile);
            if (isImageFile && operation === 'encode') {
                const previewUrl = URL.createObjectURL(file);
                setImagePreview(previewUrl);
            }
            if (operation === 'encode') setMimeType(file.type || 'application/octet-stream');
        } else {
            setIsImage(false);
        }
    };

    const handleModeChange = (newMode: 'text' | 'file') => {
        setMode(newMode);
        reset();
        setInputText('');
        setSelectedFile(null);
        if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
        if (decodedImageUrl) { URL.revokeObjectURL(decodedImageUrl); setDecodedImageUrl(null); }
        if (decodedPdfUrl) { URL.revokeObjectURL(decodedPdfUrl); setDecodedPdfUrl(null); }
        setFormattedPreview(null);
        setDetectedLanguage('text');
        setIsImage(false);
    };

    const handleOperationChange = (newOperation: 'encode' | 'decode') => {
        setOperation(newOperation);
        reset();
    };

    const handleDownload = () => {
        if (mode === 'text') {
            downloadResult(`base64_${operation}.txt`);
        } else {
            const baseFilename = selectedFile?.name.replace(/\.[^/.]+$/, '') || 'file';
            const ext = operation === 'encode' ? 'txt' : (selectedFile?.name.split('.').pop() || 'bin');
            downloadResult(`${baseFilename}_${operation}.${ext}`);
        }
    };

    // Correct accept attribute based on what we can preview
    const acceptedFiles = useMemo(() => {
        if (operation === 'decode') return '.txt,.b64';
        return 'image/*,application/pdf,application/json,text/markdown,text/plain,application/xml,text/xml,.md,.json,.xml,.txt,.csv,.yaml,.yml';
    }, [operation]);

    return (
        <div className="min-h-screen bg-(--background) py-6 px-4">
            <div className="max-w-[1800px] mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Binary className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Base64 Converter</h1>
                            <p className="text-sm text-gray-500 font-medium">Encode or decode text and files instantly</p>
                        </div>
                    </div>
                    <ReturnToToolsButton />
                </div>

                {/* Controls Bar */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex gap-2 p-1 bg-(--surface) rounded-lg border border-(--border) shadow-sm">
                        <button onClick={() => handleModeChange('text')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'text' ? 'bg-primary text-white shadow' : 'text-(--foreground) opacity-60 hover:opacity-100 hover:bg-(--surface-secondary)'}`}><FileText className="h-4 w-4" />Text</button>
                        <button onClick={() => handleModeChange('file')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'file' ? 'bg-primary text-white shadow' : 'text-(--foreground) opacity-60 hover:opacity-100 hover:bg-(--surface-secondary)'}`}><FileCode className="h-4 w-4" />File</button>
                    </div>

                    <div className="flex gap-2 p-1 bg-(--surface) rounded-lg border border-(--border) shadow-sm">
                        <button onClick={() => handleOperationChange('encode')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${operation === 'encode' ? 'bg-primary text-white shadow' : 'text-(--foreground) opacity-60 hover:opacity-100 hover:bg-(--surface-secondary)'}`}>Encode</button>
                        <button onClick={() => handleOperationChange('decode')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${operation === 'decode' ? 'bg-primary text-white shadow' : 'text-(--foreground) opacity-60 hover:opacity-100 hover:bg-(--surface-secondary)'}`}>Decode</button>
                    </div>

                    {mode === 'text' && (
                        <label className="flex items-center gap-2 px-3 py-2 bg-(--surface) rounded-lg border border-(--border) shadow-sm cursor-pointer hover:bg-(--surface-secondary) transition-colors">
                            <Switch checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} />
                            <span className="text-sm font-medium text-(--foreground)">Live</span>
                        </label>
                    )}

                    <label className="flex items-center gap-2 px-3 py-2 bg-(--surface) rounded-lg border border-(--border) shadow-sm cursor-pointer hover:bg-(--surface-secondary) transition-colors">
                        <Switch checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
                        <span className="text-sm font-medium text-(--foreground)">URL Safe</span>
                    </label>

                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 px-3 py-2 bg-(--surface) rounded-lg border border-(--border) shadow-sm text-sm font-medium text-(--foreground) hover:bg-(--surface-secondary) transition-colors">
                        <Settings className="h-4 w-4" />Advanced<ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <Button onClick={() => handleProcess()} disabled={!isReady || isProcessing || (mode === 'text' && !inputText) || (mode === 'file' && !selectedFile)} className="ml-auto" isLoading={isProcessing}>
                        {operation === 'encode' ? 'Encode' : 'Decode'}<ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>

                {/* Advanced Options */}
                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                            <Card className="p-4 bg-(--surface) border border-(--border)"><div className="flex items-center gap-3"><Switch checked={addMimeHeader} onChange={(e) => setAddMimeHeader(e.target.checked)} /><Label className="font-medium text-(--foreground)">Add MIME Header</Label>{addMimeHeader && (<Input value={mimeType} onChange={(e) => setMimeType(e.target.value)} placeholder="e.g., text/plain" className="max-w-xs" />)}</div></Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-240px)] min-h-[600px]">
                    {/* LEFT: INPUT */}
                    <Card className="flex flex-col bg-(--surface) border border-(--border) shadow-lg text-(--foreground) overflow-hidden">
                        <div className="p-4 border-b border-(--border) flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-xs font-bold">1</span>Input</h2>
                            <span className="text-xs opacity-50">{mode === 'text' ? 'Text Mode' : 'File Mode'}</span>
                        </div>
                        <div className="flex-1 p-0 relative">
                            {mode === 'text' ? (
                                <Editor
                                    height="100%"
                                    defaultLanguage="text"
                                    theme="vs-dark"
                                    value={inputText}
                                    onChange={(val) => setInputText(val || '')}
                                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', padding: { top: 16 } }}
                                />
                            ) : (
                                <div className="p-4 h-full overflow-auto space-y-4">
                                    <FileDropZone onFileSelected={handleFileSelected} accept={acceptedFiles} />
                                    {selectedFile && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                                                <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded"><FileText className="h-4 w-4 text-primary" /></div><div><p className="font-medium text-sm">{selectedFile.name}</p><p className="text-xs opacity-60">{formatFileSize(selectedFile.size)}</p></div></div>
                                                <Button variant="ghost" size="sm" onClick={() => handleFileSelected(null)} className="text-red-500 hover:bg-red-500/10">Remove</Button>
                                            </div>
                                            {imagePreview && (
                                                <div className="p-4 bg-(--surface-secondary) rounded-lg border border-(--border) flex flex-col items-center">
                                                    <p className="text-xs font-semibold opacity-30 mb-3 self-start uppercase tracking-wider">Image Preview</p>
                                                    <img src={imagePreview} alt="Preview" className="max-h-64 rounded shadow-lg object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* RIGHT: OUTPUT */}
                    <Card className="flex flex-col glass-card border border-(--border) shadow-lg text-(--foreground) overflow-hidden">
                        <div className="p-4 border-b border-(--border) flex items-center justify-between">
                            <h2 className="font-semibold flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 bg-green-500/10 text-green-700 rounded-full text-xs font-bold">2</span>Output</h2>
                            <div className="flex items-center gap-2">
                                {result?.success && (
                                    <>
                                        <span className="text-xs opacity-50 mr-2">{formatFileSize(result.size || 0)}</span>
                                        {!isLargeFile && result.result && <CopyToClipboard text={typeof result.result === 'string' ? result.result : (formattedPreview || previewText)} showText={false} />}
                                        <Button variant="ghost" size="sm" onClick={handleDownload}><Download className="h-4 w-4" /></Button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 p-0 relative">
                            {error ? (
                                <div className="p-4 h-full flex items-center justify-center">
                                    <div className="max-w-md w-full p-4 bg-red-500/5 border-2 border-red-500/20 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" /><div><p className="font-semibold text-red-500">Processing Error</p><p className="text-sm text-red-500/90 mt-1">{error}</p></div>
                                    </div>
                                </div>
                            ) : result?.success ? (
                                decodedImageUrl ? (
                                    <div className="p-6 h-full overflow-auto flex flex-col items-center">
                                        <div className="w-full mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-2 uppercase tracking-widest"><Eye className="h-3 w-3" /> Image Output</div>
                                        <img src={decodedImageUrl} alt="Decoded" className="max-w-full max-h-[80%] rounded shadow-2xl border border-(--border) object-contain mt-auto mb-auto" />
                                    </div>
                                ) : decodedPdfUrl ? (
                                    <div className="h-full flex flex-col">
                                        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-widest"><FileText className="h-3 w-3" /> PDF Document</div>
                                        <iframe src={decodedPdfUrl} className="w-full h-full bg-white" title="PDF Preview" />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col">
                                        <div className="px-4 py-2 bg-(--surface-secondary) border-b border-(--border) text-[10px] font-bold opacity-40 flex items-center justify-between uppercase tracking-widest">
                                            <span>Detected Format: {detectedLanguage}</span>
                                            {Array.isArray(result.result) && <span>Binary Byte Source</span>}
                                        </div>
                                        <Editor
                                            height="100%"
                                            language={detectedLanguage}
                                            theme="vs-dark"
                                            value={formattedPreview || previewText}
                                            options={{ readOnly: true, minimap: { enabled: !isLargeFile }, fontSize: 13, wordWrap: 'on', padding: { top: 16 }, scrollBeyondLastLine: false }}
                                        />
                                    </div>
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full opacity-40">
                                    <div className="text-center"><Sparkles className="h-12 w-12 mx-auto mb-3 text-primary animate-pulse" /><p className="text-sm font-medium tracking-wide">Ready to process</p></div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
