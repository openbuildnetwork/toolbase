"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    CreateWebWorkerMLCEngine,
    MLCEngineInterface,
    InitProgressReport,
    hasModelInCache,
    type ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";

/**
 * useWebLLM Hook
 *
 * Manages the lifecycle of a WebGPU-powered LLM engine running in a Web Worker.
 * The runtime below is module-scoped on purpose: it keeps the worker, engine,
 * and in-flight load promise alive across React remounts and route changes.
 */

export const DEFAULT_WEBLLM_MODEL_ID = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

type SharedRuntime = {
    worker: Worker | null;
    engine: MLCEngineInterface | null;
    enginePromise: Promise<MLCEngineInterface> | null;
    modelId: string | null;
};

const sharedRuntime: SharedRuntime = {
    worker: null,
    engine: null,
    enginePromise: null,
    modelId: null,
};

function getOrCreateWorker() {
    if (typeof window === "undefined") return null;

    if (!sharedRuntime.worker) {
        sharedRuntime.worker = new Worker(
            new URL("../workers/ai.worker.ts", import.meta.url),
            { type: "module" },
        );
    }

    return sharedRuntime.worker;
}

export function useWebLLM() {
    const [engine, setEngine] = useState<MLCEngineInterface | null>(sharedRuntime.engine);
    const [progress, setProgress] = useState<string>(sharedRuntime.engine ? "Ready" : "");
    const [isLoaded, setIsLoaded] = useState(Boolean(sharedRuntime.engine));
    const [isLoading, setIsLoading] = useState(Boolean(sharedRuntime.enginePromise));
    const [progressPercentage, setProgressPercentage] = useState(sharedRuntime.engine ? 100 : 0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isInstalled, setIsInstalled] = useState(Boolean(sharedRuntime.engine || sharedRuntime.enginePromise));

    const engineRef = useRef<MLCEngineInterface | null>(sharedRuntime.engine);
    const stopRequestedRef = useRef(false);

    const syncLoadedEngine = useCallback((engineInstance: MLCEngineInterface, modelId: string) => {
        sharedRuntime.engine = engineInstance;
        sharedRuntime.modelId = modelId;
        engineRef.current = engineInstance;

        setEngine(engineInstance);
        setIsLoaded(true);
        setIsInstalled(true);
        setProgress("Ready");
        setProgressPercentage(100);

        if (typeof window !== "undefined") {
            localStorage.setItem("obn_ai_installed", "true");
        }
    }, []);

    const loadModel = useCallback(async (modelId = DEFAULT_WEBLLM_MODEL_ID, background = false) => {
        if (sharedRuntime.engine && sharedRuntime.modelId === modelId) {
            syncLoadedEngine(sharedRuntime.engine, modelId);
            return;
        }

        if (sharedRuntime.enginePromise && (!sharedRuntime.modelId || sharedRuntime.modelId === modelId)) {
            setIsLoading(true);
            setProgress(background ? "Restoring local AI from browser cache..." : "Finishing engine startup...");

            try {
                const engineInstance = await sharedRuntime.enginePromise;
                syncLoadedEngine(engineInstance, sharedRuntime.modelId || modelId);
            } catch (error) {
                console.error("Failed to load model:", error);
                setProgress("Error: Failed to load model. Ensure your browser supports WebGPU.");
            } finally {
                setIsLoading(false);
            }

            return;
        }

        const worker = getOrCreateWorker();
        if (!worker) return;

        setIsLoading(true);
        setIsLoaded(false);
        if (background) {
            setIsInstalled(true);
        }
        setProgress(background ? "Restoring local AI from browser cache..." : "Initializing WebGPU...");
        setProgressPercentage(0);

        sharedRuntime.modelId = modelId;
        const enginePromise = CreateWebWorkerMLCEngine(
            worker,
            modelId,
            {
                initProgressCallback: (report: InitProgressReport) => {
                    setProgress(report.text);
                    const match = report.text.match(/(\d+)%/);
                    if (match) {
                        setProgressPercentage(parseInt(match[1], 10));
                    } else if (report.text.includes("Finish loading")) {
                        setProgressPercentage(100);
                    }
                },
            },
        );

        sharedRuntime.enginePromise = enginePromise;

        try {
            const engineInstance = await enginePromise;
            syncLoadedEngine(engineInstance, modelId);
        } catch (error) {
            console.error("Failed to load model:", error);
            setProgress("Error: Failed to load model. Ensure your browser supports WebGPU.");
            sharedRuntime.modelId = null;
        } finally {
            if (sharedRuntime.enginePromise === enginePromise) {
                sharedRuntime.enginePromise = null;
            }
            setIsLoading(false);
        }
    }, [syncLoadedEngine]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (sharedRuntime.engine) {
            syncLoadedEngine(sharedRuntime.engine, sharedRuntime.modelId || DEFAULT_WEBLLM_MODEL_ID);
            return;
        }

        if (sharedRuntime.enginePromise) {
            void loadModel(sharedRuntime.modelId || DEFAULT_WEBLLM_MODEL_ID, true);
            return;
        }

        const installedFlag = localStorage.getItem("obn_ai_installed") === "true";
        if (installedFlag) {
            setIsInstalled(true);
            void loadModel(DEFAULT_WEBLLM_MODEL_ID, true);
            return;
        }

        void hasModelInCache(DEFAULT_WEBLLM_MODEL_ID).then((cached) => {
            if (!cached) return;

            localStorage.setItem("obn_ai_installed", "true");
            setIsInstalled(true);
            void loadModel(DEFAULT_WEBLLM_MODEL_ID, true);
        });
    }, [loadModel, syncLoadedEngine]);

    const generateResponse = useCallback(async (
        messages: Message[],
        onToken?: (token: string) => void,
    ) => {
        let activeEngine = engineRef.current ?? sharedRuntime.engine ?? engine;
        if (!activeEngine && sharedRuntime.enginePromise) {
            setProgress("Finishing engine startup...");
            activeEngine = await sharedRuntime.enginePromise;
            syncLoadedEngine(activeEngine, sharedRuntime.modelId || DEFAULT_WEBLLM_MODEL_ID);
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
                    onToken?.(content);
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
    }, [engine, syncLoadedEngine]);

    const stopGeneration = useCallback(async () => {
        stopRequestedRef.current = true;
        setIsGenerating(false);

        const activeEngine = engineRef.current ?? sharedRuntime.engine;
        if (activeEngine) {
            await Promise.resolve(activeEngine.interruptGenerate());
        }
    }, []);

    const resetChat = useCallback(async () => {
        const activeEngine = engineRef.current ?? sharedRuntime.engine;
        if (activeEngine) {
            await activeEngine.resetChat();
        }
    }, []);

    const uninstallModel = useCallback(async () => {
        const activeEngine = engineRef.current ?? sharedRuntime.engine;
        if (activeEngine) {
            await activeEngine.unload();
        }

        sharedRuntime.engine = null;
        sharedRuntime.enginePromise = null;
        sharedRuntime.modelId = null;
        engineRef.current = null;

        if (sharedRuntime.worker) {
            sharedRuntime.worker.terminate();
            sharedRuntime.worker = null;
        }

        setEngine(null);
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
    }, []);

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
        isGenerating,
    };
}
