"use client";
import React, { useEffect } from "react";

import QrForgeFeature from "@/app/(tools)/qr-forge/components/QrForgeFeature";
import { getToolById } from "@/config/tools.registry";
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";

export default function QrForgePage() {
  const { updateToolState } = useAIChat();

  useEffect(() => {
    updateToolState({
      toolName: "Qr Forge",
      status: "active"
    });
    return () => updateToolState(null);
  }, [updateToolState]);

  const tool = getToolById('qr-forge');

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">{tool?.name}</h1>
        <p className="text-lg text-muted-foreground">{tool?.description}</p>
      </div>
      
      <QrForgeFeature />
    </div>
  );
}
