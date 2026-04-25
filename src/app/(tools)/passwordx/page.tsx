'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox'; // Assuming this is now created
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';
import {
    RefreshCw,
    CheckCircle2,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PasswordGeneratorPage() {
    // State
    const [password, setPassword] = useState('');
    const [length, setLength] = useState(16);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [strength, setStrength] = useState(0);
    const [showToast, setShowToast] = useState(false);

    // Character Sets
    const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
    const NUMBERS = '0123456789';
    const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const generatePassword = useCallback(() => {
        let chars = '';
        if (includeUppercase) chars += UPPERCASE;
        if (includeLowercase) chars += LOWERCASE;
        if (includeNumbers) chars += NUMBERS;
        if (includeSymbols) chars += SYMBOLS;

        if (chars === '') {
            setPassword('');
            setStrength(0);
            return;
        }

        let generated = '';
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            generated += chars[array[i] % chars.length];
        }

        setPassword(generated);
        calculateStrength(generated);
    }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return setStrength(0);

        if (pass.length > 8) score += 1;
        if (pass.length > 12) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        setStrength(score);
    };

    const getStrengthLabel = () => {
        switch (strength) {
            case 0: return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
            case 1: return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
            case 2: return { label: 'Fair', color: 'bg-yellow-500', text: 'text-yellow-600' };
            case 3: return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
            case 4: return { label: 'Strong', color: 'bg-green-500', text: 'text-green-600' };
            case 5: return { label: 'Excellent', color: 'bg-emerald-500', text: 'text-emerald-600' };
            default: return { label: 'Weak', color: 'bg-gray-200', text: 'text-gray-400' };
        }
    };

    // Generate on initial load
    useEffect(() => {
        generatePassword();
    }, [generatePassword]);

    return (
        <div className="min-h-screen bg-linear-to-br from-(--background) to-(--surface-secondary) py-6 px-4 relative">
            <div className="absolute top-6 right-6">
                <ReturnToToolsButton />
            </div>
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit mx-auto">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Running Locally (WASM)
                        </span>
                    </div>

                    <div>
                        <h1 className="text-4xl font-bold text-(--text-primary) mb-2 flex items-center justify-center gap-3">
                            <Lock className="w-10 h-10 text-(--primary)" />
                            PasswordX
                        </h1>
                        <p className="text-(--text-secondary) max-w-lg mx-auto text-balance">
                            Generate cryptographically secure passwords instantly. Your data never leaves this browser.
                        </p>
                    </div>
                </div>

                <Card className="p-6 bg-(--surface-overlay) border border-(--border-subtle) shadow-xl rounded-2xl ring-1 ring-black/5 dark:ring-white/5">
                    {/* Password Display */}
                    <div className="relative mb-6">
                        <div
                            onClick={() => {
                                if (password) {
                                    navigator.clipboard.writeText(password);
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                }
                            }}
                            className="flex items-center justify-between p-4 bg-(--surface-secondary) rounded-xl border border-(--border-subtle) group hover:border-(--primary)/30 transition-all cursor-pointer hover:bg-(--surface-hover) active:scale-[0.99]"
                            title="Click to copy"
                        >
                            <div className="font-mono text-xl md:text-2xl break-all text-(--text-primary) tracking-wide">
                                {password || <span className="text-(--text-muted) text-base italic">Select options to generate</span>}
                            </div>
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                                <div onClick={(e) => e.stopPropagation()}>
                                    <CopyToClipboard text={password} showText={false} />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        generatePassword();
                                    }}
                                    className="p-2 hover:bg-(--surface-hover) rounded-lg text-(--text-secondary)"
                                    title="Regenerate"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Soft Alert / Toast */}
                        <AnimatePresence>
                            {showToast && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 bg-(--surface-elevated) text-(--text-primary) px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-(--border-subtle) flex items-center gap-2 z-10"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Password Copied!
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Strength Indicator */}
                        {password && (
                            <div className="absolute -bottom-3 left-4 px-2 py-0.5 bg-(--surface-overlay) rounded-full border border-(--border-subtle) shadow-sm flex items-center gap-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className={`w-5 h-1.5 rounded-full transition-colors ${i <= strength ? getStrengthLabel().color : 'bg-(--surface-secondary)'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className={`text-xs font-semibold ${getStrengthLabel().text}`}>
                                    {getStrengthLabel().label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6 mt-8">
                        {/* Length Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-(--text-secondary)">
                                    Password Length
                                </label>
                                <Input
                                    type="number"
                                    min={4}
                                    max={64}
                                    value={length}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value);
                                        if (!isNaN(newValue)) {
                                            // Strictly enforce max length during typing
                                            if (newValue > 64) {
                                                setLength(64);
                                            } else {
                                                setLength(newValue);
                                            }
                                        } else if (e.target.value === '') {
                                            setLength(0);
                                        }
                                    }}
                                    onBlur={() => {
                                        if (length < 4) setLength(4);
                                        if (length > 64) setLength(64);
                                    }}
                                    className="w-20 h-9 text-center bg-(--input-bg) border-(--border-subtle) focus:border-(--primary)/50"
                                />
                            </div>
                            <Slider
                                min={4}
                                max={64}
                                step={1}
                                value={length || 4} // Fallback to min if length is 0/NaN during editing
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Character Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { checked: includeUppercase, onChange: setIncludeUppercase, label: "Uppercase (A-Z)" },
                                { checked: includeLowercase, onChange: setIncludeLowercase, label: "Lowercase (a-z)" },
                                { checked: includeNumbers, onChange: setIncludeNumbers, label: "Numbers (0-9)" },
                                { checked: includeSymbols, onChange: setIncludeSymbols, label: "Symbols (!@#$)" }
                            ].map((opt, idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-(--border-subtle) hover:border-(--primary)/20 hover:bg-(--primary)/5 transition-colors">
                                    <Checkbox
                                        checked={opt.checked}
                                        onChange={(e) => opt.onChange(e.target.checked)}
                                        label={opt.label}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-(--border-subtle)">
                        <Button
                            onClick={generatePassword}
                            className="w-full bg-(--primary) hover:bg-(--primary-hover) text-white shadow-lg shadow-(--primary)/25 h-12 text-lg font-semibold rounded-xl"
                        >
                            Generate Password
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
