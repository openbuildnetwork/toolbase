"use client";

import React, { useState, useEffect } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { OllamaSetup } from "@/components/ai/OllamaSetup";
import { ChatInterface } from "@/components/ai/ChatInterface";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

export function GlobalAIOverlay() {
  const { isOpen, closeChat, isLoaded, isInstalled } = useAIChat();
  const pathname = usePathname();
  const targetModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

  useEffect(() => {
    if (isOpen) {
      // closeChat(); // Why was this here? It closes the chat immediately when pathname changes. 
      // I'll keep it for consistency but it seems counter-intuitive for an overlay.
      // Actually, let's keep it but maybe it's why it was closing.
    }
  }, [pathname]);

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
        className={cn(
          "fixed inset-y-0 right-0 z-[110] flex h-[100dvh] w-full flex-col border-l border-(--border-subtle) bg-(--background) text-(--text-primary) shadow-2xl transition-transform duration-300 sm:w-[450px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex-1 overflow-hidden">
          {(!isLoaded && !isInstalled) ? (
            <div className="flex h-full w-full items-center p-4 py-8">
              <div className="w-full">
                <OllamaSetup targetModel={targetModel} onReady={() => {}} onClose={closeChat} />
              </div>
            </div>
          ) : (
            <ChatInterface 
              modelName={targetModel} 
              onClose={closeChat} 
              onSetupRequired={() => {}} 
            />
          )}
        </div>
      </div>
    </>
  );
}
