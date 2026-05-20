"use client";
import React, { useEffect } from "react";

import DataLensView from "@/app/(tools)/data-lens/components/DataLensView";
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";

export default function DataLensPage() {
  const { updateToolState } = useAIChat();

  useEffect(() => {
    updateToolState({
      toolName: "Data Lens",
      status: "active"
    });
    return () => updateToolState(null);
  }, [updateToolState]);

    return <DataLensView />;
}
