"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";
import { usePathname } from "next/navigation";

const IDLE_TIMEOUT = 8000;
const ACTIVITY_THROTTLE_MS = 250;
const SUGGESTION_MIN_INTERVAL_MS = 45000;

function buildLocalSuggestions(
  pathname: string | null,
  uiContext: { targetElement?: string; action?: string },
  toolState: Record<string, unknown> | null,
) {
  const suggestions: string[] = [];
  const toolName = typeof toolState?.toolName === "string" ? toolState.toolName : null;
  const status = typeof toolState?.status === "string" ? toolState.status : null;

  if (uiContext?.targetElement === "input" && uiContext.action) {
    suggestions.push(`Need help with ${uiContext.action}?`);
  }

  if (status === "error") {
    suggestions.push("Want me to explain the failure?");
  } else if (toolName) {
    suggestions.push(`Need help with ${toolName}?`);
  } else if (pathname?.includes("pipeline")) {
    suggestions.push("Want help wiring this flow?");
  }

  if (suggestions.length === 0) {
    suggestions.push("Need a hand here?");
  }

  return suggestions.slice(0, 2);
}

/**
 * useUIIntelligence
 * 
 * Tracks cursor position, hover targets, and idle state.
 * Generates dynamic, LLM-driven proactive suggestions for Echo.
 */
export function useUIIntelligence() {
  const { 
    setUIContext, 
    setIsIdle, 
    setSuggestions, 
    toolState, 
    isOpen,
    uiContext,
    isIdle,
    recordRuntimeEvent
  } = useAIChat();
  
  const pathname = usePathname();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastElementRef = useRef<string | null>(null);
  const isIdleRef = useRef(isIdle);
  const lastActivityAtRef = useRef(0);
  const lastSuggestionAtRef = useRef(0);

  useEffect(() => {
    isIdleRef.current = isIdle;
  }, [isIdle]);

  const resetIdleTimer = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityAtRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityAtRef.current = now;

    if (isIdleRef.current) {
      setIsIdle(false);
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  }, [setIsIdle]);

  // Generate proactive suggestions from local context only. This keeps Echo helpful
  // without running hidden inference while the user is simply reading or hovering.
  useEffect(() => {
    if (isOpen || !isIdle) {
      if (!isIdle) setSuggestions([]);
      return;
    }

    const now = Date.now();
    if (now - lastSuggestionAtRef.current < SUGGESTION_MIN_INTERVAL_MS) return;
    lastSuggestionAtRef.current = now;
    setSuggestions(buildLocalSuggestions(pathname, uiContext, toolState));
  }, [pathname, toolState, uiContext, isOpen, isIdle, setSuggestions]);

  // Track global interactions
  useEffect(() => {
    const handleActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener("pointermove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true, capture: true });

    resetIdleTimer();

    return () => {
      window.removeEventListener("pointermove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("scroll", handleActivity, true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Track hover and focus context
  useEffect(() => {
    const handleInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest("button");
      const input = target.closest("input, textarea") as HTMLInputElement | HTMLTextAreaElement;

      let context: { targetElement: string; action: string } | null = null;

      if (button) {
        const text = button.innerText || button.getAttribute("aria-label") || button.title;
        if (text && text !== lastElementRef.current) {
          context = { targetElement: "button", action: text.trim() };
          lastElementRef.current = text;
        }
      } else if (input) {
        const label = document.querySelector(`label[for="${input.id}"]`)?.textContent || 
                      input.placeholder || 
                      input.name || 
                      "this field";
        
        if (label && label !== lastElementRef.current) {
          context = { targetElement: "input", action: label.trim() };
          lastElementRef.current = label;
        }
      }

      if (context) {
        setUIContext(context);
        recordRuntimeEvent({
          kind: "ui",
          level: "info",
          message: `User focused ${context.targetElement}`,
          detail: context.action,
        });
      }
    };

    window.addEventListener("pointerover", handleInteraction);
    window.addEventListener("focusin", handleInteraction);
    
    return () => {
      window.removeEventListener("pointerover", handleInteraction);
      window.removeEventListener("focusin", handleInteraction);
    };
  }, [recordRuntimeEvent, setUIContext]);
}
