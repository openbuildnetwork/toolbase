import React, { useEffect } from "react";
'use client';

import { OpenDrawLayout } from '@/app/(tools)/open-draw/components/layouts/MainLayout';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";

function OpenDrawView() {
    return (
        <div className="relative w-full h-full">
            <div className="absolute top-4 right-4 z-50">
                <ReturnToToolsButton />
            </div>
            <OpenDrawLayout />
        </div>
    );
}

export default function OpenDrawPage() {
  const { updateToolState } = useAIChat();

  useEffect(() => {
    updateToolState({
      toolName: "Open Draw",
      status: "active"
    });
    return () => updateToolState(null);
  }, [updateToolState]);

    return (
        <div className="w-screen h-screen overflow-hidden">
            <OpenDrawView />
        </div>
    );
}
