"use client";

import React from "react";
import { m } from "framer-motion";
import { 
    Zap, 
    ChevronRight, 
    Settings2,
    FileCode,
    ShieldCheck,
    Cpu,
    ExternalLink,
    Plus
} from "lucide-react";

import { useRouter, usePathname } from "next/navigation";
import { TIPToolRegistry } from "@/tip/registry";
import { useGraphSerializer } from "@/app/(tools)/pipeline/components/hooks/useGraphSerializer";
import { cn } from "@/lib/utils";

interface PipelineStep {
    toolId: string;
    config: Record<string, unknown>;
}

interface PipelineData {
    name: string;
    steps: PipelineStep[];
}

interface PipelineSuggestionProps {
    data: PipelineData;
}

export function PipelineSuggestion({ data }: PipelineSuggestionProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { pipelineToGraph } = useGraphSerializer();

    const isPipelineBuilder = pathname === "/pipeline";

    const handleOpen = () => {
        // 1. Generate the graph from the suggested steps
        const { nodes, edges } = pipelineToGraph({
            id: `ai-suggested-${Date.now()}`,
            name: data.name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            steps: data.steps.map((s, i) => ({
                id: `step-${i}`,
                ...s
            }))
        } as unknown as Parameters<typeof pipelineToGraph>[0]);

        // 2. Save to draft storage for cross-page navigation
        localStorage.setItem('toolbase:pipeline-draft', JSON.stringify({ nodes, edges }));

        // 3. Handle injection
        if (isPipelineBuilder) {
            // Dispatch custom event to notify FlowCanvas to inject nodes
            const event = new CustomEvent('toolbase:inject-pipeline', { 
                detail: { nodes, edges } 
            });
            window.dispatchEvent(event);
        } else {
            // Navigate to pipeline builder
            router.push("/pipeline");
        }
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 p-4 rounded-2xl bg-(--surface-secondary) border border-blue-500/30 shadow-lg shadow-blue-500/10 overflow-hidden relative group"
        >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500" />
            
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Zap className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                </div>
                <div>
                    <h4 className="font-bold text-(--text-primary) flex items-center gap-2">
                        {data.name}
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI Suggestion</span>
                    </h4>
                    <p className="text-xs text-(--text-secondary)">Intelligent Tool Chain</p>
                </div>
            </div>

            {/* Step Sequence */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {data.steps.map((step, idx) => {
                    const tool = TIPToolRegistry.get(step.toolId);
                    return (
                        <React.Fragment key={idx}>
                            <div className="flex-none flex flex-col items-center gap-2 p-3 rounded-xl bg-(--surface-hover) border border-(--border-subtle) min-w-[120px]">
                                <div className="w-8 h-8 rounded-lg bg-(--surface-secondary) flex items-center justify-center border border-(--border-subtle)">
                                    {getToolIcon(step.toolId)}
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight truncate w-full">
                                    {tool?.name || step.toolId}
                                </span>
                            </div>
                            {idx < data.steps.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-(--text-muted) shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex -space-x-2">
                    {data.steps.map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-(--surface-hover) border-2 border-(--surface-secondary) ring-1 ring-blue-500/20 flex items-center justify-center">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={handleOpen}
                    className={cn(
                        "relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300",
                        "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
                        "shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]",
                        "hover:scale-[1.02] active:scale-[0.98] overflow-hidden group/btn"
                    )}
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                    {isPipelineBuilder ? (
                        <>
                            <Plus className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">Add to Canvas</span>
                        </>
                    ) : (
                        <>
                            <ExternalLink className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">Open in Pipeline</span>
                        </>
                    )}
                </button>
            </div>
        </m.div>
    );
}

function getToolIcon(toolId: string) {
    if (toolId.includes('redact')) return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    if (toolId.includes('format') || toolId.includes('beautify')) return <FileCode className="w-4 h-4 text-amber-500" />;
    if (toolId.includes('magic-pdf')) return <FileCode className="w-4 h-4 text-red-500" />;
    if (toolId.includes('pixels')) return <Settings2 className="w-4 h-4 text-purple-500" />;
    return <Cpu className="w-4 h-4 text-blue-500" />;
}
