
"use client";

import React from "react";
import { Play, Square, Timer, Download, Upload, Info, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { Card } from "@/components/ui/Card";
import { useSpeedTest, TestStage } from "@/hooks/useSpeedTest";
import { motion, AnimatePresence } from "framer-motion";

export default function SpeedTestPage() {
    const { status, results, currentSpeed, error, startTest, stopTest } = useSpeedTest();

    const isRunning = status === 'ping' || status === 'download' || status === 'upload';

    // Determine what to show in the big meter
    const getMeterValue = () => {
        if (status === 'ping') return Math.round(currentSpeed) || results.ping || 0; // usually 0 for ping as we don't stream it live yet
        if (status === 'download') return currentSpeed;
        if (status === 'upload') return currentSpeed;
        if (status === 'complete') return results.download; // Show download as primary or maybe just "Done"?
        return 0;
    };

    const getMeterLabel = () => {
        if (status === 'ping') return 'Ping (ms)';
        if (status === 'download') return 'Download (mbps)';
        if (status === 'upload') return 'Upload (mbps)';
        if (status === 'complete') return 'Download (mbps)';
        return 'Ready';
    };

    const getStageColor = (stage: TestStage) => {
        switch (stage) {
            case 'ping': return 'text-amber-500';
            case 'download': return 'text-blue-500';
            case 'upload': return 'text-purple-500';
            case 'complete': return 'text-emerald-500';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="min-h-screen bg-(--background) p-4 md:p-8 font-display">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-(--surface-overlay) backdrop-blur-xl p-6 rounded-3xl border border-(--border-subtle) shadow-xl ring-1 ring-black/5 dark:ring-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-(--primary) flex items-center justify-center text-white shadow-lg shadow-(--primary)/20">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-(--text-primary) leading-tight">Internet Speed Test</h1>
                            <p className="text-sm text-(--text-tertiary) font-medium">Browser-based connectivity check</p>
                        </div>
                    </div>
                    <ReturnToToolsButton />

                    <div className="flex gap-2">
                        <Button
                            onClick={startTest}
                            disabled={isRunning}
                            className="macos-primary-button h-11 min-w-[130px] bg-(--primary) hover:bg-(--primary-hover) text-white"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Start Test
                        </Button>
                        <Button
                            variant="outline"
                            onClick={stopTest}
                            disabled={!isRunning && status !== 'complete'}
                            className="h-11 bg-(--surface-secondary) border-(--border-subtle) text-red-500 hover:bg-red-500/10 hover:border-red-500/20"
                        >
                            <Square className="w-4 h-4 mr-2" />
                            {isRunning ? 'Stop' : 'Reset'}
                        </Button>
                    </div>
                </header>

                {/* Main Meter */}
                <div className="relative">
                    <Card className="p-12 border border-(--border-subtle) shadow-2xl bg-(--surface-overlay) backdrop-blur-3xl ring-1 ring-black/5 dark:ring-white/5 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="text-center space-y-2 z-10">
                            <motion.div
                                className={cn("text-6xl md:text-8xl font-black tabular-nums tracking-tighter", getStageColor(status))}
                                animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
                                transition={{ repeat: isRunning ? Infinity : 0, duration: 2 }}
                            >
                                {status === 'idle' ? 'Start' : getMeterValue()}
                            </motion.div>
                            <div className="text-sm md:text-base font-bold uppercase tracking-widest text-(--text-muted)">
                                {getMeterLabel()}
                            </div>
                        </div>

                        {/* Background Pulse */}
                        {isRunning && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <span className={cn("w-64 h-64 rounded-full blur-3xl animate-pulse bg-current", getStageColor(status))} />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Progress Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Ping Card */}
                    <Card className={cn(
                        "p-6 border border-(--border-subtle) shadow-lg transition-all duration-500",
                        status === 'ping' ? "bg-(--surface-overlay) ring-2 ring-amber-500 transform scale-105" : "bg-(--surface-overlay)/40"
                    )}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Timer className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Ping</span>
                            </div>
                            <div className="text-3xl font-bold text-(--text-primary) tabular-nums">
                                {results.ping ? `${results.ping} ms` : '-'}
                            </div>
                        </div>
                    </Card>

                    {/* Download Card */}
                    <Card className={cn(
                        "p-6 border border-(--border-subtle) shadow-lg transition-all duration-500",
                        status === 'download' ? "bg-(--surface-overlay) ring-2 ring-blue-500 transform scale-105" : "bg-(--surface-overlay)/40"
                    )}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-blue-500">
                                <Download className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Download</span>
                            </div>
                            <div className="text-3xl font-bold text-(--text-primary) tabular-nums">
                                {results.download ? `${results.download} mbps` : '-'}
                            </div>
                        </div>
                    </Card>

                    {/* Upload Card */}
                    <Card className={cn(
                        "p-6 border border-(--border-subtle) shadow-lg transition-all duration-500",
                        status === 'upload' ? "bg-(--surface-overlay) ring-2 ring-purple-500 transform scale-105" : "bg-(--surface-overlay)/40"
                    )}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-purple-500">
                                <Upload className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Upload</span>
                            </div>
                            <div className="text-3xl font-bold text-(--text-primary) tabular-nums">
                                {results.upload ? `${results.upload} mbps` : '-'}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-(--surface-secondary) border border-(--border-subtle) rounded-2xl mx-auto max-w-fit">
                    <Info className="w-3 h-3 text-(--text-tertiary)" />
                    <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">
                        Runs locally • No data stored • Uses public test files • Open source
                    </span>
                </div>
            </div>
        </div>
    );
}
