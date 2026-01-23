"use client";

import React, { useState, useRef } from "react";

import {
    Shield,
    Trash2,
    Copy,
    Check,
    Settings2,
    FileText,
    Activity,
    Lock,
    ShieldCheck,
    AlertCircle,
    Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { HintManager } from "@/components/ui/HintManager";
import {
    RedactRequest,
    RedactResponse,
    ContentType,
    MaskingStyle
} from "@/types/redact";
import { Tabs } from "@/components/ui/Tabs";
import { useRedactWorker } from "@/hooks/useRedactWorker";

export default function RedactSecretsPage() {
    const [content, setContent] = useState("");
    const [contentType, setContentType] = useState<ContentType>("text");
    const [maskingStyle, setMaskingStyle] = useState<MaskingStyle>("partial");
    const [keys, setKeys] = useState<string[]>([]);
    const [literalTexts, setLiteralTexts] = useState<string[]>([]);
    const [regexPatterns, setRegexPatterns] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);


    const { redact, isLoading: isWasmLoading, isReady } = useRedactWorker();

    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<RedactResponse | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRedact = async () => {
        if (!content.trim()) return;

        setIsLoading(true);
        setError(null);

        const requestBody: RedactRequest = {
            content,
            contentType,
            customConfigurations: {
                style: maskingStyle,
                userHints: {
                    keys,
                    literalTexts,
                    regexPatterns,
                }
            },
        };

        try {
            const data = await redact(requestBody);
            setResponse(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong during local processing.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setFileName(file.name);
        const reader = new FileReader();

        reader.onloadstart = () => {
            setIsUploading(true);
        };

        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === "string") {
                setContent(result);
            }
            setIsUploading(false);
            // Reset input value so the same file can be selected again
            if (e.target) {
                e.target.value = "";
            }
        };

        reader.onerror = () => {
            setError("Failed to read file");
            setIsUploading(false);
        };

        reader.readAsText(file);
    };


    const copyToClipboard = () => {
        if (!response?.maskedContent) return;
        navigator.clipboard.writeText(response.maskedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const clearAll = () => {
        setContent("");
        setResponse(null);
        setError(null);
        setFileName(null);
    };

    return (
        <div className="min-h-screen bg-background-light p-4 md:p-8 font-display">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <Shield className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Secret Redactor</h1>
                                <p className="text-sm text-gray-500 font-medium">Protect sensitive information and PII automatically</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={clearAll} className="bg-white/50 backdrop-blur-md border-gray-200 h-11 px-6 rounded-xl hover:bg-white hover:border-gray-300 transition-all">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                        <Button
                            onClick={handleRedact}
                            isLoading={isLoading || isWasmLoading}
                            className="macos-primary-button min-w-[140px] h-11 px-8"
                        >
                            {isLoading || isWasmLoading ? "Redacting..." : "Redact Now"}
                        </Button>
                    </div>
                </header>

                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full w-fit">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"
                    )} />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        {isReady ? "Running Locally (WASM) - No data leaves your machine" : "Initializing Python Engine... (WASM)"}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-display">
                    {/* Left Column: Editor */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="overflow-hidden border-none shadow-xl bg-white/70 backdrop-blur-2xl ring-1 ring-black/5">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50">
                                <Tabs
                                    value={contentType}
                                    onChange={(id) => setContentType(id as ContentType)}
                                    radius="rounded-[100px]"
                                    orientation="horizontal"
                                    size="sm"
                                    colors={{
                                        container: "bg-gray-100",
                                        indicator: "bg-blue-600",
                                        activeBackground: "bg-white",
                                        label: {
                                            active: "text-blue-600",
                                        },
                                    }}
                                    tabs={[
                                        { id: "text", icon: <FileText className="w-3.5 h-3.5" />, label: "Text" },
                                        { id: "file", icon: <Upload className="w-3.5 h-3.5" />, label: "File" },
                                    ]}
                                />
                                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                                    {contentType === "text" ? "Input Content" : "Upload Document"}
                                </div>
                            </div>
                            <div className="p-0">
                                {contentType === "text" ? (
                                    <Textarea
                                        placeholder="Paste your code, logs, or text containing secrets here..."
                                        className="min-h-[400px] border-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-mono resize-none leading-relaxed p-6 bg-transparent"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                ) : (
                                    <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
                                        <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center text-gray-300 mb-6 group-hover:scale-110 transition-transform">
                                            <Upload className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-4 max-w-sm">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {fileName ? fileName : "Upload your file"}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Support for .txt, .log, .json, .csv and other text files
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    accept=".txt,.log,.json,.csv,.py,.js,.ts,.tsx,.html,.css,.md"
                                                />
                                                <Button
                                                    variant="outline"
                                                    className="bg-white border-gray-200 h-12 rounded-xl group"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    isLoading={isUploading}
                                                >
                                                    <Upload className="w-4 h-4 mr-2 group-hover:translate-y-[-2px] transition-transform" />
                                                    {isUploading ? "Reading File..." : "Select File"}
                                                </Button>
                                                {content && !isUploading && (
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                                        File loaded successfully - Ready for redaction
                                                    </p>
                                                )}
                                                {isUploading && (
                                                    <p className="text-[10px] font-bold text-blue-600 animate-pulse uppercase tracking-widest">
                                                        Loading file content...
                                                    </p>
                                                )}

                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <AnimatePresence mode="wait">
                            {response && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <Card className="overflow-hidden border-none shadow-2xl bg-white/90 backdrop-blur-3xl ring-1 ring-black/5 ring-inset">
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <ShieldCheck className="w-5 h-5" />
                                                <span className="font-bold text-sm">Protected Output</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 group">
                                                {copied ? (
                                                    <Check className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                                )}
                                                <span className="ml-2 group-hover:text-gray-900 transition-colors uppercase text-[10px] font-bold tracking-wider">
                                                    {copied ? "Copied!" : "Copy Output"}
                                                </span>
                                            </Button>
                                        </div>
                                        <div className="p-6 bg-gray-900/2 min-h-[300px]">
                                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed selection:bg-primary/20">
                                                {response.maskedContent}
                                            </pre>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600"
                            >
                                <AlertCircle className="w-5 h-5 fill-red-100" />
                                <p className="text-sm font-semibold">{error}</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column: Settings & Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-none shadow-lg bg-white/70 backdrop-blur-xl ring-1 ring-black/5">
                            <div className="px-6 py-4 border-b border-gray-100 bg-white/30">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-gray-500" />
                                    <span className="font-bold text-sm text-gray-900 uppercase tracking-tight">Configuration</span>
                                </div>
                            </div>
                            <div className="p-6 space-y-8">
                                {/* Masking Style */}
                                <div className="space-y-3">
                                    <div className="flex-col space-y-2">
                                        <div>
                                            <Label className="text-gray-700 font-bold text-xs uppercase tracking-wider">Redaction Style</Label>
                                        </div>
                                        <Tabs
                                            value={maskingStyle}
                                            onChange={(id) => setMaskingStyle(id as MaskingStyle)}
                                            radius="rounded-[100px]"
                                            orientation="horizontal"
                                            size="sm"
                                            colors={{
                                                container: "bg-gray-100",
                                                indicator: "bg-blue-600",
                                                activeBackground: "bg-white",
                                                label: {
                                                    active: "text-blue-600",
                                                },
                                            }}
                                            tabs={[
                                                { id: "partial", label: "Partial" },
                                                { id: "full", label: "Full" },
                                                { id: "hash", label: "Hash" },
                                            ]}
                                        />
                                        <p className="text-[10px] text-gray-400 font-medium px-1">
                                            {maskingStyle === 'partial' && "Shows start/end bits (e.g. pr...12)"}
                                            {maskingStyle === 'full' && "Completely obscures secrets"}
                                            {maskingStyle === 'hash' && "Replaces with cryptographic hash"}
                                        </p>
                                    </div>
                                </div>




                                {/* Hints */}
                                <div className="space-y-6 pt-4 border-t border-gray-100">
                                    <HintManager
                                        label="Force Mask Keys"
                                        placeholder="e.g. secret_token"
                                        values={keys}
                                        onChange={setKeys}
                                        color="blue"
                                    />
                                    <HintManager
                                        label="Specific Content"
                                        placeholder="e.g. MyPassword123"
                                        values={literalTexts}
                                        onChange={setLiteralTexts}
                                        color="purple"
                                    />
                                    <HintManager
                                        label="Custom Patterns"
                                        placeholder="e.g. \b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"
                                        values={regexPatterns}
                                        onChange={setRegexPatterns}
                                        color="emerald"
                                    />
                                </div>
                            </div>
                        </Card>

                        <AnimatePresence>
                            {response && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6"
                                >
                                    <Card className="border-none shadow-lg bg-linear-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20">
                                        <div className="px-6 py-4 border-b border-primary/10 bg-white/30">
                                            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-tight">
                                                <Activity className="w-4 h-4" />
                                                Security Audit
                                            </div>
                                        </div>
                                        <div className="p-8 text-center bg-white/40">
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-5xl font-black text-primary mb-2"
                                            >
                                                {response.summary.totalMasked}
                                            </motion.div>
                                            <div className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] text-balance leading-tight">
                                                Sensitive Entries Neutralized
                                            </div>
                                        </div>
                                    </Card>

                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.entries(response.summary.byType).map(([type, count]) => (
                                            <motion.div
                                                key={type}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-white/60 backdrop-blur-md px-5 py-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm group hover:border-primary/20 transition-colors"
                                            >
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">{type.replace(/_/g, ' ')}</span>
                                                <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">{count}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
