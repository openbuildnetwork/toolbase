"use client";

import React, { useState } from "react";

import { Zap, ShieldCheck, Scaling, Image } from "lucide-react";
import { ToolSidebar, ToolSidebarItem } from "@/components/ui/ToolSidebar";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";

// Features
import { CompressImage } from "@/components/features/pixel-axe/CompressImage";
import { UpscaleImage } from "@/components/features/pixel-axe/UpscaleImage";
import { ResizeImage } from "@/components/features/pixel-axe/ResizeImage";
import { Steganography } from "@/components/features/pixel-axe/Steganography";

export default function PixelAxePage() {


    // Sidebar State
    const [activeTool, setActiveTool] = useState('compress');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const tools: ToolSidebarItem[] = [
        { id: 'compress', label: 'Compress Image', icon: Zap },
        { id: 'upscale', label: 'Upscale Image', icon: Scaling, badge: "Beta" },
        { id: 'resize', label: 'Resize Image', icon: Image },
        { id: 'stego', label: 'Hide Data in Img', icon: ShieldCheck, badge: "New" },
    ];

    const activeToolLabel = tools.find(t => t.id === activeTool)?.label || 'Tool';

    return (
        <div className="flex h-screen overflow-hidden bg-[color:var(--background)] relative">
            <ToolSidebar
                title="Pixel Axe"
                items={tools}
                activeId={activeTool}
                onSelect={setActiveTool}
                isOpen={isSidebarOpen}
                onToggle={setSidebarOpen}
            />

            {/* Main Editor Area */}
            <main className="flex-1 overflow-hidden relative bg-transparent flex flex-col">
                <header className="h-14 border-b border-[color:var(--border-subtle)] bg-[var(--surface-overlay)] backdrop-blur-md flex items-center justify-between px-6 transition-all duration-300">
                    <div className={cn("flex items-center gap-2 transition-all duration-300", !isSidebarOpen && "pl-12")}>
                        <div className="flex items-center text-sm text-[color:var(--text-muted)]">
                            <span className="font-semibold text-[color:var(--text-primary)] mr-2">Pixel Axe</span>
                            <span className="text-[color:var(--text-muted)]">/</span>
                            <span className="ml-2">{activeToolLabel}</span>
                        </div>
                    </div>
                    <ReturnToToolsButton />

                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto h-full">
                        <AnimatePresence mode="wait">
                            {activeTool === 'compress' && (
                                <motion.div
                                    key="compress"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    <CompressImage />
                                </motion.div>
                            )}

                            {activeTool === 'upscale' && (
                                <motion.div
                                    key="upscale"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    <UpscaleImage />
                                </motion.div>
                            )}
                            {activeTool === 'resize' && (
                                <motion.div
                                    key="resize"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    <ResizeImage />
                                </motion.div>
                            )}
                            {activeTool === 'stego' && (
                                <motion.div
                                    key="stego"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="h-full"
                                >
                                    <Steganography />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
