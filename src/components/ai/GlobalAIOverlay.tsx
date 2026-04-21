"use client";

import React, { useState, useEffect } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { OllamaSetup } from "@/components/ai/OllamaSetup";
import { ChatInterface } from "@/components/ai/ChatInterface";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

export function GlobalAIOverlay() {
  const { isOpen, closeChat } = useAIChat();
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();
  const targetModel = "phi3:mini";

  useEffect(() => {
    if (isOpen) {
      closeChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* Sliding Drawer */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-[110] flex w-full flex-col border-l border-gray-200 bg-white text-gray-900 shadow-2xl transition-transform duration-300 sm:w-[450px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 backdrop-blur-md pb-4 pt-6 md:py-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">Ollama Chat</h2>
            <span className="text-xs font-medium tracking-wide text-green-600 uppercase">Local AI Mode</span>
          </div>
          <button 
            onClick={closeChat}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!isReady ? (
            <div className="flex h-full w-full items-center p-4 py-8">
              <div className="w-full">
                <OllamaSetup targetModel={targetModel} onReady={() => setIsReady(true)} />
              </div>
            </div>
          ) : (
            <ChatInterface 
              modelName={targetModel} 
              onClose={closeChat} 
              onSetupRequired={() => setIsReady(false)} 
            />
          )}
        </div>
      </div>
    </>
  );
}
