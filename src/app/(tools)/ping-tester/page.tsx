"use client";

import React, { useEffect, useRef } from "react";
import {
    Activity,
    Play,
    Square,
    Trash2,
    Settings2,
    Terminal,
    Info,
    Globe,
    Zap,
    Hash,
    Timer,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { usePingTester } from "@/hooks/usePingTester";

export default function PingTesterPage() {
    const {
        results,
        isRunning,
        startPing,
        stopPing,
        clearResults,
        stats,
        target,
        setTarget,
        options,
        setOptions
    } = usePingTester();

    const outputRef = useRef<HTMLDivElement>(null);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [results]);

    const handleStart = () => {
        if (!target) return;
        startPing(target, options);
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <span className="text-emerald-500 font-bold px-2 py-0.5 bg-emerald-500/10 rounded text-[10px] uppercase">Success</span>;
            case 'timeout':
                return <span className="text-amber-500 font-bold px-2 py-0.5 bg-amber-500/10 rounded text-[10px] uppercase">Timeout</span>;
            case 'error':
                return <span className="text-red-500 font-bold px-2 py-0.5 bg-red-500/10 rounded text-[10px] uppercase">Error</span>;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background-light p-4 md:p-8 font-display">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header / Top Toolbar */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl ring-1 ring-black/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Ping Tester</h1>
                            <p className="text-sm text-gray-500 font-medium">HTTP-based latency connectivity check</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[280px]">
                            <Input
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                placeholder="example.com or 8.8.8.8"
                                className="h-11 bg-white/50"
                                disabled={isRunning}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleStart}
                                disabled={isRunning || !target}
                                className="macos-primary-button h-11 min-w-[130px]"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Start Ping
                            </Button>
                            <Button
                                variant="outline"
                                onClick={stopPing}
                                disabled={!isRunning}
                                className="h-11 bg-white/50 border-gray-100 text-red-500 hover:bg-red-50 hover:border-red-100"
                            >
                                <Square className="w-4 h-4 mr-2" />
                                Stop
                            </Button>
                            <Button
                                variant="outline"
                                onClick={clearResults}
                                className="h-11 bg-white/50 border-gray-100 hover:bg-gray-50"
                                disabled={isRunning || results.length === 0}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Output & Summary */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Results Output */}
                        <div className="flex flex-col h-full space-y-3 min-h-[500px]">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Terminal className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Ping Output</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-500">
                                    <Info className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase">HTTP Mode</span>
                                </div>
                            </div>
                            <Card className="flex-1 overflow-hidden border-none shadow-2xl bg-gray-950/95 backdrop-blur-3xl ring-1 ring-white/10 flex flex-col group">
                                <div
                                    ref={outputRef}
                                    className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                                >
                                    <div className="font-mono text-sm space-y-1.5">
                                        {results.length === 0 ? (
                                            <div className="text-gray-500 italic">Ready to ping...</div>
                                        ) : (
                                            results.map((res, i) => (
                                                <div key={i} className="flex items-start gap-4 py-0.5 border-b border-white/5 last:border-0">
                                                    <span className="text-gray-500 shrink-0">[{res.timestamp}]</span>
                                                    <span className="text-blue-400 shrink-0">Target: {res.host}</span>
                                                    <span className="flex-1 text-gray-300">
                                                        {res.latency !== null ? `time=${res.latency}ms` : '---'}
                                                    </span>
                                                    <div className="shrink-0">
                                                        {renderStatusBadge(res.status)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {isRunning && (
                                            <div className="flex items-center gap-2 text-blue-400 font-bold animate-pulse mt-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                Pinging...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                            <AnimatePresence>
                                {results.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                                    >
                                        {[
                                            { label: 'Sent', value: stats.sent, icon: <Hash className="w-3.5 h-3.5" />, color: 'blue' },
                                            { label: 'Received', value: stats.received, icon: <Play className="w-3.5 h-3.5" />, color: 'emerald' },
                                            { label: 'Loss', value: `${stats.lossRate}%`, icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'red' },
                                            { label: 'Avg Latency', value: `${stats.avg}ms`, icon: <Timer className="w-3.5 h-3.5" />, color: 'purple' },
                                        ].map((stat, i) => (
                                            <Card key={i} className="p-4 border-none shadow-lg bg-white/70 backdrop-blur-xl">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-gray-400">
                                                        {stat.icon}
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                                                    </div>
                                                    <div className={cn(
                                                        "text-2xl font-black",
                                                        stat.color === 'blue' && "text-blue-600",
                                                        stat.color === 'emerald' && "text-emerald-600",
                                                        stat.color === 'red' && "text-red-600",
                                                        stat.color === 'purple' && "text-purple-600",
                                                    )}>
                                                        {stat.value}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Summary Stats */}

                    </div>

                    {/* Right Column: Configuration & Notes */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-none shadow-lg bg-white/70 backdrop-blur-xl ring-1 ring-black/5">
                            <div className="px-6 py-4 border-b border-gray-100 bg-white/30">
                                <div className="flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-gray-500" />
                                    <span className="font-bold text-sm text-gray-900 uppercase tracking-tight">Configuration</span>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-gray-500">Target Host</Label>
                                        <Input
                                            value={target}
                                            onChange={(e) => setTarget(e.target.value)}
                                            placeholder="example.com"
                                            className="h-10 bg-white/50"
                                            disabled={isRunning}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-gray-500">Packet Count</Label>
                                            <Input
                                                type="number"
                                                value={options.packetCount}
                                                onChange={(e) => setOptions(prev => ({ ...prev, packetCount: parseInt(e.target.value) || 4 }))}
                                                className="h-10 bg-white/50"
                                                disabled={isRunning}
                                                min={1}
                                                max={100}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase text-gray-500">Interval (ms)</Label>
                                            <Input
                                                type="number"
                                                value={options.interval}
                                                onChange={(e) => setOptions(prev => ({ ...prev, interval: parseInt(e.target.value) || 1000 }))}
                                                className="h-10 bg-white/50"
                                                disabled={isRunning}
                                                min={100}
                                                max={10000}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-100 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-bold text-gray-700">Client-Side Only</h4>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                                Tests are conducted directly from your browser. No data leaves your machine.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-bold text-gray-700">HTTP Latency Check</h4>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">
                                                Uses HTTP requests instead of ICMP. Measures time-to-first-byte (TTFB) or equivalent.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Transparency Note */}
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                Runs locally • No data stored • HTTP check
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
