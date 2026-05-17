"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { usePathname } from "next/navigation";
import { useWebLLM, Message } from "@/hooks/useWebLLM";
import {
  compactConsoleArgs,
  compactForEcho,
  type EchoRuntimeEvent,
  type EchoRuntimeSnapshot,
} from "@/lib/echo-context";

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
  runtimeEvents: EchoRuntimeEvent[];
  runtimeSnapshot: EchoRuntimeSnapshot;
  recordRuntimeEvent: (event: RuntimeEventInput) => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);
const MAX_RUNTIME_EVENTS = 50;

type RuntimeEventInput = Omit<EchoRuntimeEvent, "id" | "at" | "route" | "detail"> & {
  id?: string;
  at?: string;
  route?: string | null;
  detail?: unknown;
};

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `echo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPointerMode() {
  if (typeof window === "undefined" || !("matchMedia" in window)) return undefined;
  if (window.matchMedia("(pointer: coarse)").matches) return "coarse";
  if (window.matchMedia("(pointer: fine)").matches) return "fine";
  return undefined;
}

export function AIChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [toolState, setToolState] = useState<Record<string, unknown> | null>(null);
  const [uiContext, setUIContext] = useState<UIContext>({});
  const [isIdle, setIsIdle] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [runtimeEvents, setRuntimeEvents] = useState<EchoRuntimeEvent[]>([]);
  const webLLM = useWebLLM();

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);
  const recordRuntimeEvent = useCallback(
    (event: RuntimeEventInput) => {
      const next: EchoRuntimeEvent = {
        ...event,
        id: event.id ?? createEventId(),
        at: event.at ?? new Date().toISOString(),
        route: event.route ?? pathname,
        detail: event.detail ? compactForEcho(event.detail, { maxChars: 1100, maxDepth: 2 }) : undefined,
      };

      const commit = () => {
        setRuntimeEvents((prev) => {
          const latest = prev[0];
          if (
            latest &&
            latest.kind === next.kind &&
            latest.level === next.level &&
            latest.message === next.message &&
            latest.detail === next.detail &&
            Date.now() - Date.parse(latest.at) < 1500
          ) {
            return prev;
          }
          return [next, ...prev].slice(0, MAX_RUNTIME_EVENTS);
        });
      };

      if (typeof queueMicrotask === "function") {
        queueMicrotask(commit);
      } else {
        setTimeout(commit, 0);
      }
    },
    [pathname],
  );

  const updateToolState = useCallback(
    (state: Record<string, unknown> | null) => {
      setToolState(state);
      if (!state) return;

      const toolName = typeof state.toolName === "string" ? state.toolName : "Current tool";
      const status = typeof state.status === "string" ? ` (${state.status})` : "";
      recordRuntimeEvent({
        kind: "tool",
        level: state.error ? "error" : "info",
        message: `${toolName} state updated${status}`,
        detail: compactForEcho(state, { maxChars: 1200, maxDepth: 3 }),
      });
    },
    [recordRuntimeEvent],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      recordRuntimeEvent({
        kind: "system",
        level: "error",
        message: event.message || "Unhandled browser error",
        detail: event.error || `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordRuntimeEvent({
        kind: "system",
        level: "error",
        message: "Unhandled promise rejection",
        detail: event.reason,
      });
    };

    const onInvalid = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!target) return;
      recordRuntimeEvent({
        kind: "validation",
        level: "warn",
        message: "User input failed browser validation",
        detail: {
          name: target.name ||
            target.id ||
            target.getAttribute("aria-label") ||
            ("placeholder" in target ? target.placeholder : undefined),
          value: "value" in target ? target.value : undefined,
          validity: "validity" in target ? target.validity : undefined,
        },
      });
    };

    const onOffline = () => recordRuntimeEvent({ kind: "network", level: "warn", message: "Browser went offline" });
    const onOnline = () => recordRuntimeEvent({ kind: "network", level: "info", message: "Browser came online" });

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: unknown[]) => {
      originalError(...args);
      recordRuntimeEvent({
        kind: "console",
        level: "error",
        message: typeof args[0] === "string" ? args[0] : "Console error",
        detail: compactConsoleArgs(args),
      });
    };

    console.warn = (...args: unknown[]) => {
      originalWarn(...args);
      recordRuntimeEvent({
        kind: "console",
        level: "warn",
        message: typeof args[0] === "string" ? args[0] : "Console warning",
        detail: compactConsoleArgs(args),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("invalid", onInvalid, true);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("invalid", onInvalid, true);
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [recordRuntimeEvent]);

  const runtimeSnapshot = useMemo<EchoRuntimeSnapshot>(() => {
    const nav = typeof navigator !== "undefined"
      ? navigator as Navigator & { deviceMemory?: number }
      : null;
    const doc = typeof document !== "undefined" ? document : null;

    const recentEvents = runtimeEvents.slice(0, 16);
    return {
      route: pathname,
      device: {
        width: typeof window !== "undefined" ? window.innerWidth : undefined,
        height: typeof window !== "undefined" ? window.innerHeight : undefined,
        online: nav?.onLine,
        visibility: doc?.visibilityState,
        cores: nav?.hardwareConcurrency,
        memoryGb: nav?.deviceMemory,
        pointer: getPointerMode(),
      },
      uiContext,
      toolState,
      recentEvents,
      lastError: runtimeEvents.find((event) => event.level === "error"),
    };
  }, [pathname, runtimeEvents, toolState, uiContext]);

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
      runtimeEvents,
      runtimeSnapshot,
      recordRuntimeEvent,
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
