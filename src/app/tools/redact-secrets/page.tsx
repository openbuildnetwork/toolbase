"use client";

import React, { useState } from "react";
import {
    Shield,
    Trash2,
    Copy,
    Check,
    Settings2,
    Code2,
    FileText,
    Activity,
    Lock,
    ShieldCheck,
    AlertCircle
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

export default function RedactSecretsPage() {
    const [content, setContent] = useState("");
    const [contentType, setContentType] = useState<ContentType>("text");
    const [maskingStyle, setMaskingStyle] = useState<MaskingStyle>("partial");
    const [keys, setKeys] = useState<string[]>([]);
    const [literalTexts, setLiteralTexts] = useState<string[]>([]);
    const [regexPatterns, setRegexPatterns] = useState<string[]>([]);
    const [maskPaths, setMaskPaths] = useState(true);
    const [maskUUIDs, setMaskUUIDs] = useState(true);
    const [maskNumericIds, setMaskNumericIds] = useState(false);

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
            masking: {
                style: maskingStyle,
                userHints: {
                    keys,
                    literalTexts,
                    regexPatterns,
                },
                logOptions: {
                    maskPaths,
                    maskUUIDs,
                    maskNumericIds,
                },
            },
        };

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
            const res = await fetch(`${baseUrl}/tools/redact/mask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!res.ok) {
                throw new Error(`API Error: ${res.statusText}`);
            }

            const data: RedactResponse = await res.json();
            setResponse(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please check if the API is running.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
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
    };

    return (
        <div className="min-h-screen bg-background-light p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <Shield className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-display">Secret Redactor</h1>
                                <p className="text-sm text-gray-500 font-medium">Protect sensitive information and PII automatically</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={clearAll} className="bg-white/50 backdrop-blur-md border-gray-200">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                        <Button
                            onClick={handleRedact}
                            isLoading={isLoading}
                            className="macos-primary-button min-w-[140px]"
                        >
                            {isLoading ? "Redacting..." : (
                                <>
                                    Redact Now
                                </>
                            )}
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-display">
                    {/* Left Column: Editor */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="overflow-hidden border-none shadow-xl bg-white/70 backdrop-blur-2xl ring-1 ring-black/5">


                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50">
                                <Tabs
                                    value={contentType}
                                    onChange={setContentType}
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
                                        { id: "code", icon: <Code2 className="w-3.5 h-3.5" />, label: "Code" },
                                        { id: "log", icon: <Activity className="w-3.5 h-3.5" />, label: "Logs" },
                                    ]}
                                />
                                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                                    Input Content
                                </div>
                            </div>
                            <div className="p-0">
                                <Textarea
                                    placeholder="Paste your code, logs, or text containing secrets here..."
                                    className="min-h-[400px] border-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-mono resize-none leading-relaxed p-6 bg-transparent"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
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
                                            <Label>Redaction Style</Label>
                                        </div>
                                        <Tabs
                                            value={maskingStyle}
                                            onChange={setMaskingStyle}
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
                                    </div>
                                </div>

                                {/* Log Options */}
                                {contentType === 'log' && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <Label>Log Specific Options</Label>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 font-medium">Mask Path Structures</span>
                                                <Switch
                                                    checked={maskPaths}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaskPaths(e.target.checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 font-medium">Identify UUIDs</span>
                                                <Switch
                                                    checked={maskUUIDs}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaskUUIDs(e.target.checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 font-medium">Redact Numeric IDs</span>
                                                <Switch
                                                    checked={maskNumericIds}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaskNumericIds(e.target.checked)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

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
