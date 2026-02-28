'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTIPTool } from '@/hooks/useTIPTool';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { FileDropZone } from '@/components/ui/FileDropZone';
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';
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
} from 'lucide-react';
import type { Base64Mode } from '@/types/base64';
import { motion, AnimatePresence } from 'framer-motion';

export default function Base64Page() {
    const [mode, setMode] = useState<'text' | 'file'>('text');
    const [operation, setOperation] = useState<'encode' | 'decode'>('encode');

    const encodeTool = useTIPTool('base64/encode');
    const decodeTool = useTIPTool('base64/decode');
    const activeTool = operation === 'encode' ? encodeTool : decodeTool;
    const { execute, isProcessing, error, progressMessage } = activeTool;
    const [resultFile, setResultFile] = useState<File | null>(null);
    const [previewText, setPreviewText] = useState<string>('');
    const reset = () => { setResultFile(null); setPreviewText(''); };
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImage, setIsImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [decodedImageUrl, setDecodedImageUrl] = useState<string | null>(null);

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
                // Clean up previous decoded image
                if (decodedImageUrl) {
                    URL.revokeObjectURL(decodedImageUrl);
                    setDecodedImageUrl(null);
                }

                const payloadArray: File[] = [];

                if (mode === 'text') {
                    const textData = inputData || inputText;
                    if (!textData || typeof textData !== 'string') return;

                    const blob = new Blob([textData], { type: 'text/plain' });
                    payloadArray.push(new File([blob], "input.txt", { type: 'text/plain' }));
                } else {
                    if (!selectedFile && !inputData) return;

                    if (inputData) {
                        const blob = new Blob([inputData as BlobPart], { type: 'application/octet-stream' });
                        payloadArray.push(new File([blob], "input.bin", { type: 'application/octet-stream' }));
                    } else {
                        payloadArray.push(selectedFile!);
                    }
                }

                const outputFiles = await execute(payloadArray, {
                    urlSafe,
                    mimeType: addMimeHeader ? mimeType : '',
                });

                let text = '';
                if (outputFiles && outputFiles.length > 0) {
                    const outFile = outputFiles[0];
                    setResultFile(outFile);

                    if (outFile.size < 1024 * 500) { // 500kb preview limit
                        text = await outFile.text();
                        setPreviewText(text);
                    } else {
                        setPreviewText('');
                    }
                }

                // After processing, check if we decoded an image
                if (
                    mode === 'text' &&
                    operation === 'decode' &&
                    outputFiles && outputFiles.length > 0 &&
                    typeof inputText === 'string'
                ) {
                    const trimmedInput = inputText.trim();

                    // Check if input has data URI prefix
                    if (trimmedInput.match(/^data:image\/([^;]+);base64,/)) {
                        // Use the original input as image URL
                        setDecodedImageUrl(trimmedInput);
                    } else {
                        // Raw base64 string - try to detect if it's an image by checking magic bytes
                        try {
                            // Get the base64 part
                            let base64Data = trimmedInput.replace(/\s/g, ''); // Remove whitespace

                            // Decode to check file signature
                            const binaryString = atob(base64Data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }

                            // Check magic bytes for common image formats
                            let imageType = null;
                            if (bytes.length >= 4) {
                                // PNG: 89 50 4E 47
                                if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
                                    imageType = 'image/png';
                                }
                                // JPEG: FF D8 FF
                                else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
                                    imageType = 'image/jpeg';
                                }
                                // GIF: 47 49 46 38
                                else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
                                    imageType = 'image/gif';
                                }
                                // WebP: 52 49 46 46 ... 57 45 42 50
                                else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
                                    if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
                                        imageType = 'image/webp';
                                    }
                                }
                                // BMP: 42 4D
                                else if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
                                    imageType = 'image/bmp';
                                }
                            }

                            // If we detected an image, create data URI
                            if (imageType) {
                                const dataUri = `data:${imageType};base64,${base64Data}`;
                                setDecodedImageUrl(dataUri);
                            }
                        } catch (err) {
                            // Not valid base64 or not an image - will show as text
                            console.log('Not a valid image base64');
                        }
                    }
                }
            } catch (err) {
                console.error('Processing error:', err);
            }
        },
        [mode, operation, inputText, selectedFile, urlSafe, addMimeHeader, mimeType, process, decodedImageUrl]
    );

    useEffect(() => {
        if (liveMode && mode === 'text' && inputText) {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                handleProcess();
            }, 500);
        }

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [liveMode, mode, inputText, handleProcess]);

    // Cleanup image preview on unmount
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleFileSelected = async (file: File | null) => {
        setSelectedFile(file);
        reset();

        // Clean up previous preview
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }

        if (file) {
            // Check if it's an image
            const isImageFile = file.type.startsWith('image/');
            setIsImage(isImageFile);

            // Create preview for images
            if (isImageFile && operation === 'encode') {
                const previewUrl = URL.createObjectURL(file);
                setImagePreview(previewUrl);
            }

            // Set MIME type
            if (operation === 'encode') {
                setMimeType(file.type || 'application/octet-stream');
            }
        } else {
            setIsImage(false);
        }
    };

    const handleModeChange = (newMode: 'text' | 'file') => {
        setMode(newMode);
        reset();
        setInputText('');
        setSelectedFile(null);

        // Clean up image preview
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
        if (decodedImageUrl) {
            setDecodedImageUrl(null);
        }
        setIsImage(false);
    };

    const handleOperationChange = (newOperation: 'encode' | 'decode') => {
        setOperation(newOperation);
        reset();
    };

    const handleDownload = () => {
        if (!resultFile) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(resultFile);

        let targetName = resultFile.name;
        if (selectedFile) {
            const baseFilename = selectedFile.name.replace(/\.[^/.]+$/, '');
            const extension = operation === 'encode' ? 'txt' : selectedFile.name.split('.').pop() || 'bin';
            targetName = `${baseFilename}_${operation}.${extension}`;
        }

        link.download = targetName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-6 px-4">
            <div className="max-w-[1800px] mx-auto">
                {/* Compact Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Base64 Tool</h1>
                    <p className="text-sm text-gray-600">
                        Encode & decode in real-time • 100% private • Handles 100MB+ files
                    </p>
                </div>

                {/* Controls Bar */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    {/* Mode Selector */}
                    <div className="flex gap-2 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <button
                            onClick={() => handleModeChange('text')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'text'
                                ? 'bg-primary text-white shadow'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <FileText className="h-4 w-4" />
                            Text
                        </button>
                        <button
                            onClick={() => handleModeChange('file')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'file'
                                ? 'bg-primary text-white shadow'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <FileCode className="h-4 w-4" />
                            File
                        </button>
                    </div>

                    {/* Operation Selector */}
                    <div className="flex gap-2 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <button
                            onClick={() => handleOperationChange('encode')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${operation === 'encode'
                                ? 'bg-primary text-white shadow'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Encode
                        </button>
                        <button
                            onClick={() => handleOperationChange('decode')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${operation === 'decode'
                                ? 'bg-primary text-white shadow'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Decode
                        </button>
                    </div>

                    {/* Quick Toggles */}
                    {mode === 'text' && (
                        <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                            <Switch checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} />
                            <span className="text-sm font-medium text-gray-700">Live</span>
                        </label>
                    )}

                    <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                        <Switch checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
                        <span className="text-sm font-medium text-gray-700">URL Safe</span>
                    </label>

                    {/* Advanced Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        Advanced
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Process Button (Mobile) */}
                    {!liveMode && (
                        <Button
                            onClick={() => handleProcess()}
                            disabled={
                                isProcessing ||
                                (mode === 'text' && !inputText) ||
                                (mode === 'file' && !selectedFile)
                            }
                            className="ml-auto lg:hidden"
                            isLoading={isProcessing}
                        >
                            {operation === 'encode' ? 'Encode' : 'Decode'}
                        </Button>
                    )}
                </div>

                {/* Advanced Options */}
                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-4"
                        >
                            <Card className="p-4 bg-white border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={addMimeHeader}
                                        onChange={(e) => setAddMimeHeader(e.target.checked)}
                                    />
                                    <Label className="font-medium">Add MIME Header</Label>
                                    {addMimeHeader && (
                                        <Input
                                            value={mimeType}
                                            onChange={(e) => setMimeType(e.target.value)}
                                            placeholder="e.g., text/plain"
                                            className="max-w-xs"
                                        />
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>



                {/* Main Side-by-Side Layout */}
                <div className="grid lg:grid-cols-2 gap-4">
                    {/* LEFT: INPUT PANEL */}
                    <Card className="flex flex-col bg-white border border-gray-200 shadow-lg">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                    1
                                </span>
                                Input
                            </h2>
                            <span className="text-xs text-gray-500">
                                {mode === 'text' ? 'Text Mode' : 'File Mode'}
                            </span>
                        </div>

                        <div className="flex-1 p-4">
                            {mode === 'text' ? (
                                <Textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={
                                        operation === 'encode'
                                            ? 'Enter text to encode...'
                                            : 'Paste Base64 string to decode...'
                                    }
                                    className="w-full h-full min-h-[400px] font-mono text-sm resize-none border border-gray-200 focus:border-primary"
                                />
                            ) : (
                                <div className="space-y-3">
                                    <FileDropZone
                                        onFileSelected={handleFileSelected}
                                        accept={operation === 'decode' ? '.txt,.b64' : '*'}
                                    />
                                    {selectedFile && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{selectedFile.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatFileSize(selectedFile.size)}
                                                            {isImage && ' • Image File'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleFileSelected(null)}
                                                    className="text-red-600 hover:bg-red-50"
                                                >
                                                    Remove
                                                </Button>
                                            </div>

                                            {/* Image Preview */}
                                            {imagePreview && (
                                                <div className="p-3 bg-white rounded-lg border border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-500 mb-2">PREVIEW:</p>
                                                    <div className="flex justify-center">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="max-h-48 rounded-lg shadow-md object-contain"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>

                        {!liveMode && (
                            <div className="p-4 border-t border-gray-100">
                                <Button
                                    onClick={() => handleProcess()}
                                    disabled={
                                        isProcessing ||
                                        (mode === 'text' && !inputText) ||
                                        (mode === 'file' && !selectedFile)
                                    }
                                    className="w-full"
                                    size="lg"
                                    isLoading={isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {progressMessage || 'Processing...'}
                                        </>
                                    ) : (
                                        <>
                                            {operation === 'encode' ? 'Encode' : 'Decode'}
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* RIGHT: OUTPUT PANEL */}
                    <Card className="flex flex-col bg-white border border-gray-200 shadow-lg">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500/10 text-green-700 rounded-full text-xs font-bold">
                                    2
                                </span>
                                Output
                            </h2>
                            <div className="flex items-center gap-2">
                                {resultFile && (
                                    <>
                                        <span className="text-xs text-gray-500">
                                            {formatFileSize(resultFile.size || 0)}
                                        </span>
                                        {previewText && (
                                            <CopyToClipboard text={previewText} showText={false} />
                                        )}
                                        <Button variant="ghost" size="sm" onClick={handleDownload}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-4 overflow-auto">
                            {error ? (
                                <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-red-900">Decoding Error</p>
                                        <p className="text-sm text-red-700 mt-1">{error}</p>
                                        {error.toLowerCase().includes('invalid base64') && (
                                            <div className="mt-3 p-3 bg-red-100/50 rounded border border-red-300">
                                                <p className="text-xs font-semibold text-red-800 mb-1">💡 Troubleshooting Tips:</p>
                                                <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                                                    <li>Base64 should only contain: A-Z, a-z, 0-9, +, /, and =</li>
                                                    <li>Check for invalid characters or extra spaces</li>
                                                    <li>Make sure the string isn't truncated</li>
                                                    <li>For images: Try including the data URI prefix (e.g., data:image/png;base64,)</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : resultFile ? (
                                !previewText && !decodedImageUrl ? (
                                    <div className="space-y-3">
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-900">
                                                ⚠️ Large File ({formatFileSize(resultFile.size || 0)})
                                            </p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                                Too large to display as text. Use download button to save.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    // Check if we have a decoded image URL
                                    decodedImageUrl ? (
                                        <div className="space-y-3">
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                <p className="text-sm font-medium text-green-900">
                                                    🖼️ Decoded Image
                                                </p>
                                                <p className="text-xs text-green-700 mt-1">
                                                    Successfully decoded base64 image data
                                                </p>
                                            </div>
                                            <div className="p-4 bg-white rounded-lg border border-gray-200">
                                                <p className="text-xs font-semibold text-gray-500 mb-3">IMAGE PREVIEW:</p>
                                                <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                                                    <img
                                                        src={decodedImageUrl}
                                                        alt="Decoded"
                                                        className="max-w-full max-h-96 rounded-lg shadow-lg object-contain"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) :
                                        // Check if result is an image (has data URI with image MIME type)
                                        typeof previewText === 'string' &&
                                            previewText.startsWith('data:image/') ? (
                                            <div className="space-y-3">
                                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                    <p className="text-sm font-medium text-green-900">
                                                        🖼️ Image Encoded
                                                    </p>
                                                    <p className="text-xs text-green-700 mt-1">
                                                        Preview shown below. Copy or download the data URI.
                                                    </p>
                                                </div>
                                                <div className="p-4 bg-white rounded-lg border border-gray-200">
                                                    <p className="text-xs font-semibold text-gray-500 mb-3">IMAGE PREVIEW:</p>
                                                    <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                                                        <img
                                                            src={previewText}
                                                            alt="Encoded"
                                                            className="max-w-full max-h-96 rounded-lg shadow-lg object-contain"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={previewText}
                                                readOnly
                                                className="w-full h-full min-h-[400px] font-mono text-sm resize-none bg-gray-50 border border-gray-200"
                                            />
                                        )
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[400px] text-gray-400">
                                    <div className="text-center">
                                        <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">Output will appear here</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
