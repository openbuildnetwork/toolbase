"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useWebLLM, Message } from "@/hooks/useWebLLM";

interface UIContext {
  targetElement?: string;
  action?: string;
  lastInteraction?: number;
}

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
  toolState: Record<string, unknown> | null;
  updateToolState: (state: Record<string, unknown> | null) => void;
  // UI Intelligence
  uiContext: UIContext;
  setUIContext: (ctx: UIContext | ((prev: UIContext) => UIContext)) => void;
  isIdle: boolean;
  setIsIdle: (idle: boolean) => void;
  suggestions: string[];
  setSuggestions: (s: string[]) => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [toolState, setToolState] = useState<Record<string, unknown> | null>(null);
  const [uiContext, setUIContext] = useState<UIContext>({});
  const [isIdle, setIsIdle] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const webLLM = useWebLLM();

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);
  const updateToolState = useCallback((state: Record<string, unknown> | null) => setToolState(state), [setToolState]);

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
