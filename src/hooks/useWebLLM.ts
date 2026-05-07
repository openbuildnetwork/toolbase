"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    CreateWebWorkerMLCEngine,
    MLCEngineInterface,
    InitProgressReport,
    type ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";

/**
 * useWebLLM Hook
 * 
 * Manages the lifecycle of a WebGPU-powered LLM engine running in a Web Worker.
 * Handles model loading progress, message streaming, and state management.
 */

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

export function useWebLLM() {
    const [engine, setEngine] = useState<MLCEngineInterface | null>(null);
    const [progress, setProgress] = useState<string>("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    
    const workerRef = useRef<Worker | null>(null);
    const enginePromiseRef = useRef<Promise<MLCEngineInterface> | null>(null);
    const stopRequestedRef = useRef(false);

    // Initialize the worker on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const installed = localStorage.getItem("obn_ai_installed") === "true";
            setIsInstalled(installed);

            if (!workerRef.current) {
                workerRef.current = new Worker(
                    new URL("../workers/ai.worker.ts", import.meta.url),
                    { type: "module" }
                );
            }

            if (installed && !isLoaded && !isLoading) {
                // Pre-warm in background without blocking UI
                loadModel("Phi-3-mini-4k-instruct-q4f16_1-MLC", true);
            }
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    const loadModel = useCallback(async (modelId: string, background = false) => {
        if (!workerRef.current) return;
        
        setIsLoading(true);
        setIsLoaded(false);
        setProgress("Initializing WebGPU...");
        setProgressPercentage(0);

        // We store the engine creation promise so generateResponse can await it if needed
        enginePromiseRef.current = CreateWebWorkerMLCEngine(
            workerRef.current,
            modelId,
            {
                initProgressCallback: (report: InitProgressReport) => {
                    setProgress(report.text);
                    const match = report.text.match(/(\d+)%/);
                    if (match) {
                        setProgressPercentage(parseInt(match[1]));
                    } else if (report.text.includes("Finish loading")) {
                        setProgressPercentage(100);
                    }
                }
            }
        );

        try {
            const engineInstance = await enginePromiseRef.current;
            
            setEngine(engineInstance);
            setIsLoaded(true);
            setIsInstalled(true);
            setProgress("Ready");
            setProgressPercentage(100);

            if (typeof window !== "undefined") {
                localStorage.setItem("obn_ai_installed", "true");
            }
        } catch (error) {
            console.error("Failed to load model:", error);
            setProgress("Error: Failed to load model. Ensure your browser supports WebGPU.");
            enginePromiseRef.current = null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generateResponse = useCallback(async (
        messages: Message[], 
        onToken?: (token: string) => void
    ) => {
        // If engine is still loading in background, wait for it
        let activeEngine = engine;
        if (!activeEngine && enginePromiseRef.current) {
            setProgress("Warming up engine for first message...");
            activeEngine = await enginePromiseRef.current;
        }

        if (!activeEngine) {
            throw new Error("Engine not loaded and no background load in progress");
        }

        setIsGenerating(true);
        stopRequestedRef.current = false;
        let fullText = "";
        try {
            const completion = await activeEngine.chat.completions.create({
                messages: messages as ChatCompletionMessageParam[],
                stream: true,
                temperature: 0.7,
                max_tokens: 1024,
                presence_penalty: 0.0,
                frequency_penalty: 0.0,
            });

            for await (const chunk of completion) {
                if (stopRequestedRef.current) break;
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    fullText += content;
                    if (onToken) onToken(content);
                }
            }
            
            return fullText;
        } catch (error) {
            if (stopRequestedRef.current) {
                return fullText;
            }
            console.error("Inference error:", error);
            throw error;
        } finally {
            setIsGenerating(false);
            stopRequestedRef.current = false;
        }
    }, [engine]);

    const stopGeneration = useCallback(async () => {
        stopRequestedRef.current = true;
        setIsGenerating(false);

        const activeEngine = engine ?? (enginePromiseRef.current ? await enginePromiseRef.current : null);
        if (activeEngine) {
            await Promise.resolve(activeEngine.interruptGenerate());
        }
    }, [engine]);

    const resetChat = useCallback(async () => {
        if (engine) {
            await engine.resetChat();
        }
    }, [engine]);

    const uninstallModel = useCallback(async () => {
        if (engine) {
            await engine.unload();
            setEngine(null);
        }
        
        setIsLoaded(false);
        setIsLoading(false);
        setIsInstalled(false);
        setProgress("");
        setProgressPercentage(0);

        if (typeof window !== "undefined") {
            localStorage.removeItem("obn_ai_installed");
            try {
                const dbs = await window.indexedDB.databases();
                for (const db of dbs) {
                    if (db.name && (db.name.includes("web-llm") || db.name.includes("mlc"))) {
                        window.indexedDB.deleteDatabase(db.name);
                    }
                }
                
                if ("caches" in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        if (name.includes("web-llm") || name.includes("mlc")) {
                            await caches.delete(name);
                        }
                    }
                }
                
                setProgress("Model uninstalled successfully.");
            } catch (e) {
                console.error("Failed to uninstall model:", e);
            }
        }
    }, [engine]);

    return {
        loadModel,
        generateResponse,
        stopGeneration,
        resetChat,
        uninstallModel,
        progress,
        progressPercentage,
        isLoaded,
        isLoading,
        isInstalled,
        isGenerating
    };
}
