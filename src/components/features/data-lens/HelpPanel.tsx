"use client";

import React from "react";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HelpExample {
    title: string;
    description: string;
    code: string;
}

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    introduction?: React.ReactNode;
    examples: HelpExample[];
}

export function HelpPanel({ isOpen, onClose, title, introduction, examples }: HelpPanelProps) {
    const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

    const handleCopy = (code: string, index: number) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop for focus */}
            <div 
                className="absolute inset-0 bg-gray-900/5 backdrop-blur-[1px] z-40 animate-in fade-in duration-500"
                onClick={onClose}
            />
            
            <div className="absolute inset-y-0 right-0 w-85 bg-white border-l border-gray-200 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-50 flex flex-col animate-in slide-in-from-right duration-500 ease-in-out">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-lg tracking-tight">{title}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Documentation & Examples</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600 hover:rotate-90 duration-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {introduction && (
                        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50">
                            {introduction}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 px-1">
                            <div className="h-px flex-1 bg-gray-100"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Examples</span>
                            <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                        
                        {examples.map((example, idx) => (
                            <div key={idx} className="space-y-3 group">
                                <h4 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{example.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{example.description}</p>
                                <div className="relative">
                                    <pre className="bg-gray-50 text-gray-800 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto border border-gray-200 shadow-sm transition-all group-hover:border-indigo-200 group-hover:bg-white group-hover:shadow-md">
                                        {example.code}
                                    </pre>
                                    <button
                                        onClick={() => handleCopy(example.code, idx)}
                                        className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 shadow-sm border border-gray-200 transition-all opacity-0 group-hover:opacity-100"
                                        title="Copy to clipboard"
                                    >
                                        {copiedIndex === idx ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-indigo-600">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-xs">💡</span>
                        </div>
                        <p className="text-[11px] font-medium leading-tight">
                            Table names are automatically derived from your uploaded filenames!
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
