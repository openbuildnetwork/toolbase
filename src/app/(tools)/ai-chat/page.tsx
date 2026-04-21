"use client";

import React, { useState } from "react";
import { OllamaSetup } from "@/components/ai/OllamaSetup";
import { ChatInterface } from "@/components/ai/ChatInterface";

export default function AiChatPage() {
  const [isReady, setIsReady] = useState(false);
  const targetModel = "phi3:mini";

  return (
    <div className="container mx-auto h-full max-w-6xl p-4 pt-6 md:p-6 lg:p-8">
      <div className="mb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Local AI Assistant</h1>
        <p className="text-sm text-gray-500">
          Interact privately with an AI engine running directly on your machine.
        </p>
      </div>

      {!isReady ? (
        <div className="py-12">
          <OllamaSetup targetModel={targetModel} onReady={() => setIsReady(true)} />
        </div>
      ) : (
        <ChatInterface modelName={targetModel} />
      )}
    </div>
  );
}
