'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';

// ThemeProvider must be static as it provides initial theme variables
import { ThemeProvider } from "../ui/ThemeProvider";
import { AIChatProvider } from "@/app/(tools)/ai-chat/hooks/useAIChat";
import { useUIIntelligence } from "@/hooks/useUIIntelligence";
import { LazyMotion } from 'framer-motion';

const loadFeatures = () => import('framer-motion').then(res => res.domAnimation);


// Aggressive dynamic imports with SSR disabled for heavy UI elements
const GlobalAIOverlay = dynamic(() => import("@/components/ai/GlobalAIOverlay").then(mod => mod.GlobalAIOverlay), { ssr: false });
const EchoFAB = dynamic(() => import("@/components/ai/EchoFAB").then(mod => mod.EchoFAB), { ssr: false });
const WorkerPrewarmer = dynamic(() => import("./WorkerPrewarmer").then(mod => mod.WorkerPrewarmer), { ssr: false });
const CommandPaletteProvider = dynamic(() => import("../ui/CommandPaletteProvider").then(mod => mod.CommandPaletteProvider), { ssr: false });
const GlobalBackground = dynamic(() => import("../ui/GlobalBackground").then(mod => mod.GlobalBackground), { ssr: false });
const DaylightManager = dynamic(() => import("../ui/DaylightManager").then(mod => mod.DaylightManager), { ssr: false });
const CapabilityProvider = dynamic(() => import("./CapabilityProvider").then(mod => mod.CapabilityProvider), { ssr: false });

function UIIntelligenceInitializer() {
  useUIIntelligence();
  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service worker registration failed", err);
        });
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <GlobalBackground />
      <DaylightManager />
      <CapabilityProvider>
        <WorkerPrewarmer />
        <LazyMotion features={loadFeatures} strict>

          <AIChatProvider>
            <UIIntelligenceInitializer />
            <CommandPaletteProvider />
            {children}
            <GlobalAIOverlay />
            <EchoFAB />
          </AIChatProvider>
        </LazyMotion>
      </CapabilityProvider>
    </ThemeProvider>
  );
}
