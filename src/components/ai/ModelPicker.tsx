"use client";

import React, { useState, useRef } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { SUPPORTED_MODELS, WebLLMModel } from "@/hooks/useWebLLM";
import { ChevronDown, Cpu, Sparkles, Check, Loader2, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";

export function ModelPicker() {
  const { activeModelId, loadModel, isLoading, isGenerating } = useAIChat();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback to first recommended model if no active model
  const activeModel = SUPPORTED_MODELS.find(m => m.id === activeModelId) || SUPPORTED_MODELS[0];

  const handleSelect = async (model: WebLLMModel) => {
    setIsOpen(false);
    if (model.id !== activeModelId) {
      await loadModel(model.id, true);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <m.button 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isGenerating}
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 text-xs font-semibold hover:bg-(--surface-hover) disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen 
            ? "bg-(--surface-hover) text-(--text-primary)" 
            : "text-(--text-muted) hover:text-(--text-primary)"
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
        <span className="text-(--text-secondary) group-hover:text-(--text-primary) transition-colors">{activeModel.name}</span>
        {isLoading || isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-0.5" />
        ) : (
          <ChevronDown className={cn("w-3 h-3 text-(--text-muted) ml-0.5 transition-transform duration-300", isOpen && "rotate-180")} />
        )}
      </m.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120]" 
              onClick={() => setIsOpen(false)} 
            />
            <m.div 
              initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: -10, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-full left-0 mb-3 w-[calc(100vw-32px)] sm:w-[360px] rounded-[24px] border border-(--border-subtle) bg-(--surface-overlay)/95 p-2 shadow-2xl backdrop-blur-2xl z-[130] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-(--border-subtle) mb-1 bg-(--surface-elevated)/30 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-(--text-faint) flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  Compute Intelligence
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-(--surface-hover) text-(--text-muted) transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-[400px] p-1 scrollbar-none">
                {SUPPORTED_MODELS.map((model, index) => {
                  const isActive = model.id === activeModelId;
                  return (
                    <m.button
                      key={model.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4, backgroundColor: "var(--surface-hover)" }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect(model)}
                      className={cn(
                        "w-full flex items-start gap-4 p-3.5 rounded-[18px] transition-all duration-200 text-left group relative",
                        isActive 
                          ? "bg-blue-500/10 border border-blue-500/20 shadow-sm" 
                          : "border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 flex items-center justify-center w-6 h-6 rounded-xl shrink-0 transition-all duration-300",
                        isActive 
                          ? "text-blue-500 bg-blue-500/20 scale-110" 
                          : "text-(--text-faint) bg-(--surface-elevated) group-hover:text-blue-500 group-hover:bg-blue-500/10"
                      )}>
                        {isActive ? <Check className="w-4 h-4" /> : <Zap className="w-3.5 h-3.5" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("font-bold text-[14px] tracking-tight transition-colors", isActive ? "text-blue-500" : "text-(--text-primary)")}>
                            {model.name}
                          </div>
                          {model.recommended && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 uppercase font-black tracking-tighter">
                              Best
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-(--text-muted) leading-snug font-medium group-hover:text-(--text-secondary) transition-colors line-clamp-2">
                          {model.description}
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-(--text-faint) bg-(--background)/50 px-2 py-0.5 rounded-md">
                            <Cpu className="w-3 h-3" />
                            { (model.vramMb / 1024).toFixed(1) }GB VRAM
                          </div>
                          <div className="h-1 w-1 rounded-full bg-(--border-subtle)" />
                          <div className="text-[10px] font-bold text-(--text-faint)">
                            {model.contextWindowTokens.toLocaleString()} Context
                          </div>
                        </div>
                      </div>
                    </m.button>
                  );
                })}
              </div>
              
              <div className="mt-2 p-3 bg-blue-500/5 rounded-[18px] border border-blue-500/10 flex items-start gap-3">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-blue-500" />
                 </div>
                 <p className="text-[10px] text-(--text-muted) leading-relaxed">
                    Models run 100% locally on your WebGPU. Choose based on your hardware capabilities.
                 </p>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
