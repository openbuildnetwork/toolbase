"use client";

import React from "react";
import { m, AnimatePresence, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";
import { cn } from "@/lib/utils";

/**
 * EchoFAB
 * 
 * A premium Floating Action Button that provides quick access to the Echo AI.
 * Positioned fixed at the bottom-right, collapsed into the corner.
 * Features:
 *  - Fully draggable/moveable across the screen.
 *  - Remembers its custom coordinates in LocalStorage between reloads and pages.
 *  - Tactile grab indicators.
 *  - Faint 18% transparent idle state that brightens to 100% on hover.
 *  - Occasional glassmorphic tooltip reminders.
 */
export function EchoFAB() {
  const { 
    isOpen, 
    toggleChat, 
    isGenerating, 
    isLoading, 
    isLoaded, 
    loadModel,
    progressPercentage,
    suggestions,
    isIdle
  } = useAIChat();

  const [showReminder, setShowReminder] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Drag coordinates persistent values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Responsive drag constraints boundary
  const [constraints, setConstraints] = React.useState({ left: -600, right: 10, top: -600, bottom: 10 });

  // Track if a drag operation is active
  const isDraggingRef = React.useRef(false);

  React.useEffect(() => {
    // Restore saved coordinates BEFORE mounting the button
    try {
      const saved = localStorage.getItem("echo:fab-position");
      if (saved) {
        const { px, py } = JSON.parse(saved);
        x.set(px || 0);
        y.set(py || 0);
      }
    } catch (e) {
      console.warn("Failed to load FAB position", e);
    }

    // Delay mounting by a small timeout to let LazyMotion parent useEffect register domMax features first!
    const delayTimer = setTimeout(() => {
      setMounted(true);
    }, 150);

    // Dynamic viewport constraints calculation
    const updateConstraints = () => {
      setConstraints({
        left: -window.innerWidth + 80,
        right: 10,
        top: -window.innerHeight + 80,
        bottom: 10,
      });
    };
    
    updateConstraints();
    window.addEventListener("resize", updateConstraints);
    
    return () => {
      clearTimeout(delayTimer);
      window.removeEventListener("resize", updateConstraints);
    };
  }, [x, y]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  // Persist dragged coordinates
  const handleDragEnd = () => {
    try {
      localStorage.setItem(
        "echo:fab-position",
        JSON.stringify({ px: x.get(), py: y.get() })
      );
    } catch (e) {
      console.warn("Failed to save FAB position", e);
    }
    // Clear dragging state in a tiny timeout to avoid triggering onClick
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 80);
  };

  React.useEffect(() => {
    if (isOpen) {
      setShowReminder(false);
      return;
    }
    
    // Show first reminder after 15 seconds
    const initialTimer = setTimeout(() => {
      setShowReminder(true);
      const hideTimer = setTimeout(() => setShowReminder(false), 4000);
      return () => clearTimeout(hideTimer);
    }, 15000);

    // Repeat reminder every 35 seconds
    const interval = setInterval(() => {
      setShowReminder(true);
      const hideTimer = setTimeout(() => setShowReminder(false), 4000);
      return () => clearTimeout(hideTimer);
    }, 35000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {!isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[90] flex flex-col items-end gap-2.5 pointer-events-none">
          {/* Periodic Popup Reminder */}
          <AnimatePresence>
            {showReminder && isIdle && suggestions.length === 0 && (
              <m.div
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                className="px-3.5 py-2 rounded-2xl border border-blue-500/20 bg-(--surface-overlay)/90 text-blue-500 text-xs font-bold shadow-2xl backdrop-blur-md pointer-events-auto flex items-center gap-2 mb-1.5 border-l-blue-500 border-l-2 shadow-blue-500/5 select-none"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Ask Echo AI 💡
              </m.div>
            )}
          </AnimatePresence>

          {/* Proactive Suggestions */}
          <AnimatePresence>
            {isIdle && suggestions.length > 0 && (
              <m.div 
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                className="flex flex-col items-end gap-2 mb-2 pointer-events-auto"
              >
                {suggestions.map((text, i) => (
                  <m.button
                    key={text}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={toggleChat}
                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-sm font-medium shadow-xl hover:bg-blue-700 transition-colors text-right max-w-[220px] border border-blue-400/30"
                  >
                    {text}
                  </m.button>
                ))}
              </m.div>
            )}
          </AnimatePresence>

          {/* Faint, Corner-Collapsed, Moveable Floating Button */}
          <m.button
            drag
            dragMomentum={false}
            dragElastic={0.05}
            dragConstraints={constraints}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{ x, y }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isHovered || showReminder ? 1 : 0.18, 
              scale: 1
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => {
              if (isDraggingRef.current) return;
              toggleChat();
            }}
            className={cn(
              "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors duration-300 pointer-events-auto",
              "bg-(--surface-overlay)/35 backdrop-blur-md border border-(--border-subtle)/35 text-(--text-muted)",
              "hover:bg-(--surface-overlay)/80 hover:border-blue-500/50 hover:shadow-blue-500/20",
              "cursor-grab active:cursor-grabbing touch-none select-none",
              isLoaded 
                ? "border-emerald-500/25 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                : "border-(--border-subtle)/20",
              "group"
            )}
            aria-label="Toggle Echo AI"
          >
            {/* Progress ring for loading state */}
            {isLoading && (
              <svg className="absolute inset-0 h-full w-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 * (1 - progressPercentage / 100)}
                  className="text-blue-500 transition-all duration-300"
                />
              </svg>
            )}

            {/* Pulsing glow when generating */}
            {isGenerating && (
              <m.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full bg-blue-500/20 blur-md pointer-events-none"
              />
            )}

            {/* Echo Icon */}
            <div className="relative h-10 w-10 transition-transform group-hover:scale-110 flex items-center justify-center pointer-events-none">
              <Image
                src="/assets/images/echo_basic.png"
                alt="Echo"
                width={40}
                height={40}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>

            {/* Tooltip (Desktop only) */}
            {!isIdle && (
              <div className="absolute right-full mr-3 hidden rounded-lg border border-(--border-subtle) bg-(--surface-overlay)/90 px-2.5 py-1.5 text-xs font-medium text-(--text-primary) shadow-xl backdrop-blur-md transition-opacity group-hover:block whitespace-nowrap pointer-events-none">
                Chat with Echo
              </div>
            )}
          </m.button>
        </div>
      )}
    </AnimatePresence>
  );
}
