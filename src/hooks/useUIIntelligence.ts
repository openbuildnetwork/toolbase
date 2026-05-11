"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAIChat } from "./useAIChat";
import { usePathname } from "next/navigation";

const IDLE_TIMEOUT = 8000; // 8 seconds of inactivity

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
    isLoaded,
    isOpen,
    rawInference,
    uiContext,
    isIdle
  } = useAIChat();
  
  const pathname = usePathname();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastElementRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(false);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  }, [setIsIdle]);

  // Generate proactive suggestions based on LLM "thinking"
  useEffect(() => {
    // Only generate when idle and loaded, and not already open or generating
    if (!isLoaded || isOpen || !isIdle || isGeneratingRef.current) {
      if (!isIdle) setSuggestions([]);
      return;
    }

    const generateAISuggestions = async () => {
      isGeneratingRef.current = true;
      
      const contextPrompt = `
You are Echo, a proactive UI assistant. Provide 2 extremely short (max 4 words each) helpful suggestions for the user based on their current state.

USER STATE:
- Current Page: ${pathname}
- Tool Context: ${JSON.stringify(toolState)}
- UI Focus: ${uiContext?.targetElement || "none"} ${uiContext?.action || ""}

RULES:
- Respond ONLY with a JSON array of strings.
- Example: ["Redact now?", "Save to Vault?"]
- No preamble. Just the JSON array.
`.trim();

      try {
        const response = await rawInference([
          { role: "system", content: "You are a proactive UI assistant. Return JSON array only." },
          { role: "user", content: contextPrompt }
        ], 64);

        // Try to parse JSON array from response
        const match = response.match(/\[.*\]/s);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) {
              setSuggestions(parsed.slice(0, 2));
            }
          } catch (e) {
            // If JSON parse fails, fallback to line splitting
            const lines = response.split("\n").filter(l => l.trim().length > 3).slice(0, 2);
            setSuggestions(lines.map(l => l.replace(/^[-*0-9."']+\s*/, "").replace(/[",\]]/g, "").trim()));
          }
        } else {
          // Fallback to line splitting if no JSON found
          const lines = response.split("\n").filter(l => l.trim().length > 3).slice(0, 2);
          setSuggestions(lines.map(l => l.replace(/^[-*0-9."']+\s*/, "").trim()));
        }
      } catch (err) {
        console.error("Failed to generate AI suggestions", err);
      } finally {
        isGeneratingRef.current = false;
      }
    };

    generateAISuggestions();
  }, [pathname, toolState, uiContext, isLoaded, isOpen, isIdle, setSuggestions, rawInference]);

  // Track global interactions
  useEffect(() => {
    const handleActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("scroll", handleActivity, true);

    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("scroll", handleActivity, true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Track hover context
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest("button");
      const input = target.closest("input, textarea");

      let context: any = null;

      if (button) {
        const text = button.innerText || button.getAttribute("aria-label") || button.title;
        if (text && text !== lastElementRef.current) {
          context = { targetElement: "button", action: text.trim() };
          lastElementRef.current = text;
        }
      } else if (input) {
        const placeholder = (input as HTMLInputElement).placeholder;
        if (placeholder && placeholder !== lastElementRef.current) {
          context = { targetElement: "input", action: `typing in ${placeholder}` };
          lastElementRef.current = placeholder;
        }
      }

      if (context) {
        setUIContext(context);
      }
    };

    window.addEventListener("mouseover", handleMouseOver);
    return () => window.removeEventListener("mouseover", handleMouseOver);
  }, [setUIContext]);
}
