"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { OllamaSetup } from "@/components/ai/OllamaSetup";
import { ChatInterface } from "@/components/ai/ChatInterface";
import { cn } from "@/lib/utils";
import { DEFAULT_WEBLLM_MODEL_ID } from "@/hooks/useWebLLM";

export function GlobalAIOverlay() {
  const { isOpen, closeChat, isLoaded, isInstalled } = useAIChat();
  const targetModel = DEFAULT_WEBLLM_MODEL_ID;
  
  const [width, setWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < window.innerWidth * 0.8) {
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-sm transition-opacity"
          onClick={closeChat}
        />
      )}

      <div 
        ref={resizeRef}
        className={cn(
          "fixed inset-y-0 right-0 z-[110] flex h-[100dvh] flex-col border-l border-(--border-subtle) bg-(--background) text-(--text-primary) shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ 
          width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : `${width}px`,
          transition: isResizing ? 'none' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 150ms ease-out'
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute left-[-6px] top-0 hidden h-full w-[12px] cursor-col-resize items-center justify-center bg-transparent transition-all group/resize sm:flex z-[120]",
            isResizing && "bg-blue-500/10"
          )}
        >
          <div className={cn(
            "h-12 w-1 rounded-full bg-blue-500/20 transition-all group-hover/resize:bg-blue-500/50 group-hover/resize:h-24",
            isResizing && "bg-blue-500 h-32"
          )} />
        </div>

        <div className="flex-1 overflow-hidden">
          {(!isLoaded && !isInstalled) ? (
            <div className="flex h-full w-full items-center p-4 py-8">
              <div className="w-full">
                <OllamaSetup targetModel={targetModel} onReady={() => {}} onClose={closeChat} />
              </div>
            </div>
          ) : (
            <ChatInterface 
              onClose={closeChat} 
              onSetupRequired={() => {}} 
            />
          )}
        </div>
      </div>
    </>
  );
}
