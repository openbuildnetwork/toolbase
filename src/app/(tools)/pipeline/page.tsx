'use client';

import React, { useState } from 'react';
import { Layers, Zap, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { FlowCanvas } from '@/components/features/pipeline/FlowCanvas';
import { ToolSidebar, ToolSidebarItem } from '@/components/ui/ToolSidebar';
import { cn } from '@/lib/utils';

// TIP tools are now declaratively registered in TOOLS registry.


const SIDEBAR_ITEMS: ToolSidebarItem[] = [
    { id: 'builder', label: 'Pipeline Builder', icon: Layers },
    { id: 'about', label: 'About TIP', icon: Info },
];

export default function PipelinePage() {
    const [activeTab, setActiveTab] = useState('builder');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen overflow-hidden bg-[#1f1f1f]">
            <ToolSidebar
                title="Pipeline"
                items={SIDEBAR_ITEMS}
                activeId={activeTab}
                onSelect={setActiveTab}
                isOpen={isSidebarOpen}
                onToggle={setSidebarOpen}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
                {/* Header (optional, if you want a top bar above the canvas Toolbar) */}
                <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-10 w-full">
                    <div className={cn('flex items-center gap-2 transition-all duration-300', !isSidebarOpen && 'pl-12')}>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-violet-500" />
                            <span className="font-semibold text-gray-800">Pipeline Builder</span>
                            <span className="text-gray-300">/</span>
                            <span>{SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-100 rounded-full">
                        <Zap className="w-3 h-3 text-violet-500" />
                        <span className="text-xs text-violet-600 font-medium">TIP v1.0</span>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 w-full h-full relative overflow-hidden">
                    {activeTab === 'builder' && (
                        <motion.div
                            key="builder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.25 }}
                            className="w-full h-full"
                        >
                            <FlowCanvas />
                        </motion.div>
                    )}

                    {activeTab === 'about' && (
                        <motion.div
                            key="about"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25 }}
                            className="max-w-2xl mx-auto px-4 py-8 overflow-y-auto h-full"
                        >
                            <div className="prose prose-sm text-gray-700">
                                <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-violet-600" />
                                    </div>
                                    About TIP
                                </h1>

                                <div className="space-y-6">
                                    <div className="p-5 rounded-2xl border border-violet-100 bg-violet-50/40">
                                        <h2 className="text-sm font-bold text-violet-800 mb-2">What is TIP?</h2>
                                        <p className="text-sm text-violet-700 leading-relaxed">
                                            The <strong>Toolbase Interoperability Protocol</strong> (TIP) is the internal protocol
                                            that makes tools chain together. Every tool declares what content types it accepts
                                            and what it produces. TIP automatically discovers valid paths between them.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            { label: 'Privacy guarantee', text: 'All processing happens in your browser. No files are uploaded. Data never leaves your machine.' },
                                            { label: 'Content-type routing', text: 'The registry enforces type safety. You can\'t chain incompatible tools — TIP will only show you valid next steps.' },
                                            { label: 'Cross-family chaining', text: 'A PDF tool can hand off to an image tool via the PDF-to-Images bridge step. TIP handles the type transition transparently.' },
                                            { label: 'Presets', text: 'Presets are built-in pipeline definitions that showcase useful workflows. Load one, customise it, and save your version.' },
                                            { label: 'Export & import', text: 'Pipelines are plain JSON. Share them with your team, commit to version control, or load them from anywhere.' },
                                        ].map((item) => (
                                            <div key={item.label} className="p-4 rounded-xl border border-gray-100 bg-white">
                                                <h3 className="text-xs font-bold text-gray-800 mb-1">{item.label}</h3>
                                                <p className="text-xs text-gray-500 leading-relaxed">{item.text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-600">
                                        <div className="text-gray-400 mb-2">// Example: TIP discovers this path automatically</div>
                                        <div className="text-violet-600">application/pdf</div>
                                        <div className="pl-4 text-gray-500">→ magic-pdf/compress</div>
                                        <div className="pl-4 text-gray-500">→ magic-pdf/pdf-to-images</div>
                                        <div className="pl-4 text-gray-500">→ pixel-axe/compress</div>
                                        <div className="text-emerald-600">image/png ✓</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
