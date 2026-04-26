'use client';

import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, X, ShieldAlert } from 'lucide-react';
import { useRedactSecrets } from '@/hooks/useRedactSecrets';
import { RedactEditor } from './RedactEditor';
import { RedactConfiguration } from './RedactConfiguration';
import { RedactOutput } from './RedactOutput';
import { RedactStats } from './RedactStats';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EngineLoader } from '@/components/ui/EngineLoader';
import type { TIPInteractionProps } from '@/tip/protocol';
import type { ContentType, MaskingStyle } from '@/types/redact';

/**
 * TIP Interaction Component for Redact Secrets.
 * Reuses the existing UI components to provide a consistent experience
 * inside the pipeline configuration modal.
 */
export default function RedactInteractive({
    files: seedFiles,
    config: seedConfig,
    onConfirm,
    onCancel,
}: TIPInteractionProps) {
    const [isInternalReading, setIsInternalReading] = useState(false);

    const {
        content,
        setContent,
        contentType,
        setContentType,
        fileName,
        setFileName,
        maskingStyle,
        setMaskingStyle,
        keys,
        setKeys,
        literalTexts,
        setLiteralTexts,
        regexPatterns,
        setRegexPatterns,
        response,
        isLoading,
        isReady,
        handleRedact,
        handleFileUpload,
    } = useRedactSecrets({
        content: (seedConfig?.content as string) || "",
        contentType: (seedConfig?.contentType as ContentType) || "text",
        fileName: (seedConfig?.fileName as string) || null,
        maskingStyle: (seedConfig?.maskingStyle as MaskingStyle) || "partial",
        keys: (seedConfig?.keys as string[]) || [],
        literalTexts: (seedConfig?.literalTexts as string[]) || [],
        regexPatterns: (seedConfig?.regexPatterns as string[]) || [],
    });

    // Handle seed files from TIP
    useEffect(() => {
        if (seedFiles && seedFiles.length > 0 && !content) {
            const file = seedFiles[0];
            setIsInternalReading(true);
            setFileName(file.name);
            setContentType("file");

            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result;
                if (typeof result === "string") {
                    setContent(result);
                }
                setIsInternalReading(false);
            };
            reader.onerror = () => {
                setIsInternalReading(false);
            };
            reader.readAsText(file);
        }
    }, [seedFiles, content, setContent, setFileName, setContentType]);

    const handleConfirm = () => {
        // We create a virtual file if it was just text input, or pass the original file
        let finalFile: File;
        if (seedFiles && seedFiles.length > 0) {
            finalFile = seedFiles[0];
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            finalFile = new File([blob], fileName || 'redacted.txt', { type: 'text/plain' });
        }

        onConfirm({
            files: [finalFile],
            config: {
                content,
                contentType,
                fileName,
                maskingStyle,
                keys,
                literalTexts,
                regexPatterns,
            },
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden font-display p-6 space-y-6">
            <header className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-text-primary">Configure Redaction</h2>
                        <p className="text-xs text-text-muted font-medium italic">Adjust masking patterns and PII detection</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <EngineLoader isReady={isReady} engine="wasm" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
                    {/* Left: Editor & Output */}
                    <div className="lg:col-span-8 space-y-6">
                        <RedactEditor
                            content={content}
                            setContent={setContent}
                            contentType={contentType}
                            setContentType={setContentType}
                            fileName={fileName}
                            onFileUpload={handleFileUpload}
                        />

                        {response && <RedactOutput response={response} />}
                        
                        {!response && !isLoading && !isInternalReading && (
                              <Card className="p-8 border-dashed border-2 border-border-subtle flex flex-col items-center justify-center text-center space-y-4 bg-surface-secondary/30">
                                <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
                                    <ShieldAlert className="w-6 h-6 text-text-muted/50" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest">Awaiting Preview</h3>
                                    <p className="text-xs text-text-muted mt-1 max-w-[240px] mx-auto">Click "Run Preview" to test your redaction patterns before confirming.</p>
                                </div>
                              </Card>
                        )}
                    </div>

                    {/* Right: Settings & Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        <RedactConfiguration
                            maskingStyle={maskingStyle}
                            setMaskingStyle={setMaskingStyle}
                            keys={keys}
                            setKeys={setKeys}
                            literalTexts={literalTexts}
                            setLiteralTexts={setLiteralTexts}
                            regexPatterns={regexPatterns}
                            setRegexPatterns={setRegexPatterns}
                        />

                        <RedactStats response={response} />
                    </div>
                </div>
            </div>

            <footer className="flex items-center justify-between pt-6 border-t border-border-subtle shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleRedact}
                        isLoading={isLoading || isInternalReading}
                        className="h-12 px-6 rounded-xl border-gray-200 font-bold"
                    >
                        Run Preview
                    </Button>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="h-12 px-6 rounded-xl text-text-muted hover:text-text-primary border-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="macos-primary-button h-12 px-10 rounded-xl"
                        disabled={!content || isLoading || isInternalReading}
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Redactions
                    </Button>
                </div>
            </footer>
        </div>
    );
}
