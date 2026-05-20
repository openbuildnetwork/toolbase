"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
    MLCEngineInterface,
    InitProgressReport,
    ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";
import { getSystemCapabilities, CapabilityReport } from "@/lib/system-capabilities";

/**
 * useWebLLM Hook
 *
 * Manages the lifecycle of a WebGPU-powered LLM engine running in a Web Worker.
 * The runtime below is module-scoped on purpose: it keeps the worker, engine,
 * and in-flight load promise alive across React remounts and route changes.
 */

export const DEFAULT_WEBLLM_MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
export const LIGHTWEIGHT_WEBLLM_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export const EMERGENCY_WEBLLM_MODEL_ID = "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC";

const APPROX_CHARS_PER_TOKEN = 4;
const PROMPT_SAFETY_MARGIN_TOKENS = 256;
const DEFAULT_CONTEXT_WINDOW_TOKENS = 4096;
const DEFAULT_RESPONSE_MAX_TOKENS = 640;

export interface WebLLMModel {
    id: string;
    name: string;
    description: string;
    vramMb: number;
    contextWindowTokens: number;
    responseMaxTokens: number;
    lowResource: boolean;
    recommended?: boolean;
}

export const SUPPORTED_MODELS: WebLLMModel[] = [
    {
        id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        name: "Llama 3.2 3B",
        description: "Best 4GB default: strong quality with safer memory headroom.",
        vramMb: 2264,
        contextWindowTokens: 4096,
        responseMaxTokens: 640,
        lowResource: true,
        recommended: true,
    },
    {
        id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
        name: "Qwen 2.5 3B",
        description: "Good instruction following and coding within a 4GB budget.",
        vramMb: 2505,
        contextWindowTokens: 4096,
        responseMaxTokens: 640,
        lowResource: true,
    },
    {
        id: "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
        name: "Phi-3 Mini (1K)",
        description: "Phi quality with a shorter context for lower memory pressure.",
        vramMb: 2520,
        contextWindowTokens: 1024,
        responseMaxTokens: 256,
        lowResource: true,
    },
    {
        id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        name: "Qwen 2.5 1.5B",
        description: "Faster fallback with solid accuracy for short responses.",
        vramMb: 1630,
        contextWindowTokens: 4096,
        responseMaxTokens: 512,
        lowResource: true,
    },
    {
        id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        name: "Qwen 2.5 0.5B",
        description: "Lightweight fallback for low VRAM or busy GPUs.",
        vramMb: 945,
        contextWindowTokens: 4096,
        responseMaxTokens: 384,
        lowResource: true,
    },
    {
        id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",
        name: "TinyLlama 1.1B",
        description: "Emergency fallback. Very fast, lower answer quality.",
        vramMb: 697,
        contextWindowTokens: 2048,
        responseMaxTokens: 256,
        lowResource: true,
    },
    {
        id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
        name: "Phi-3 Mini (4K)",
        description: "Higher Phi context, but tight on 4GB GPUs.",
        vramMb: 3672,
        contextWindowTokens: 4096,
        responseMaxTokens: 512,
        lowResource: false,
    }
];

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

type SharedRuntime = {
    worker: Worker | null;
    engine: MLCEngineInterface | null;
    enginePromise: Promise<MLCEngineInterface> | null;
    modelId: string | null;
    error: string | null;
};

const sharedRuntime: SharedRuntime = {
    worker: null,
    engine: null,
    enginePromise: null,
    modelId: null,
    error: null,
};

function getLoadedModelIds(engineInstance: MLCEngineInterface | null) {
    const maybeWorkerEngine = engineInstance as { modelId?: unknown } | null;
    const modelId = maybeWorkerEngine?.modelId;
    return Array.isArray(modelId) ? modelId : [];
}

function engineReportsDifferentModel(engineInstance: MLCEngineInterface | null, modelId: string) {
    const loadedModelIds = getLoadedModelIds(engineInstance);
    return loadedModelIds.length > 0 && !loadedModelIds.includes(modelId);
}

function getModelProfile(modelId: string | null) {
    return SUPPORTED_MODELS.find((model) => model.id === modelId) || SUPPORTED_MODELS[0];
}

