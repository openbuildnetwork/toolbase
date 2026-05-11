"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";

/**
 * EchoFAB
 * 
 * A premium Floating Action Button that provides quick access to the Echo AI.
 * Positioned fixed at the bottom-right.
 * Features micro-animations for hover, entrance, and generating states.
 */
export function EchoFAB() {
  const { 
    isOpen, 
    toggleChat, 
    isGenerating, 
    isLoading, 
    isLoaded, 
    progressPercentage,
    suggestions,
    isIdle
  } = useAIChat();

  return (
    <AnimatePresence>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3 pointer-events-none">
          {/* Proactive Suggestions */}
          <AnimatePresence>
            {isIdle && suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                className="flex flex-col items-end gap-2 mb-2 pointer-events-auto"
              >
                {suggestions.map((text, i) => (
                  <motion.button
                    key={text}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={toggleChat}
                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white text-sm font-medium shadow-xl hover:bg-blue-700 transition-colors whitespace-nowrap border border-blue-400/30"
                  >
                    {text}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className={cn(
              "relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 pointer-events-auto",
              "bg-(--surface-overlay)/80 backdrop-blur-xl border",
              isLoaded 
                ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                : "border-(--border-subtle)",
              "hover:border-blue-500/50 hover:shadow-blue-500/20",
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
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full bg-blue-500/20 blur-md"
              />
            )}

            {/* Echo Icon */}
            <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-blue-500/10 shadow-sm transition-transform group-hover:scale-110">
              <Image
                src="/assets/images/echo_basic.png"
                alt="Echo"
                fill
                className="object-cover"
              />
            </div>

            {/* Tooltip (Desktop only) */}
            {!isIdle && (
              <div className="absolute right-full mr-3 hidden rounded-lg border border-(--border-subtle) bg-(--surface-overlay)/90 px-2.5 py-1.5 text-xs font-medium text-(--text-primary) shadow-xl backdrop-blur-md transition-opacity group-hover:block whitespace-nowrap">
                Chat with Echo
              </div>
            )}
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
