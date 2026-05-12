'use client';

import React from 'react';
import { ThemeProvider } from "../ui/ThemeProvider";
import { GlobalBackground } from "../ui/GlobalBackground";
import { DaylightManager } from "../ui/DaylightManager";
import { AIChatProvider } from "@/hooks/useAIChat";
import { CommandPaletteProvider } from "../ui/CommandPaletteProvider";
import { GlobalAIOverlay } from "@/components/ai/GlobalAIOverlay";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <GlobalBackground />
      <DaylightManager />
      <AIChatProvider>
        {/* Global UI elements that need context */}
        <CommandPaletteProvider />
        {children}
        <GlobalAIOverlay />
      </AIChatProvider>
    </ThemeProvider>
  );
}