function estimateTokenCount(text: string) {
    return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

function trimToTokenBudget(content: string, tokenBudget: number) {
    if (tokenBudget <= 0) return "";
    const maxChars = tokenBudget * APPROX_CHARS_PER_TOKEN;
    if (content.length <= maxChars) return content;
    return content.slice(-maxChars);
}

function trimSystemPromptToBudget(content: string, tokenBudget: number) {
    if (tokenBudget <= 0) return "";

    const maxChars = tokenBudget * APPROX_CHARS_PER_TOKEN;
    if (content.length <= maxChars) return content;

    const marker = "\n\n[System prompt compacted to fit the local model context.]\n\n";
    const usableChars = Math.max(0, maxChars - marker.length);
    const headChars = Math.floor(usableChars * 0.58);
    const tailChars = usableChars - headChars;

    const tail = tailChars > 0 ? content.slice(-tailChars) : "";
    return `${content.slice(0, headChars)}${marker}${tail}`;
}

function fitMessagesToModel(messages: Message[], modelId: string) {
    const profile = getModelProfile(modelId);
    const contextWindow = profile.contextWindowTokens || DEFAULT_CONTEXT_WINDOW_TOKENS;
    const responseMaxTokens = profile.responseMaxTokens || DEFAULT_RESPONSE_MAX_TOKENS;
    const promptBudget = Math.max(
        256,
        contextWindow - responseMaxTokens - PROMPT_SAFETY_MARGIN_TOKENS,
    );

    const systemMessages = messages.filter((message) => message.role === "system");
    const latestSystemMessage = systemMessages.at(-1);
    const systemPromptBudget = latestSystemMessage ? Math.floor(promptBudget * 0.62) : 0;
    const systemMessageForModel = latestSystemMessage
        ? {
            ...latestSystemMessage,
            content: trimSystemPromptToBudget(latestSystemMessage.content, systemPromptBudget),
        }
        : undefined;
    const chatMessages = messages.filter((message) => message.role !== "system");
    const fittedChatMessages: Message[] = [];

    let remainingTokens = promptBudget;
    if (systemMessageForModel) {
        const systemTokenCost = estimateTokenCount(systemMessageForModel.content) + 16;
        remainingTokens -= systemTokenCost;
    }

    for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
        const message = chatMessages[index];
        const messageTokenCost = estimateTokenCount(message.content) + 8;

        if (messageTokenCost <= remainingTokens) {
            fittedChatMessages.unshift(message);
            remainingTokens -= messageTokenCost;
            continue;
        }

        if (message.role === "user" && fittedChatMessages.length === 0) {
            fittedChatMessages.unshift({
                ...message,
                content: trimToTokenBudget(message.content, Math.max(64, remainingTokens - 8)),
            });
        }

        break;
    }

    return systemMessageForModel ? [systemMessageForModel, ...fittedChatMessages] : fittedChatMessages;
}

function isWebLLMAbortError(error: unknown) {
    const errorLike = error as { name?: unknown; message?: unknown };
    const name = typeof errorLike?.name === "string" ? errorLike.name : "";
    const message = typeof errorLike?.message === "string" ? errorLike.message : String(error);

    return (
        name === "AbortError" ||
        message.includes("AbortError") ||
        message.includes("Buffer was unmapped before mapping was resolved") ||
        (message.includes("mapAsync") && message.includes("unmapped"))
    );
}

function isWebLLMDeviceLostError(error: unknown) {
    const message = String(error).toLowerCase();
    return (
        message.includes("device was lost") ||
        message.includes("gpudevicelostinfo") ||
        message.includes("device_hung") ||
        message.includes("hung") ||
        message.includes("0x887a0006") ||
        message.includes("out of memory") ||
        message.includes("vram")
    );
}

function isWebLLMDisposedError(error: unknown) {
    const message = String(error).toLowerCase();
    return (
        message.includes("already been disposed") ||
        message.includes("object is disposed") ||
        message.includes("cannot use disposed") ||
        message.includes("tokenizer instance already deleted") ||
        message.includes("instance already deleted") ||
        message.includes("worker terminated")
    );
}

function isWebLLMContextOverflowError(error: unknown) {
    const message = String(error);
    return (
        message.includes("ContextWindowSizeExceededError") ||
        message.includes("exceed context window size") ||
        message.includes("prompt tokens")
    );
}

function isWebLLMModelNotLoadedError(error: unknown) {
    const errorLike = error as { name?: unknown; message?: unknown };
    const name = typeof errorLike?.name === "string" ? errorLike.name : "";
    const message = typeof errorLike?.message === "string" ? errorLike.message : String(error);

    return (
        name === "ModelNotLoadedError" ||
        name === "WorkerEngineModelNotLoadedError" ||
        name === "SpecifiedModelNotFoundError" ||
        message.includes("Model not loaded before trying to complete") ||
        message.includes("is not loaded with a model") ||
        message.includes("is not found in loaded models")
    );
}

