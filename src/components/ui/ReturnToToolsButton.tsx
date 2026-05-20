"use client";

import Link from "next/link";
import { LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { SupportButton } from "./SupportButton";

/**
 * Slim nav button — returns user to the toolbase hub.
 * Shows the platform-aware keyboard shortcut (⌘K / Ctrl K).
 * Now upgraded to be self-collapsing with dynamic attractions and micro-interactions.
 */
export function ReturnToToolsButton() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMac, setIsMac] = useState(false);
  const [isAttracting, setIsAttracting] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const hasInteractedRef = useRef(false);

  // Sync ref to avoid stale closures in setTimeout
  useEffect(() => {
    hasInteractedRef.current = hasInteracted;
  }, [hasInteracted]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setIsMac(/mac/i.test(navigator.platform));
    });

    // Auto-collapse after 3.5 seconds if the user hasn't hovered or interacted
    const timer = setTimeout(() => {
      if (!hasInteractedRef.current) {
        setIsAttracting(false);
        setIsOpen(false);
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onMouseEnter={() => {
        setHasInteracted(true);
        setIsAttracting(false);
      }}
      className="relative flex items-center justify-end"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 0 0px rgba(139, 92, 246, 0.2), 0 0 0 0px rgba(59, 130, 246, 0.1);
            border-color: var(--border-medium);
          }
          50% {
            box-shadow: 0 0 16px 4px rgba(139, 92, 246, 0.35), 0 0 24px 8px rgba(59, 130, 246, 0.2);
            border-color: rgba(139, 92, 246, 0.65);
          }
        }
        .attract-pulse {
          animation: pulseGlow 1.8s infinite ease-in-out;
        }
        @keyframes triggerPulse {
          0%, 100% {
            box-shadow: 0 0 0 0px rgba(139, 92, 246, 0.15), 0 0 0 0px rgba(59, 130, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.25);
          }
          50% {
            box-shadow: 0 0 12px 3px rgba(139, 92, 246, 0.35), 0 0 16px 6px rgba(59, 130, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.55);
          }
        }
        .trigger-pulse {
          animation: triggerPulse 2.2s infinite ease-in-out;
        }
      `}} />

      {/* Expanded Container */}
      <div
        className={`flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-x-12 scale-90 pointer-events-none absolute"
        } ${isAttracting ? "attract-pulse rounded-xl" : ""}`}
      >
        <Link
          href="/"
          aria-label="Back to toolbase — All Tools"
          className="group inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl
                   border border-(--border-medium)
                   bg-(--surface-overlay) backdrop-blur-md
                   shadow-sm shadow-black/[0.05] dark:shadow-black/20
                   transition-all duration-200 ease-out
                   hover:shadow-md hover:shadow-black/[0.08] dark:hover:shadow-black/30
                   hover:border-(--border-subtle) hover:bg-(--surface-hover)
                   active:scale-95 active:shadow-none"
        >
          {/* Icon chip */}
          <span
            className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0
                       bg-(--surface-active) border border-(--border-subtle)
                       text-(--text-muted)
                       transition-all duration-200
                       group-hover:bg-blue-500/10 group-hover:border-blue-500/20 group-hover:text-blue-500"
          >
            <LayoutGrid className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
          </span>

          {/* Label */}
          <span className="flex flex-col gap-px leading-none">
            <span className="text-[8.5px] font-black uppercase tracking-[0.16em] text-(--text-muted) group-hover:text-blue-500 transition-colors duration-200">
              toolbase
            </span>
            <span className="text-[12px] font-semibold tracking-tight text-(--text-primary)">
              All Tools
            </span>
          </span>

          {/* Keyboard shortcut badge */}
          <span className="ml-1 flex items-center gap-0.5">
            <kbd
              className="inline-flex items-center px-1 py-0.5 rounded-md text-[9px] font-bold
                         bg-(--kbd-bg) border border-(--border-medium)
                         text-(--text-muted) font-mono leading-none
                         group-hover:border-blue-500/20 group-hover:text-blue-500/70
                         transition-colors duration-200"
            >
              {isMac ? "⌘" : "Ctrl"}
            </kbd>
            <kbd
              className="inline-flex items-center px-1 py-0.5 rounded-md text-[9px] font-bold
                         bg-(--kbd-bg) border border-(--border-medium)
                         text-(--text-muted) font-mono leading-none
                         group-hover:border-blue-500/20 group-hover:text-blue-500/70
                         transition-colors duration-200"
            >
              K
            </kbd>
          </span>
        </Link>
        
        <SupportButton mode="inline" />

        {/* Small Collapse Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            setIsAttracting(false);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-xl
                     border border-(--border-medium) bg-(--surface-overlay) backdrop-blur-md
                     text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-hover)
                     shadow-sm hover:border-(--border-subtle) active:scale-95 transition-all duration-200 cursor-pointer"
          title="Minimize Navigation"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsed Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
          setHasInteracted(true);
          setIsAttracting(false);
        }}
        className={`trigger-pulse flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl
                   border border-violet-500/25 dark:border-violet-500/25
                   bg-(--surface-overlay)/60 backdrop-blur-md
                   text-(--text-muted) hover:text-blue-400
                   shadow-lg hover:bg-(--surface-hover) hover:border-violet-500/50
                   active:scale-95 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                     !isOpen
                       ? "opacity-95 hover:opacity-100 translate-x-0 scale-100 pointer-events-auto"
                       : "opacity-0 translate-x-12 scale-90 pointer-events-none absolute"
                   }`}
        title="Show Platform Navigation"
      >
        <span className="relative flex items-center justify-center w-5.5 h-5.5 rounded-lg bg-gradient-to-br from-violet-500/12 to-blue-500/12 border border-violet-500/20 text-violet-400">
          <LayoutGrid className="w-3.5 h-3.5" />
          {/* Micro Pulsing Notification Dot */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500" />
        </span>
        <ChevronLeft className="w-3.5 h-3.5 text-blue-400/80 animate-pulse ml-0.5" />
      </button>
    </div>
  );
}
