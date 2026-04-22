'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';
import { Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import cronstrue from 'cronstrue';
import { parseEnglishToCron } from '@/lib/cron-parser';

export default function CronGeneratorPage() {
    const [prompt, setPrompt] = useState('every day at midnight');
    const [cronExpression, setCronExpression] = useState('0 0 * * *');
    const [cronDescription, setCronDescription] = useState('Every day at 12:00 AM');
    const [showToast, setShowToast] = useState(false);
    const [error, setError] = useState('');

    const generateCron = useCallback(() => {
        if (!prompt.trim()) {
            setError('Please enter a description.');
            setCronExpression('');
            setCronDescription('');
            return;
        }

        const parsed = parseEnglishToCron(prompt);
        if (parsed) {
            setCronExpression(parsed);
            try {
                setCronDescription(cronstrue.toString(parsed));
                setError('');
            } catch (err) {
                setError('Generated an invalid cron expression.');
            }
        } else {
            setError("Could not understand that pattern. Try something like 'every 5 minutes' or 'every monday at 9am'.");
            setCronExpression('');
            setCronDescription('');
        }
    }, [prompt]);

    // Handle enter key to submit
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            generateCron();
        }
    };

    // Initial load
    useEffect(() => {
        generateCron();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full w-fit mx-auto">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                            Local Tool
                        </span>
                    </div>

                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                            <Clock className="w-10 h-10 text-primary" />
                            Cron Generator
                        </h1>
                        <p className="text-gray-600 max-w-lg mx-auto">
                            Describe your schedule in simple English and instantly get the Linux cron expression.
                        </p>
                    </div>
                </div>

                <Card className="p-6 bg-white border border-gray-200 shadow-xl rounded-2xl">
                    <div className="space-y-6">
                        {/* Input Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                English Prompt
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="e.g. every 15 minutes, every friday at 6pm"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 rounded-xl"
                                />
                                <Button
                                    onClick={generateCron}
                                    className="px-6 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                                >
                                    Generate
                                </Button>
                            </div>
                            {error && (
                                <p className="text-red-500 text-sm mt-1">{error}</p>
                            )}
                        </div>

                        {/* Result Section */}
                        <div className="relative mt-8">
                            <div
                                onClick={() => {
                                    if (cronExpression) {
                                        navigator.clipboard.writeText(cronExpression);
                                        setShowToast(true);
                                        setTimeout(() => setShowToast(false), 2000);
                                    }
                                }}
                                className="flex items-center justify-between p-6 bg-gray-50 rounded-xl border border-gray-200 group hover:border-primary/30 transition-all cursor-pointer hover:bg-gray-100/80 active:scale-[0.99]"
                                title="Click to copy cron expression"
                            >
                                <div className="space-y-1">
                                    <div className="font-mono text-xl md:text-3xl text-gray-900 tracking-wider">
                                        {cronExpression || <span className="text-gray-400 text-base italic">No expression generated</span>}
                                    </div>
                                    <div className="text-sm text-gray-500 font-medium">
                                        {cronDescription || 'Waiting for valid input...'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4 shrink-0">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <CopyToClipboard text={cronExpression} showText={false} />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            generateCron();
                                        }}
                                        className="p-2 hover:bg-gray-200 rounded-lg text-gray-600"
                                        title="Regenerate"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Toast */}
                            <AnimatePresence>
                                {showToast && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 z-10"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                        Cron Copied!
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