function getFallbackModelId(modelId: string, error: unknown) {
    if (!isWebLLMDeviceLostError(error)) return null;
    if (modelId === EMERGENCY_WEBLLM_MODEL_ID) return null;
    if (modelId === LIGHTWEIGHT_WEBLLM_MODEL_ID) return EMERGENCY_WEBLLM_MODEL_ID;
    return LIGHTWEIGHT_WEBLLM_MODEL_ID;
}

function getOrCreateWorker(forceReload = false) {
    if (typeof window === "undefined") return null;

    if (forceReload && sharedRuntime.worker) {
        sharedRuntime.worker.terminate();
        sharedRuntime.worker = null;
        sharedRuntime.engine = null;
        sharedRuntime.enginePromise = null;
    }

    if (!sharedRuntime.worker) {
        const realWorker = new Worker(
            new URL("../workers/ai.worker.ts", import.meta.url),
            { type: "module" },
        );

        // Wrap the worker to swallow the "unknown uuid" error that web-llm sometimes throws
        // when a delayed worker response arrives after the generation was interrupted.
        sharedRuntime.worker = new Proxy(realWorker, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            },
            set(target, prop, value) {
                if (prop === "onmessage" && typeof value === "function") {
                    const originalHandler = value;
                    target.onmessage = function(event) {
                        try {
                            originalHandler.call(target, event);
                        } catch (err: any) {
                            if (err?.message?.includes("unknown uuid")) {
                                console.warn("Caught and ignored web-llm unknown uuid error:", err.message);
                            } else {
                                throw err;
                            }
                        }
                    };
                    return true;
                }
                (target as any)[prop] = value;
                return true;
            }
        }) as unknown as Worker;
    }

    return sharedRuntime.worker;
}


