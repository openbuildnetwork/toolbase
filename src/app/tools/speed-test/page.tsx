
"use client";

import React from "react";
import { Play, Square, Timer, Download, Upload, Info, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
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
        if (status === 'download') return 'Download (Mbps)';
        if (status === 'upload') return 'Upload (Mbps)';
        if (status === 'complete') return 'Download (Mbps)';
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
        <div className="min-h-screen bg-background-light p-4 md:p-8 font-display">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl ring-1 ring-black/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Internet Speed Test</h1>
                            <p className="text-sm text-gray-500 font-medium">Browser-based connectivity check</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={startTest}
                            disabled={isRunning}
                            className="macos-primary-button h-11 min-w-[130px] bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Start Test
                        </Button>
                        <Button
                            variant="outline"
                            onClick={stopTest}
                            disabled={!isRunning && status !== 'complete'}
                            className="h-11 bg-white/50 border-gray-100 text-red-500 hover:bg-red-50 hover:border-red-100"
                        >
                            <Square className="w-4 h-4 mr-2" />
                            {isRunning ? 'Stop' : 'Reset'}
                        </Button>
                    </div>
                </header>

                {/* Main Meter */}
                <div className="relative">
                    <Card className="p-12 border-none shadow-2xl bg-white/70 backdrop-blur-3xl ring-1 ring-black/5 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="text-center space-y-2 z-10">
                            <motion.div
                                className={cn("text-6xl md:text-8xl font-black tabular-nums tracking-tighter", getStageColor(status))}
                                animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
                                transition={{ repeat: isRunning ? Infinity : 0, duration: 2 }}
                            >
                                {status === 'idle' ? 'Start' : getMeterValue()}
                            </motion.div>
                            <div className="text-sm md:text-base font-bold uppercase tracking-widest text-gray-400">
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
                        "p-6 border-none shadow-lg transition-all duration-500",
                        status === 'ping' ? "bg-white ring-2 ring-amber-500 transform scale-105" : "bg-white/40"
                    )}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-amber-500">
                                <Timer className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Ping</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800 tabular-nums">
                                {results.ping ? `${results.ping} ms` : '-'}
                            </div>
                        </div>
                    </Card>

                    {/* Download Card */}
                    <Card className={cn(
                        "p-6 border-none shadow-lg transition-all duration-500",
                        status === 'download' ? "bg-white ring-2 ring-blue-500 transform scale-105" : "bg-white/40"
                    )}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-blue-500">
                                <Download className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Download</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800 tabular-nums">
                                {results.download ? `${results.download} Mbps` : '-'}
                            </div>
                        </div>
                    </Card>

                    {/* Upload Card */}
                    <Card className={cn(
                        "p-6 border-none shadow-lg transition-all duration-500",
                        status === 'upload' ? "bg-white ring-2 ring-purple-500 transform scale-105" : "bg-white/40"
                    )}>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-purple-500">
                                <Upload className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Upload</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-800 tabular-nums">
                                {results.upload ? `${results.upload} Mbps` : '-'}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl mx-auto max-w-fit">
                    <Info className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Runs locally • No data stored • Uses public test files • Open source
                    </span>
                </div>
            </div>
        </div>
    );
}
