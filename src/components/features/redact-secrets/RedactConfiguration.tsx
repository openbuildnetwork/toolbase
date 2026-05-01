"use client";

import React from "react";
import { Settings2, Key, Type, Hash, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagInput } from "@/components/ui/TagInput";
import { MaskingStyle } from "@/types/redact";

interface RedactConfigurationProps {
    maskingStyle: MaskingStyle;
    setMaskingStyle: (style: MaskingStyle) => void;
    keys: string[];
    setKeys: (keys: string[]) => void;
    literalTexts: string[];
    setLiteralTexts: (texts: string[]) => void;
    regexPatterns: string[];
    setRegexPatterns: (patterns: string[]) => void;
}

export const RedactConfiguration: React.FC<RedactConfigurationProps> = ({
    maskingStyle,
    setMaskingStyle,
    keys,
    setKeys,
    literalTexts,
    setLiteralTexts,
    regexPatterns,
    setRegexPatterns,
}) => {
    return (
        <div className="flex flex-col rounded-2xl border border-(--border-medium) bg-(--surface-overlay) backdrop-blur-xl overflow-hidden shadow-sm dark:shadow-black/20">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-(--border-subtle) bg-(--surface-secondary)/30">
                <Settings2 className="w-4 h-4 text-(--text-muted)" />
                <span className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">Configuration</span>
            </div>

            <div className="p-5 space-y-6">
                {/* Redaction Style */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.12em] text-(--text-muted)">
                        Redaction Style
                    </label>
                    <div className="flex p-1 rounded-xl bg-(--surface-active) border border-(--border-subtle)">
                        {[
                            { id: "partial", label: "Partial", icon: Hash },
                            { id: "full", label: "Full", icon: Type },
                            { id: "hash", label: "Hash", icon: Code },
                        ].map((style) => (
                            <button
                                key={style.id}
                                onClick={() => setMaskingStyle(style.id as MaskingStyle)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                                    maskingStyle === style.id
                                        ? "bg-(--background) text-violet-500 shadow-sm border border-(--border-subtle)"
                                        : "text-(--text-muted) hover:text-(--text-secondary)"
                                )}
                            >
                                <style.icon className="w-3.5 h-3.5" />
                                {style.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-(--text-muted)/70 px-1 italic">
                        {maskingStyle === 'partial' && "Shows start/end bits (e.g. pr...12)"}
                        {maskingStyle === 'full' && "Completely obscures secrets with [REDACTED]"}
                        {maskingStyle === 'hash' && "Replaces with a cryptographic fingerprint"}
                    </p>
                </div>

                {/* Advanced Rules */}
                <div className="space-y-5 pt-5 border-t border-(--border-subtle)">
                    <div className="space-y-4">
                        <TagInput
                            label={
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-(--text-muted) mb-1.5">
                                    <Key className="w-3 h-3 text-blue-500" /> Force Mask Keys
                                </div>
                            }
                            placeholder="e.g. api_key"
                            values={keys}
                            onChange={setKeys}
                            color="blue"
                        />
                        <TagInput
                            label={
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-(--text-muted) mb-1.5">
                                    <Type className="w-3 h-3 text-purple-500" /> Specific Content
                                </div>
                            }
                            placeholder="e.g. MyPassword123"
                            values={literalTexts}
                            onChange={setLiteralTexts}
                            color="purple"
                        />
                        <TagInput
                            label={
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-(--text-muted) mb-1.5">
                                    <Code className="w-3 h-3 text-emerald-500" /> Custom Regex
                                </div>
                            }
                            placeholder="e.g. \b[A-Z0-9._%+-]+@..."
                            values={regexPatterns}
                            onChange={setRegexPatterns}
                            color="emerald"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
