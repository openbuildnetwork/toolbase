"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAIChat } from "./useAIChat";
import { usePathname } from "next/navigation";

const IDLE_TIMEOUT = 2000; // 2 seconds of inactivity

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
You are Echo, a friendly and empathetic AI companion for the Toolbase platform. 
Your goal is to offer a supportive "nudge" or a friendly comment to the user when they seem to be thinking or waiting.

USER CONTEXT:
- Page: ${pathname}
- Interaction: ${uiContext?.targetElement || "viewing"} ${uiContext?.action || ""}
- Tool Data: ${JSON.stringify(toolState)}

INSTRUCTIONS:
- Provide 1 or 2 friendly, conversational suggestions or comments.
- Tone: Helpful, companion-like, slightly casual.
- CRITICAL: Mention the specific field or button if the user is focused on one (e.g., "Need help with the '${uiContext?.action || "field"}' input?").
- Example: "Stuck on what secrets to hide?", "Hey, need a hand with the ${uiContext?.action || "input"}?", "Ready to redact those values?"
- Format: Return ONLY a JSON array of strings. Max 8 words per string.
`.trim();

      try {
        const response = await rawInference([
          { role: "system", content: "You are a friendly AI companion. Respond with a JSON array of short, conversational nudges." },
          { role: "user", content: contextPrompt }
        ], 96);

        // Try to parse JSON array from response
        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) {
              setSuggestions(parsed.slice(0, 2));
            }
        } catch {
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
      }
    };

    window.addEventListener("mouseover", handleInteraction);
    window.addEventListener("focusin", handleInteraction);
    
    return () => {
      window.removeEventListener("mouseover", handleInteraction);
      window.removeEventListener("focusin", handleInteraction);
    };
  }, [setUIContext]);
}