export function useWebLLM() {
    const [engine, setEngine] = useState<MLCEngineInterface | null>(sharedRuntime.engine);
    const [progress, setProgress] = useState<string>(sharedRuntime.engine && sharedRuntime.modelId ? "Ready" : "");
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [error, setError] = useState<string | null>(sharedRuntime.error);
    const [capabilities, setCapabilities] = useState<CapabilityReport | null>(null);

    useEffect(() => {
        void getSystemCapabilities().then(setCapabilities);
    }, []);

    const engineRef = useRef<MLCEngineInterface | null>(sharedRuntime.engine);
    const stopRequestedRef = useRef(false);
    const generationDoneRef = useRef<Promise<void> | null>(null);

    const syncLoadedEngine = useCallback((engineInstance: MLCEngineInterface, modelId: string) => {
        sharedRuntime.engine = engineInstance;
        sharedRuntime.modelId = modelId;
        sharedRuntime.error = null;
        engineRef.current = engineInstance;

        setEngine(engineInstance);
        setIsLoaded(true);
        setIsInstalled(true);
        setProgress("Ready");
        setProgressPercentage(100);
        setError(null);

        if (typeof window !== "undefined") {
            localStorage.setItem("obn_ai_installed", "true");
        }
    }, []);

    const reloadEngine = useCallback(async (
        engineInstance: MLCEngineInterface,
        modelId: string,
        background = false,
    ) => {
        setIsLoading(true);
        setIsLoaded(false);
        setIsInstalled(true);
        setError(null);
        sharedRuntime.error = null;
        setProgress(background ? "Restoring local AI from browser cache..." : "Reloading local AI engine...");
        setProgressPercentage(0);

        try {
            await engineInstance.reload(modelId);
            syncLoadedEngine(engineInstance, modelId);
        } catch (error: unknown) {
            const errorMsgStr = String(error);
            if (!errorMsgStr.includes("Unable to find a compatible GPU")) {
                console.error("Failed to reload model:", error);
            } else {
                console.warn("Local AI reload skipped: No compatible WebGPU adapter found.");
            }
            sharedRuntime.modelId = null;
            setIsLoaded(false);
            
            const isDeviceLost = isWebLLMDeviceLostError(error);
            const errorMsg = isDeviceLost 
                ? "GPU Device Lost: Your hardware might be struggling. Try closing other tabs or using the lightweight model."
                : "Error: Failed to load model. Ensure your browser supports WebGPU.";
            
            setError(errorMsg);
            sharedRuntime.error = errorMsg;
            setProgress(errorMsg);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [syncLoadedEngine]);

    const loadModel = useCallback(async (
        modelId = DEFAULT_WEBLLM_MODEL_ID, 
        forceReload = false,
        background = false
    ) => {
        setError(null);
        sharedRuntime.error = null;

        if (sharedRuntime.engine && sharedRuntime.modelId === modelId && !forceReload) {
            if (engineReportsDifferentModel(sharedRuntime.engine, modelId)) {
                await reloadEngine(sharedRuntime.engine, modelId, background);
            } else {
                syncLoadedEngine(sharedRuntime.engine, modelId);
            }

            return;
        }

        if (sharedRuntime.enginePromise && (!sharedRuntime.modelId || sharedRuntime.modelId === modelId)) {
            setIsLoading(true);
            setProgress(background ? "Restoring local AI from browser cache..." : "Finishing engine startup...");

            try {
                const engineInstance = await sharedRuntime.enginePromise;
                syncLoadedEngine(engineInstance, sharedRuntime.modelId || modelId);
            } catch (error) {
                const errorMsgStr = String(error);
                if (!errorMsgStr.includes("Unable to find a compatible GPU")) {
                    console.error("Failed to load model:", error);
                } else {
                    console.warn("Local AI initialization skipped: No compatible WebGPU adapter found.");
                }
                const isDeviceLost = isWebLLMDeviceLostError(error);
                const errorMsg = isDeviceLost 
                    ? "GPU Device Lost: Your hardware might be struggling. Try closing other tabs or using the lightweight model."
                    : "Error: Failed to load model. Ensure your browser supports WebGPU.";
                setError(errorMsg);
                sharedRuntime.error = errorMsg;
                setProgress(errorMsg);
            } finally {
                setIsLoading(false);
            }

            return;
        }

        const caps = capabilities || await getSystemCapabilities();
        const useWasmFallback = !caps.webGPU;
        
        // If no WebGPU, we MUST use the lightweight model to prevent hanging the CPU
        const targetModelId = useWasmFallback ? LIGHTWEIGHT_WEBLLM_MODEL_ID : modelId;

        if (useWasmFallback) {
            console.warn("WebGPU not found. Falling back to WASM (CPU) mode. Performance will be limited.");
            setProgress("Starting in Compatibility Mode (CPU)...");
        }

        const worker = getOrCreateWorker(forceReload);
        if (!worker) return;

        setIsLoading(true);
        setIsLoaded(false);
        if (background) {
            setIsInstalled(true);
        }
        setProgress(background ? "Restoring local AI from browser cache..." : "Initializing WebGPU...");
        setProgressPercentage(0);

        sharedRuntime.modelId = targetModelId;
        
        const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
        
        const enginePromise = CreateWebWorkerMLCEngine(
            worker,
            targetModelId,
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

        let fallbackModelId: string | null = null;

        try {
            const engineInstance = await enginePromise;
            syncLoadedEngine(engineInstance, targetModelId);
        } catch (error) {
            const errorMsgStr = String(error);
            const isNoGPU = errorMsgStr.includes("Unable to find a compatible GPU");
            const isNetworkError = errorMsgStr.includes("NetworkError") || errorMsgStr.includes("encountered a network error") || errorMsgStr.includes("fetch");
            
            if (!isNoGPU && !isNetworkError) {
                console.error("Failed to load model:", error);
            } else if (isNoGPU) {
                console.warn("Local AI initialization skipped: No compatible WebGPU adapter found.");
            } else if (isNetworkError) {
                console.warn("Local AI download skipped: Device is offline and model is not in cache.");
            }
            
            const isDeviceLost = isWebLLMDeviceLostError(error);
            const isDisposed = isWebLLMDisposedError(error);
            
            if (isDisposed || isDeviceLost) {
                // If the engine or GPU device is in a corrupted state,
                // we must flush the shared runtime entirely so the next attempt starts fresh.
                sharedRuntime.worker?.terminate();
                sharedRuntime.worker = null;
                sharedRuntime.engine = null;
                sharedRuntime.enginePromise = null;
            }

            let errorMsg = "Error: Failed to load model. Ensure your browser supports WebGPU or try Compatibility Mode.";
            if (isNetworkError) {
                errorMsg = "Network Error: You must be connected to the internet the first time you load a model to cache it locally. Once cached, it works 100% offline.";
            } else if (isDeviceLost) {
                errorMsg = "GPU Device Lost: Your hardware might be struggling. Try closing other tabs or using the lightweight model.";
            } else if (isDisposed) {
                errorMsg = "Local engine was stale. Resetting... please try again.";
            }

            setError(errorMsg);
            sharedRuntime.error = errorMsg;
            setProgress(errorMsg);
            sharedRuntime.modelId = null;
            
            // Only try fallback if it wasn't a network error (since fallback would also need internet to download)
            if (!isNetworkError && !isDisposed) {
                fallbackModelId = getFallbackModelId(modelId, error);
            }
        } finally {
            if (sharedRuntime.enginePromise === enginePromise) {
                sharedRuntime.enginePromise = null;
            }
            setIsLoading(false);
        }

        if (fallbackModelId) {
            const fallbackProfile = getModelProfile(fallbackModelId);
            setProgress(`GPU memory pressure detected. Switching to ${fallbackProfile.name}...`);
            await loadModel(fallbackModelId, true, background);
        }
    }, [reloadEngine, syncLoadedEngine, capabilities]);

    // Removed auto-loading useEffect to prevent blocking initial LCP with AI worker initialization.
    // The engine will now only initialize when loadModel() is explicitly called (e.g., when opening chat).


    useEffect(() => {
        if (sharedRuntime.enginePromise) {
            void loadModel(sharedRuntime.modelId || DEFAULT_WEBLLM_MODEL_ID, false, true);
            return;
        }

        const installedFlag = localStorage.getItem("obn_ai_installed") === "true";
        if (installedFlag) {
            setIsInstalled(true);
            setProgress("Local AI is cached. Open Echo to start the engine.");
            return;
        }
    }, [loadModel]);

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

        const activeModelId = sharedRuntime.modelId || DEFAULT_WEBLLM_MODEL_ID;
        if (engineReportsDifferentModel(activeEngine, activeModelId)) {
            await reloadEngine(activeEngine, activeModelId, true);
        }

        const modelProfile = getModelProfile(activeModelId);
        const messagesForModel = fitMessagesToModel(messages, activeModelId) as ChatCompletionMessageParam[];

        setIsGenerating(true);
        stopRequestedRef.current = false;
        let resolveGenerationDone!: () => void;
        const generationDone = new Promise<void>((resolve) => {
            resolveGenerationDone = resolve;
        });
        generationDoneRef.current = generationDone;
        let fullText = "";

        const streamCompletion = async () => {
            const completion = await activeEngine!.chat.completions.create({
                model: activeModelId,
                messages: messagesForModel,
                stream: true,
                temperature: 0.7,
                max_tokens: modelProfile.responseMaxTokens,
                presence_penalty: 0.0,
                frequency_penalty: 0.0,
            });

            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (!stopRequestedRef.current && content) {
                    fullText += content;
                    onToken?.(content);
                }
            }

            return fullText;
        };

        try {
            return await streamCompletion();
        } catch (error) {
            if (stopRequestedRef.current || isWebLLMAbortError(error)) {
                return fullText;
            }

            if (!fullText && isWebLLMModelNotLoadedError(error)) {
                await reloadEngine(activeEngine, activeModelId, true);
                return await streamCompletion();
            }

            if (isWebLLMContextOverflowError(error)) {
                // Context window exceeded — reset chat context and let user retry
                const activeEngineRef = engineRef.current ?? sharedRuntime.engine;
                if (activeEngineRef) {
                    try { await activeEngineRef.resetChat(); } catch { /* ignore */ }
                }
                const errorMsg = "Message too long for this model's context window. Chat history has been reset — please try a shorter message.";
                setError(errorMsg);
                sharedRuntime.error = errorMsg;
            } else if (isWebLLMDisposedError(error) || isWebLLMDeviceLostError(error)) {
                const isDisposed = isWebLLMDisposedError(error);
                const errorMsg = isDisposed
                    ? "Engine was disposed after a previous error. Reloading automatically..."
                    : "GPU Device Lost: The engine has crashed. Please refresh or try the lightweight model.";
                setError(errorMsg);
                sharedRuntime.error = errorMsg;
                
                // Reset engine state as it is now unusable
                sharedRuntime.engine = null;
                sharedRuntime.enginePromise = null;
                engineRef.current = null;
                setEngine(null);
                setIsLoaded(false);

                // Auto-reload for disposed engines (recoverable)
                if (isDisposed) {
                    try {
                        // Pass true for forceReload, false for background
                        await loadModel(activeModelId, true, false);
                        setError(null);
                        sharedRuntime.error = null;
                    } catch {
                        // reload failed — user sees the error message
                    }
                }
            } else {
                // For other errors, log it normally
                console.error("Inference error:", error);
            }

            throw error;
        } finally {
            setIsGenerating(false);
            stopRequestedRef.current = false;
            if (generationDoneRef.current === generationDone) {
                generationDoneRef.current = null;
            }
            resolveGenerationDone();
        }
    }, [engine, loadModel, reloadEngine, syncLoadedEngine]);

    const stopGeneration = useCallback(async () => {
        stopRequestedRef.current = true;

        const activeEngine = engineRef.current ?? sharedRuntime.engine;
        if (activeEngine) {
            activeEngine.interruptGenerate();
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
        const generationDone = generationDoneRef.current;

        if (activeEngine) {
            stopRequestedRef.current = true;
            activeEngine.interruptGenerate();
        }

        if (generationDone) {
            await generationDone;
        }

        if (activeEngine) {
            try {
                await activeEngine.unload();
            } catch (e) {
                console.warn("Failed to unload engine (might already be lost):", e);
            }
        }

        sharedRuntime.engine = null;
        sharedRuntime.enginePromise = null;
        sharedRuntime.modelId = null;
        sharedRuntime.error = null;
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
        setError(null);

        if (typeof window !== "undefined") {
            localStorage.removeItem("obn_ai_installed");
            
            
            try {
                if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name && (db.name.includes("web-llm") || db.name.includes("mlc"))) {
                            window.indexedDB.deleteDatabase(db.name);
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to clear indexedDB during uninstall:", e);
            }

            try {
                if ("caches" in window) {
                    const cacheNames = await caches.keys();
                    for (const name of cacheNames) {
                        if (name.includes("web-llm") || name.includes("mlc")) {
                            await caches.delete(name);
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to clear caches during uninstall:", e);
            }

            // 3. Clear OPFS (Origin Private File System) - Modern WebLLM uses this for large files
            try {
                if ('storage' in navigator && 'getDirectory' in navigator.storage) {
                    const root = await navigator.storage.getDirectory();
                    // We try to remove common directories used by WebLLM/MLC
                    const entries = ["web_llm", "mlc", "model_cache"];
                    for (const entryName of entries) {
                        try {
                            await root.removeEntry(entryName, { recursive: true });
                        } catch (e) {
                            // Directory might not exist, ignore
                        }
                    }
                    
                    // Also try to list and delete anything that looks like a model
                    // @ts-ignore - Some browsers support iteration
                    if (root.entries) {
                        // @ts-ignore
                        for await (const [name] of root.entries()) {
                            if (name.includes("web-llm") || name.includes("mlc") || name.includes("llama") || name.includes("qwen")) {
                                try {
                                    await root.removeEntry(name, { recursive: true });
                                } catch (e) {}
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to clear OPFS during uninstall:", e);
            }

            setProgress("Model uninstalled successfully.");
        }
    }, []);

    const rawInference = useCallback(async (
        messages: Message[],
        max_tokens = 256
    ) => {
        const activeEngine = engineRef.current ?? sharedRuntime.engine ?? engine;
        if (!activeEngine) return "";

        const activeModelId = sharedRuntime.modelId || DEFAULT_WEBLLM_MODEL_ID;
        const modelProfile = getModelProfile(activeModelId);
        const messagesForModel = fitMessagesToModel(messages, activeModelId) as ChatCompletionMessageParam[];
        
        try {
            const completion = await activeEngine.chat.completions.create({
                model: activeModelId,
                messages: messagesForModel,
                stream: false,
                temperature: 0.7,
                max_tokens: Math.min(max_tokens, modelProfile.responseMaxTokens),
            });

            return completion.choices[0]?.message?.content || "";
        } catch (error) {
            console.error("Raw inference error:", error);
            return "";
        }
    }, [engine]);

    return {
        loadModel,
        generateResponse,
        rawInference,
        stopGeneration,
        resetChat,
        uninstallModel,
        progress,
        progressPercentage,
        isLoaded,
        isLoading,
        isInstalled,
        isGenerating,
        error,
        capabilities,
        activeModelId: sharedRuntime.modelId,
    };
}
