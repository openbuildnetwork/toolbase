"use client";

import React, { useState, useEffect } from "react";
import {
    Code2,
    Copy,
    Check,
    Trash2,
    Settings2,
    FileCode,
    Terminal,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { generateModels } from "@/lib/json-to-interface";
import Image from "next/image";
import { appIcons } from "@/config/icons";

type Language = 'typescript' | 'python' | 'dart' | 'java' | 'kotlin' | 'swift' | 'go';

const LANGUAGES: { id: Language; label: string }[] = [
    { id: 'typescript', label: 'TypeScript' },
    { id: 'python', label: 'Python' },
    { id: 'dart', label: 'Dart' },
    { id: 'java', label: 'Java' },
    { id: 'kotlin', label: 'Kotlin' },
    { id: 'swift', label: 'Swift' },
    { id: 'go', label: 'Go' },
];

export default function JsonToInterfacePage() {
    const [jsonInput, setJsonInput] = useState("");
    const [rootName, setRootName] = useState("Root");
    const [selectedLanguage, setSelectedLanguage] = useState<Language>("typescript");
    const [output, setOutput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        if (!jsonInput.trim()) {
            setError("Please paste some JSON first.");
            return;
        }

        setError(null);
        setIsGenerating(true);

        try {
            const parsed = JSON.parse(jsonInput);
            const result = generateModels(parsed, {
                rootName: rootName || "Root",
                language: selectedLanguage,
            });
            setOutput(result);
        } catch (err: any) {
            let message = "Invalid JSON";
            if (err.message.includes("at position")) {
                const position = parseInt(err.message.match(/at position (\d+)/)?.[1] || "0");
                const lines = jsonInput.slice(0, position).split("\n");
                message = `Invalid JSON at line ${lines.length}`;
            } else if (err.message.includes("at line")) {
                message = err.message;
            }
            setError(message);
            setOutput("");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        setJsonInput("");
        setOutput("");
        setError(null);
    };

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-background-light p-4 md:p-8 font-display">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl ring-1 ring-black/5">
                    <div className="flex items-center gap-4">
                        <Image src={appIcons['json-to-interface']} alt="JSON to Interface" width={48} height={48} className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">JSON → Interface/Model</h1>
                            <p className="text-sm text-gray-500 font-medium">Generate typed models instantly</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                            <Select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                                className="h-11"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.id} value={lang.id}>
                                        {lang.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleClear}
                                className="h-11 bg-white/50 backdrop-blur-md border-gray-100 hover:bg-gray-50/80"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                isLoading={isGenerating}
                                className="macos-primary-button h-11 min-w-[120px]"
                            >
                                {isGenerating ? "Generating..." : "Generate"}
                            </Button>
                        </div>
                    </div>
                </header>

                <Card className="border-none shadow-sm bg-white/60 backdrop-blur-md p-4 ring-1 ring-black/5">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-500 min-w-fit">
                            <Settings2 className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Config</span>
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                            <Label htmlFor="rootName" className="text-sm font-semibold text-gray-700">Root Name:</Label>
                            <Input
                                id="rootName"
                                value={rootName}
                                onChange={(e) => setRootName(e.target.value)}
                                placeholder="e.g. RootObject"
                                className="max-w-[200px] h-9 bg-white/50"
                            />
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-320px)] min-h-[600px]">
                    <div className="flex flex-col h-full space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FileCode className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">JSON Input</span>
                            </div>
                            {error && (
                                <div className="flex items-center gap-1.5 text-red-500 animate-in fade-in slide-in-from-right-2">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-bold">{error}</span>
                                </div>
                            )}
                        </div>
                        <Card className="flex-1 overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-3xl ring-1 ring-black/5 ring-inset flex flex-col">
                            <Textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder="Paste your JSON here..."
                                className="flex-1 border-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-mono text-sm resize-none leading-relaxed p-6 bg-transparent"
                            />
                        </Card>
                    </div>

                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <Terminal className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Generated {LANGUAGES.find(l => l.id === selectedLanguage)?.label} Model</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!output}
                                className="h-7 px-2 hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 mr-1" />
                                        <span className="text-[10px] font-bold">COPIED</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        <span className="text-[10px] font-bold">COPY</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <Card className="flex-1 overflow-hidden border-none shadow-2xl bg-gray-950/95 backdrop-blur-3xl ring-1 ring-white/10 flex flex-col group">
                            <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <pre className="font-mono text-sm text-gray-300 leading-relaxed selection:bg-blue-500/30">
                                    {output || (
                                        <span className="text-gray-600 italic">Generated code will appear here...</span>
                                    )}
                                </pre>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
