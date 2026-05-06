"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Cpu, Lock, Globe, Heart, ArrowLeft, Braces, Code2, Coffee } from "lucide-react";
import Link from "next/link";
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import Footer from "@/components/ui/Footer";

export default function AboutPage() {
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.8,
                ease: [0.23, 1, 0.32, 1],
            },
        }),
    };

    return (
        <div className="min-h-screen bg-(--background) text-(--text-primary) font-display flex flex-col selection:bg-primary/30 antialiased overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between backdrop-blur-md border-b border-(--border-subtle) bg-(--background)/80">
                <div className="flex items-center gap-4">
                    <Link href="/" className="group p-2 rounded-xl hover:bg-(--surface-active) transition-colors">
                        <ArrowLeft className="w-5 h-5 text-(--text-muted) group-hover:text-(--text-primary) transition-colors" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-primary">About</h1>
                        <p className="text-[10px] text-(--text-muted) font-mono">mission.philosphy.privacy</p>
                    </div>
                </div>
                <ReturnToToolsButton />
            </header>

            <main className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 space-y-24">
                {/* Hero Section */}
                <section className="text-center space-y-6">
                    <motion.h2
                        custom={1}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInUp}
                        className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]"
                    >
                        Universal tools for <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary to-blue-500">everyone.</span>
                        <br />
                        Zero tracking. Zero servers.
                    </motion.h2>
                    
                    <motion.p
                        custom={2}
                        initial="hidden"
                        animate="visible"
                        variants={fadeInUp}
                        className="text-lg md:text-xl text-(--text-secondary) max-w-2xl mx-auto leading-relaxed"
                    >
                        toolbase is a suite of professional utilities that run entirely in your browser. 
                        No data ever leaves your machine. No account required. Just open and use.
                    </motion.p>
                </section>

                {/* Core Pillars */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Lock,
                            title: "Privacy Guaranteed",
                            desc: "All processing happens client-side. We don't have servers to upload your data to even if we wanted to.",
                            color: "text-emerald-500",
                            bg: "bg-emerald-500/10"
                        },
                        {
                            icon: Zap,
                            title: "Instant Start",
                            desc: "No signups, no installation, no configurations. Open a tool, drop your file, and get results immediately.",
                            color: "text-amber-500",
                            bg: "bg-amber-500/10"
                        },
                        {
                            icon: Globe,
                            title: "Works Offline",
                            desc: "Once loaded, toolbase works entirely offline. Perfect for secure environments and high-privacy workflows.",
                            color: "text-blue-500",
                            bg: "bg-blue-500/10"
                        }
                    ].map((pillar, i) => (
                        <motion.div
                            key={i}
                            custom={i + 3}
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            className="p-8 rounded-3xl border border-(--border-medium) bg-(--surface-overlay) hover:border-(--border-subtle) transition-all group"
                        >
                            <div className={`w-12 h-12 rounded-2xl ${pillar.bg} ${pillar.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <pillar.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold mb-3">{pillar.title}</h3>
                            <p className="text-sm text-(--text-secondary) leading-relaxed">{pillar.desc}</p>
                        </motion.div>
                    ))}
                </section>

                {/* Tech Stack / How it works */}
                <section className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight">The Technology</h2>
                        <p className="text-(--text-secondary) max-w-xl mx-auto text-sm">
                            We push the boundaries of what's possible in the browser to deliver native-quality performance without the privacy risks of cloud computing.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-3xl border border-(--border-medium) bg-gradient-to-br from-(--surface-secondary)/50 to-transparent space-y-4">
                            <div className="flex items-center gap-3">
                                <Cpu className="w-5 h-5 text-violet-500" />
                                <h4 className="font-bold">WebAssembly (WASM)</h4>
                            </div>
                            <p className="text-xs text-(--text-secondary) leading-relaxed">
                                Heavy-duty processing like image manipulation, PDF parsing, and secret redaction is handled by high-performance WASM engines compiled from Rust and C++. This gives you desktop-grade speed right in your browser tab.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl border border-(--border-medium) bg-gradient-to-br from-(--surface-secondary)/50 to-transparent space-y-4">
                            <div className="flex items-center gap-3">
                                <Braces className="w-5 h-5 text-sky-500" />
                                <h4 className="font-bold">Python WASM (Pyodide)</h4>
                            </div>
                            <p className="text-xs text-(--text-secondary) leading-relaxed">
                                Some of our tools leverage the full power of Python through Pyodide. This allows us to use mature data science and processing libraries entirely client-side, ensuring complex logic remains private and local.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl border border-(--border-medium) bg-gradient-to-br from-(--surface-secondary)/50 to-transparent space-y-4">
                            <div className="flex items-center gap-3">
                                <Code2 className="w-5 h-5 text-emerald-500" />
                                <h4 className="font-bold">Web Workers</h4>
                            </div>
                            <p className="text-xs text-(--text-secondary) leading-relaxed">
                                All computation is offloaded to background threads. This keeps the UI responsive and buttery smooth, even when you're processing large datasets or complex transformations.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl border border-(--border-medium) bg-gradient-to-br from-(--surface-secondary)/50 to-transparent space-y-4">
                            <div className="flex items-center gap-3">
                                <Coffee className="w-5 h-5 text-orange-500" />
                                <h4 className="font-bold">Next.js & TypeScript</h4>
                            </div>
                            <p className="text-xs text-(--text-secondary) leading-relaxed">
                                Built with modern engineering standards to ensure reliability, type safety, and a lightning-fast experience. toolbase is designed to be a durable, long-term companion for your workflow.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Open Source / Community */}
                <section className="p-12 rounded-[40px] bg-primary/5 border border-primary/10 text-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] -z-10" />
                    
                    <Heart className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight">Open for Everyone.</h2>
                        <p className="text-(--text-secondary) max-w-lg mx-auto leading-relaxed text-sm">
                            toolbase is built and maintained by the Open Build Network. We believe that critical utilities should be transparent, free, and accessible to everyone. We invite contributions from curious people to develop more tools and take this application to a new level.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <a 
                            href="https://github.com/openbuildnetwork/toolbase" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-8 py-3 rounded-2xl bg-(--text-primary) text-(--background) font-bold text-sm hover:scale-105 transition-transform"
                        >
                            Contribute on GitHub
                        </a>
                        <Link 
                            href="/"
                            className="px-8 py-3 rounded-2xl border border-(--border-subtle) bg-(--surface-overlay) font-bold text-sm hover:bg-(--surface-hover) transition-all"
                        >
                            Explore Tools
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
