'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader } from '@/components/ui/FileUploader';
import { Button } from '@/components/ui/Button';
import {
    Download,
    RefreshCw,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    CheckCircle,
    Shield,
    AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTIPTool } from '@/hooks/useTIPTool';
import { useWorkerState } from '@/hooks/useWorkerState';
import type { TIPInteractionProps } from '@/tip/protocol';

/** Props for UnlockPdf — all optional so it works as a bare <UnlockPdf /> */
export type UnlockPdfProps = Partial<TIPInteractionProps>;

export default function UnlockPdf({
    files: seedFiles,
    config: seedConfig,
    onConfirm,
    onCancel,
}: UnlockPdfProps = {}) {
    /** true when rendered inside the pipeline InteractionModal */
    const isInteractionMode = typeof onConfirm === 'function';

    const [file, setFile] = useState<File | null>(seedFiles?.[0] ?? null);
    const [password, setPassword] = useState((seedConfig?.password as string) || '');
    const [showPassword, setShowPassword] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockedPdfUrl, setUnlockedPdfUrl] = useState<string | null>(null);

    const { execute, isProcessing, error, progress, progressMessage, tool } = useTIPTool('magic-pdf/unlock');
    const { readyState } = useWorkerState('magic-pdf/unlock');

    // Show toast when tool is warming
    React.useEffect(() => {
        if (readyState === 'warming') {
            const timer = setTimeout(() => {
                if (readyState === 'warming') {
                    alert('Magic PDF tool is loading for the first time. This may take a few minutes...');
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [readyState]);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
            setUnlockedPdfUrl(null);
            setPassword('');
        }
    };

    const handleUnlock = async () => {
        if (!file) {
            alert('Please select a file');
            return;
        }

        if (readyState === 'warming') {
            alert('Magic PDF tool is still loading. Please wait a moment and try again.');
            return;
        }

        // Check if PDF might be encrypted
        const isLikelyEncrypted = file.name.toLowerCase().includes('protected') ||
                                 file.name.toLowerCase().includes('locked') ||
                                 password.length > 0;

        if (!password && isLikelyEncrypted) {
            alert('This appears to be a protected PDF. Please enter the password.');
            return;
        }

        setIsUnlocking(true);
        setUnlockedPdfUrl(null);

        try {
            const outputFiles = await execute([file], {
                password: password || ''
            });

            if (outputFiles && outputFiles.length > 0) {
                const url = URL.createObjectURL(outputFiles[0]);
                setUnlockedPdfUrl(url);
            }
        } catch (error) {
            console.error('Error unlocking PDF:', error);
            // Error is handled by useTIPTool and set in the error state
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleConfirm = () => {
        if (!file || !onConfirm) return;
        onConfirm({
            files: [file],
            config: { password }
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
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
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                    <Unlock className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-semibold mb-2">Unlock PDF</h2>
                                <p className="text-gray-500">Remove password protection from your PDF to access it freely.</p>
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
                                    <div className="h-12 w-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{file.name}</h3>
                                        <p className="text-sm text-gray-500">Enter the password to unlock this PDF</p>
                                    </div>
                                </div>
                                {!unlockedPdfUrl && (
                                    <Button variant="ghost" onClick={() => setFile(null)}>
                                        Change File
                                    </Button>
                                )}
                            </div>
                        </Card>

                        {/* Result Section */}
                        {unlockedPdfUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="p-8 bg-green-50/50 border-green-100">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">PDF Unlocked!</h3>
                                        <p className="text-gray-600 mb-6">Password protection has been removed from your PDF.</p>

                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setFile(null);
                                                    setUnlockedPdfUrl(null);
                                                    setPassword('');
                                                }}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Unlock Another
                                            </Button>
                                            <a href={unlockedPdfUrl} download={`unlocked_${file.name}`}>
                                                <Button>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download Unlocked PDF
                                                </Button>
                                            </a>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <Card className="p-6 border-red-200 bg-red-50">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-red-900 mb-1">Failed to Unlock PDF</h4>
                                        <p className="text-red-700">
                                            {error.includes('Invalid password')
                                                ? 'The password you entered is incorrect. Please try again.'
                                                : error.includes('Python Initialization Failed')
                                                    ? 'The PDF processing tool is not ready yet. Please wait a moment and try again.'
                                                    : error}
                                        </p>
                                        {error.includes('Invalid password') && (
                                            <p className="text-sm text-red-600 mt-2">
                                                Make sure you have the correct password for this PDF.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Password Input */}
                        {!unlockedPdfUrl && (
                            <Card className="p-6">
                                <h4 className="font-semibold text-gray-900 mb-4">Password Required</h4>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            PDF Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter the PDF password"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && password) {
                                                        handleUnlock();
                                                    }
                                                }}
                                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter the password to remove protection from this PDF
                                        </p>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="mt-8 flex flex-col items-center">
                                    <Button
                                        size="lg"
                                        onClick={isInteractionMode ? handleConfirm : handleUnlock}
                                        disabled={isUnlocking || isProcessing || readyState === 'warming'}
                                        isLoading={isUnlocking || isProcessing}
                                        className="w-full max-w-xs"
                                    >
                                        {isInteractionMode ? (
                                            <><CheckCircle className="w-4 h-4 mr-2" /> Confirm Password</>
                                        ) : (
                                            <><Unlock className="w-4 h-4 mr-2" /> {(isUnlocking || isProcessing) ? progressMessage || 'Unlocking...' : readyState === 'warming' ? 'Loading Tool...' : 'Unlock PDF'}</>
                                        )}
                                    </Button>

                                    {isInteractionMode && (
                                        <Button variant="ghost" className="mt-2" onClick={onCancel}>
                                            Cancel
                                        </Button>
                                    )}

                                    {!password && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Please enter the PDF password</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
