"use client";

import React, { useState } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { SUPPORTED_MODELS, WebLLMModel } from "@/hooks/useWebLLM";
import { ChevronDown, Cpu, Sparkles, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModelPicker() {
  const { activeModelId, loadModel, isLoading, isGenerating } = useAIChat();
  const [isOpen, setIsOpen] = useState(false);

  // Fallback to first recommended model if no active model
  const activeModel = SUPPORTED_MODELS.find(m => m.id === activeModelId) || SUPPORTED_MODELS[0];

  const handleSelect = async (model: WebLLMModel) => {
    setIsOpen(false);
    if (model.id !== activeModelId) {
      // Force reload to completely switch the active engine
      await loadModel(model.id, true);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isGenerating}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border bg-(--background) transition-all duration-200 text-sm font-medium hover:bg-(--surface-hover) disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen ? "border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]" : "border-(--border-subtle)"
        )}
      >
        <Sparkles className="w-4 h-4 text-blue-500" />
        <span className="text-(--text-primary)">{activeModel.name}</span>
        {isLoading || isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin text-(--text-muted) ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 text-(--text-muted) ml-1" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[120]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-72 rounded-2xl border border-(--border-subtle) bg-(--surface-overlay) p-2 shadow-xl backdrop-blur-xl z-[130]">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-(--text-faint)">
              Available AI Models
            </div>
            <div className="space-y-1 mt-1">
              {SUPPORTED_MODELS.map((model) => {
                const isActive = model.id === activeModelId;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-150 text-left group",
                      isActive ? "bg-blue-500/10" : "hover:bg-(--surface-hover)"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-colors",
                      isActive ? "text-blue-500 bg-blue-500/10" : "text-(--text-faint) group-hover:text-(--text-muted)"
                    )}>
                      {isActive ? <Check className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={cn("font-medium text-sm transition-colors", isActive ? "text-blue-500" : "text-(--text-primary) group-hover:text-(--text-primary)")}>
                          {model.name}
                        </div>
                        {model.recommended && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-green-500/20 text-green-600 uppercase font-bold tracking-wider">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-(--text-muted) mt-0.5 leading-relaxed group-hover:text-(--text-secondary) transition-colors">
                        {model.description}
                      </div>
                      <div className="text-[10px] text-(--text-faint) mt-1 font-mono">
                        VRAM: ~{(model.vramMb / 1024).toFixed(1)} GB
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 px-3 py-2 border-t border-(--border-subtle) text-[11px] text-(--text-muted) flex items-start gap-2 bg-(--background)/50 rounded-b-xl">
               <Cpu className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
               Larger models require more free VRAM. If your browser crashes, it will auto-recover to a safe state.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
