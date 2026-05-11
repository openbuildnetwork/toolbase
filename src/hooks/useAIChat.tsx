"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useWebLLM, Message } from "./useWebLLM";

interface AIChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  // WebLLM Engine State
  loadModel: (modelId?: string, forceReload?: boolean, background?: boolean) => Promise<void>;
  generateResponse: (messages: Message[], onToken?: (token: string) => void) => Promise<string>;
  rawInference: (messages: Message[], max_tokens?: number) => Promise<string>;
  stopGeneration: () => Promise<void>;
  resetChat: () => Promise<void>;
  uninstallModel: () => Promise<void>;
  progress: string;
  progressPercentage: number;
  isLoaded: boolean;
  isLoading: boolean;
  isInstalled: boolean;
  isGenerating: boolean;
  error: string | null;
  activeModelId: string | null;
  // Tool State for Context Awareness
  toolState: any;
  updateToolState: (state: any) => void;
  // UI Intelligence
  uiContext: {
    targetElement?: string;
    action?: string;
    lastInteraction?: number;
  };
  setUIContext: (ctx: any) => void;
  isIdle: boolean;
  setIsIdle: (idle: boolean) => void;
  suggestions: string[];
  setSuggestions: (s: string[]) => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [toolState, setToolState] = useState<any>(null);
  const [uiContext, setUIContext] = useState<any>({});
  const [isIdle, setIsIdle] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const webLLM = useWebLLM();

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);
  const updateToolState = useCallback((state: any) => setToolState(state), [setToolState]);

  return (
    <AIChatContext.Provider value={{ 
      isOpen, 
      openChat, 
      closeChat, 
      toggleChat,
      toolState,
      updateToolState,
      uiContext,
      setUIContext,
      isIdle,
      setIsIdle,
      suggestions,
      setSuggestions,
      ...webLLM
    }}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat() {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
}
