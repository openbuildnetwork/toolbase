"use client";

import React, { useState, useEffect } from "react";
import {
    Copy,
    Check,
    Trash2,
    Settings2,
    FileCode,
    Terminal,
    AlertCircle,
    Zap,
    RefreshCw,
    ArrowRight,
    Settings,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { generateModels } from "@/lib/json-to-interface";
import Image from "next/image";
import { appIcons } from "@/config/icons";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { Switch } from "@/components/ui/Switch";

type Language = 'typescript' | 'python' | 'dart' | 'java' | 'kotlin' | 'swift' | 'go';

const LANGUAGES: TabItem<Language>[] = [
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
    const [liveMode, setLiveMode] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const { resolvedTheme } = useTheme();

    const handleGenerate = () => {
        if (!jsonInput.trim()) {
            setError("Paste some JSON to begin");
            return;
        }

        setError(null);
        setIsGenerating(true);

        // Artificial delay for premium feel if not live
        const delay = liveMode ? 0 : 400;

        setTimeout(() => {
            try {
                const parsed = JSON.parse(jsonInput);
                const result = generateModels(parsed, {
                    rootName: rootName || "Root",
                    language: selectedLanguage,
                });
                setOutput(result);
                setError(null);
            } catch (err: unknown) {
                let message = "Invalid JSON structure";
                const errorMessage = err instanceof Error ? err.message : "";
                if (errorMessage.includes("at position")) {
                    const position = parseInt(errorMessage.match(/at position (\d+)/)?.[1] || "0");
                    const lines = jsonInput.slice(0, position).split("\n");
                    message = `Syntax error at line ${lines.length}`;
                }
                setError(message);
                if (!liveMode) setOutput("");
            } finally {
                setIsGenerating(false);
            }
        }, delay);
    };

    // Live Mode generation
    useEffect(() => {
        if (liveMode && jsonInput.trim()) {
            handleGenerate();
        }
    }, [jsonInput, selectedLanguage, rootName, liveMode]);

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
        <div className="min-h-screen bg-(--background) text-(--text-primary) p-4 md:p-8 font-display transition-colors duration-500">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-(--surface-overlay)/60 backdrop-blur-xl p-6 rounded-[2rem] border border-(--border-subtle) shadow-2xl shadow-black/5 dark:shadow-black/20 ring-1 ring-white/10">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <Image 
                                src={appIcons['json-to-interface']} 
                                alt="JSON to Interface" 
                                width={56} 
                                height={56} 
                                className="relative w-14 h-14 rounded-2xl bg-blue-600 p-2.5 shadow-2xl shadow-blue-500/40 transform transition-transform group-hover:scale-105" 
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-(--text-primary) leading-none mb-1">JSON <span className="text-(--primary) opacity-80">Studio</span></h1>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-sm text-(--text-tertiary) font-bold uppercase tracking-widest">Model Generator</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <ReturnToToolsButton />
                    </div>
                </header>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-(--surface-overlay)/40 backdrop-blur-md rounded-2xl border border-(--border-subtle) shadow-sm">
                        <div className="flex flex-wrap items-center gap-3">
                            <Tabs
                                tabs={LANGUAGES}
                                value={selectedLanguage}
                                onChange={(l) => setSelectedLanguage(l as Language)}
                                size="sm"
                                colors={{
                                    container: "bg-(--surface-secondary) border border-(--border-subtle)",
                                    indicator: "bg-(--primary) shadow-lg shadow-blue-500/30",
                                    activeBackground: "bg-transparent",
                                    label: {
                                        active: "text-white font-bold",
                                        inactive: "text-(--text-secondary) opacity-50"
                                    }
                                }}
                            />

                            <div className="w-px h-6 bg-(--border-subtle) mx-1" />

                            <div className="flex items-center gap-4 px-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <Switch checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} />
                                    <span className="text-sm font-medium text-(--text-secondary) group-hover:text-(--text-primary) transition-colors">Live Mode</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto shrink-0">
                            <Button 
                                variant="ghost"
                                onClick={() => setShowAdvanced(!showAdvanced)} 
                                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${showAdvanced ? 'bg-(--primary)/10 text-(--primary)' : 'text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Advanced Configuration"
                            >
                                <Settings className={`h-5 w-5 transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`} />
                            </Button>

                            {!liveMode && (
                                <Button
                                    onClick={() => handleGenerate()}
                                    disabled={isGenerating || !jsonInput.trim()}
                                    className="relative h-10 px-6 rounded-xl font-bold group overflow-hidden bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                                >
                                    <div className="relative z-10 flex items-center gap-2">
                                        {isGenerating ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Zap className="h-4 w-4 text-blue-200 group-hover:text-white transition-colors" />
                                        )}
                                        <span className="text-sm font-bold">Generate</span>
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClear}
                                className="h-10 px-4 bg-(--surface-secondary) text-(--text-primary) border-(--border-medium) hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all rounded-xl font-bold"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }} 
                                className="overflow-hidden"
                            >
                                <Card className="p-5 bg-(--surface-overlay)/60 backdrop-blur-md border border-(--border-subtle) rounded-[1.5rem] shadow-xl">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex items-center gap-3 text-(--text-tertiary)">
                                            <Settings2 className="w-5 h-5" />
                                            <span className="text-xs font-black uppercase tracking-[0.2em]">Configuration</span>
                                        </div>
                                        <div className="flex flex-1 items-center gap-4">
                                            <Label htmlFor="rootName" className="text-sm font-bold text-(--text-secondary) whitespace-nowrap">Root Entity Name:</Label>
                                            <Input
                                                id="rootName"
                                                value={rootName}
                                                onChange={(e) => setRootName(e.target.value)}
                                                placeholder="e.g. UserData"
                                                className="max-w-[240px] h-10 bg-(--input-bg) text-(--text-primary) border-(--border-medium) rounded-xl font-medium focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-280px)] min-h-[500px]">
                    <div className="flex flex-col h-full space-y-3 group">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-(--text-tertiary)">
                                <FileCode className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-[0.15em]">Input JSON</span>
                            </div>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-1.5 text-red-500"
                                >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-bold">{error}</span>
                                </motion.div>
                            )}
                        </div>
                        <Card className="flex-1 overflow-hidden border border-(--border-subtle) shadow-2xl shadow-black/5 dark:shadow-black/30 bg-(--surface-elevated)/40 backdrop-blur-3xl rounded-[2rem] ring-1 ring-white/5 flex flex-col relative transition-all group-hover:border-(--primary)/30">
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                                value={jsonInput}
                                onChange={(val) => setJsonInput(val || '')}
                                options={{ 
                                    minimap: { enabled: false }, 
                                    fontSize: 14, 
                                    wordWrap: 'on', 
                                    padding: { top: 24, bottom: 24 },
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all',
                                    scrollBeyondLastLine: false
                                }}
                            />
                        </Card>
                    </div>

                    <div className="flex flex-col h-full space-y-3 group">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-emerald-500">
                                <Terminal className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-[0.15em]">
                                    Generated {LANGUAGES.find(l => l.id === selectedLanguage)?.label}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!output}
                                className="h-8 px-3 hover:bg-emerald-500/10 text-emerald-500 disabled:opacity-30 rounded-lg font-bold transition-all"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 mr-2" />
                                        <span className="text-[10px] uppercase tracking-wider">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 mr-2" />
                                        <span className="text-[10px] uppercase tracking-wider">Copy</span>
                                    </>
                                )}
                            </Button>
                        </div>
                        <Card className="flex-1 overflow-hidden border border-(--border-subtle) shadow-2xl shadow-black/10 dark:shadow-black/40 bg-slate-950/95 backdrop-blur-3xl rounded-[2rem] ring-1 ring-white/10 flex flex-col relative group-hover:border-emerald-500/30 transition-all">
                            <Editor
                                height="100%"
                                language={selectedLanguage === 'dart' ? 'java' : selectedLanguage} // basic highlighting fallback
                                theme="vs-dark"
                                value={output}
                                options={{ 
                                    readOnly: true, 
                                    minimap: { enabled: false }, 
                                    fontSize: 14, 
                                    wordWrap: 'on', 
                                    padding: { top: 24, bottom: 24 },
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    scrollBeyondLastLine: false,
                                    lineNumbers: 'on'
                                }}
                            />
                            {!output && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center p-8">
                                        <div className="relative mb-4">
                                            <Sparkles className="h-12 w-12 mx-auto text-white opacity-10" />
                                            <motion.div 
                                                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                                                transition={{ duration: 4, repeat: Infinity }}
                                                className="absolute inset-0 flex items-center justify-center"
                                            >
                                                <Sparkles className="h-12 w-12 text-blue-500 blur-xl" />
                                            </motion.div>
                                        </div>
                                        <p className="text-sm font-bold text-slate-500 italic tracking-wide uppercase">Ready for Input</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
