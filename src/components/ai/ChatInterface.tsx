import React, { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useAIChat } from "@/app/(tools)/ai-chat/hooks/useAIChat";
import { TOOLS } from "@/config/tools.registry";
import { buildSystemPrompt } from "@/config/echo-knowledge";
import ToolCard from "@/components/ui/ToolCard";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle,
  RotateCcw,
  Zap,
  ChevronLeft,
  Cpu,
  History,
  Loader2,
  Menu,
  MessageSquare,
  MoreVertical,
  Plus,
  Send,
  ShieldAlert,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { DEFAULT_WEBLLM_MODEL_ID, LIGHTWEIGHT_WEBLLM_MODEL_ID } from "@/hooks/useWebLLM";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { Markdown } from "@/components/ui/Markdown";
import Image from "next/image";
import { ModelPicker } from "./ModelPicker";
import { PipelineSuggestion } from "./PipelineSuggestion";


interface ChatInterfaceProps {
  modelName?: string;
  onClose?: () => void;
  onSetupRequired?: () => void;
}

const PIPELINE_LOADING_MESSAGES = [
  "Architecting your workflow...",
  "Great ideas take time...",
  "Connecting the toolchain...",
  "Optimizing interoperability...",
  "Polishing the pipeline nodes...",
  "Securing the data flow...",
  "Almost there..."
];

function ThinkingIndicator({ text, progress }: { text: string; progress?: number }) {
  return (
    <m.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 py-3 px-4 rounded-2xl rounded-tl-md border border-blue-500/20 bg-blue-500/[0.03] backdrop-blur-md shadow-sm"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <m.span 
            key={i}
            animate={{ 
              scale: [1, 1.3, 1], 
              opacity: [0.4, 1, 0.4],
              backgroundColor: ["rgba(59, 130, 246, 0.5)", "rgba(59, 130, 246, 1)", "rgba(59, 130, 246, 0.5)"]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.4, 
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="w-1.5 h-1.5 rounded-full" 
          />
        ))}
      </div>
      <div className="flex flex-col gap-0.5">
        <m.span 
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500/80"
        >
          {text}
        </m.span>
        {progress !== undefined && (
          <div className="h-1 w-32 overflow-hidden rounded-full bg-blue-500/10">
            <m.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-blue-500 transition-all duration-300"
            />
          </div>
        )}
      </div>
    </m.div>
  );
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const currentRoute = usePathname();
  const {
    conversations,
    activeId,
    setActiveId,
    createNewConversation,
    addMessageToActive,
    commitActiveConversation,
    deleteConversation,
    activeConversation,
  } = useConversations();

  const { 
    generateResponse, 
    stopGeneration, 
    isGenerating, 
    uninstallModel, 
    isLoaded, 
    isLoading, 
    progressPercentage,
    error,
    loadModel,
    activeModelId,
    toolState,
    runtimeSnapshot,
    recordRuntimeEvent
  } = useAIChat();

  const [input, setInput] = useState("");
  const [streamBuffer, setStreamBuffer] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!showHistory && !isGenerating && textareaRef.current && isLoaded) {
      textareaRef.current.focus();
    }
  }, [showHistory, isGenerating, isLoaded]);

  useEffect(() => {
    if (!showHistory) {
      scrollToBottom();
    }
  }, [activeConversation?.messages, streamBuffer, showHistory]);

  useEffect(() => {
    if (conversations.length === 0 && !activeId && !showHistory) {
      createNewConversation();
    }
  }, [conversations.length, activeId, createNewConversation, showHistory]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !isLoaded) return;

    let currentActiveId = activeId;
    if (!currentActiveId) {
      currentActiveId = createNewConversation();
    }

    const userMsg = input.trim();
    setInput("");
    setStreamBuffer("");

    recordRuntimeEvent({
      kind: "ai",
      level: "info",
      message: "User asked Echo",
      detail: userMsg.slice(0, 500),
    });

    addMessageToActive({ role: "user", content: userMsg }, currentActiveId);

    const previousMessages = conversations.find((c) => c.id === currentActiveId)?.messages || [];
    const history = [...previousMessages, { role: "user" as const, content: userMsg }];

    // --- DOM SCRAPING FOR INSTANT AWARENESS ---
    let screenContext = "";
    try {
       // 1. Scrape standard DOM inputs
       const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
       inputs.forEach(el => {
           if (el === textareaRef.current) return; // Ignore the chat input itself
           const val = (el as HTMLInputElement | HTMLTextAreaElement).value;
           const placeholder = (el as HTMLInputElement).placeholder || el.getAttribute("name") || "Input Field";
           if (val && val.trim().length > 0 && val !== userMsg) {
               screenContext += `\n[${placeholder}]: ${val.substring(0, 800)}...`;
           }
       });

       // 2. Extract full Monaco Editor values from global registry
       if (typeof window !== 'undefined' && window.__ECHO_EDITORS__) {
           window.__ECHO_EDITORS__.forEach((val, key) => {
               if (val && val.trim().length > 0) {
                   screenContext += `\n[Editor - ${key}]:\n${val.substring(0, 1000)}...`;
               }
           });
       }
    } catch (e) {
      console.warn("Echo could not read screen context", e);
    }

    const systemPromptMessage = {
      role: "system" as const,
      content: buildSystemPrompt(
        TOOLS,
        currentRoute ?? undefined,
        toolState,
        screenContext.trim() || undefined,
        runtimeSnapshot,
      ),
    };

    // Filter out any existing system messages from history to ensure only the latest 
    // system instructions from buildSystemPrompt are used.
    const cleanHistory = history.filter(msg => msg.role !== "system");
    const messagesForEngine = [systemPromptMessage, ...cleanHistory];

    try {
      let fullResponse = "";
      const generatedResponse = await generateResponse(messagesForEngine, (token) => {
        fullResponse += token;
        setStreamBuffer(fullResponse);
      });
      const responseToSave = fullResponse || generatedResponse;

      if (responseToSave.trim()) {
        addMessageToActive({ role: "assistant", content: responseToSave }, currentActiveId);
      }
      setStreamBuffer("");
      commitActiveConversation();
    } catch (err) {
      const errMsg = String(err).toLowerCase();
      if (!errMsg.includes("already been disposed") && !errMsg.includes("device was lost") && !errMsg.includes("abort")) {
        console.error(err);
      }
      recordRuntimeEvent({
        kind: "ai",
        level: "error",
        message: "Echo generation failed",
        detail: err,
      });
      addMessageToActive(
        { role: "assistant", content: "An error occurred during generation. Please try again." },
        currentActiveId,
      );
      commitActiveConversation();
    }
  };

  const handleStop = async () => {
    await stopGeneration();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (showHistory) {
    return (
      <m.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="flex h-full w-full flex-col bg-(--background) overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-overlay)/90 px-4 py-3 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(false)}
            className="gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-elevated)/70 text-(--text-secondary) hover:bg-(--surface-hover)"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-sm font-semibold text-(--text-primary)">
            <History className="h-4 w-4 text-blue-500" />
            Chat History
          </div>
          <Button
            onClick={() => {
              createNewConversation();
              setShowHistory(false);
            }}
            size="sm"
            className="gap-2 rounded-lg bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="mx-auto max-w-3xl space-y-2">
            {conversations.map((conv) => (
              <m.div
                layout
                key={conv.id}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all",
                  activeId === conv.id
                    ? "border-blue-500/30 bg-blue-500/10 text-(--text-primary) shadow-sm"
                    : "border-(--border-subtle) bg-(--surface-elevated)/65 text-(--text-secondary) hover:border-blue-500/25 hover:bg-(--surface-hover)",
                )}
                onClick={() => {
                  setActiveId(conv.id);
                  setShowHistory(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      activeId === conv.id ? "bg-blue-500/15 text-blue-500" : "bg-(--surface-hover) text-(--text-muted)",
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{conv.title}</p>
                    <p className="mt-0.5 text-xs text-(--text-muted)">{conv.messages.length} messages</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${conv.title}`}
                  className="h-8 w-8 shrink-0 rounded-lg text-(--text-muted) opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </m.div>
            ))}
            {conversations.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-(--border-medium) bg-(--surface-elevated)/45 p-10 text-center">
                <MessageSquare className="h-8 w-8 text-(--text-faint)" />
                <p className="text-sm font-medium text-(--text-secondary)">No recent conversations yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-(--border-subtle) p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-4 rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-bold text-(--text-primary)">Local Intelligence Management</h3>
                  <p className="text-xs leading-relaxed text-(--text-muted)">
                    Uninstalling the AI engine will clear all cached model weights (up to 2GB) from your browser storage. You will need an internet connection to reinstall.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm("Uninstall Local AI Engine? This will clear cached model weights.")) {
                    uninstallModel();
                    setShowHistory(false);
                  }
                }}
                className="w-full border-red-500/20 bg-transparent text-red-500 hover:bg-red-500/10 hover:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Uninstall Engine & Clear Cache
              </Button>
            </div>
          </div>
        </div>
      </m.div>
    );
  }

  const chatStatus = isLoading && !isLoaded ? "Warming" : isGenerating ? "Responding" : isLoaded ? "Ready" : "Offline";
  const isChatable = isLoaded && !isLoading && !isGenerating;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,var(--surface-overlay)_0%,var(--background)_100%)]">
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(var(--border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--border-subtle)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="relative z-10 flex items-center justify-between border-b border-(--border-subtle) bg-(--surface-overlay)/86 px-4 py-3 backdrop-blur-xl md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open chat history"
            onClick={() => setShowHistory(true)}
            className="rounded-lg border border-(--border-subtle) bg-(--surface-elevated)/70 text-(--text-secondary) hover:bg-(--surface-hover)"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
            <Image 
              src="/assets/images/echo_basic.png" 
              alt="Echo" 
              width={40} 
              height={40} 
              className="object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center">
              <h2 className="truncate text-sm font-semibold tracking-tight text-(--text-primary)">Echo</h2>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                  isChatable
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : isGenerating
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
                )}
              >
                {chatStatus}
              </span>
              <div className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Beta
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close chat"
              className="rounded-lg text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-5 scrollbar-thin md:px-6">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
          {!activeConversation?.messages.length ? (
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 shadow-xl shadow-blue-500/10 overflow-hidden border border-blue-500/20">
                <Image 
                  src="/assets/images/echo_basic.png" 
                  alt="Echo" 
                  width={64} 
                  height={64} 
                  className="h-full w-full object-cover p-1"
                />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-(--text-primary)">What can Echo help with?</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-(--text-muted)">
                Ask about Toolbase tools, OBN, workflows, or which utility fits the job. Your chat runs locally.
              </p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                {["Find the right tool", "Explain a workflow", "Compare tool options"].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-lg border border-(--border-subtle) bg-(--surface-elevated)/70 px-3 py-3 text-sm font-medium text-(--text-secondary) transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-(--text-primary)"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </m.div>
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {activeConversation.messages.map((msg, idx) => {
                  let matchedTools: typeof TOOLS = [];
                  let pipelineData = null;
                  let contentToRender = msg.content;

                  if (msg.role === "assistant") {
                    // Tool matching
                    matchedTools = TOOLS.filter(
                      (t) =>
                        msg.content.toLowerCase().includes(t.name.toLowerCase()) ||
                        msg.content.toLowerCase().includes(`/${t.route.toLowerCase()}`),
                    );

                    // Pipeline suggestion detection (Aggressive for reliability)
                    // Catch blocks with tip-pipeline, json, or no tag at all if they contain pipeline keys
                    const pipelineRegex = /```[\s\S]*?```|[\s\r\n](\{[\s\S]*?"steps"[\s\S]*?\})[\s\r\n]/g;
                    let match;
                    while ((match = pipelineRegex.exec(msg.content)) !== null) {
                      const blockContent = match[0];
                      
                      // Check if it's a pipeline (by tag or by signature keys)
                      const isPipeline = blockContent.includes("tip-pipeline") || 
                                         (blockContent.includes("\"steps\"") && blockContent.includes("\"name\""));
                      
                      if (isPipeline) {
                        try {
                          const jsonPart = blockContent.includes("{") 
                            ? blockContent.match(/\{[\s\S]*\}/)?.[0] 
                            : null;
                          
                          if (jsonPart) {
                            const parsed = JSON.parse(jsonPart);
                            if (parsed.name && Array.isArray(parsed.steps)) {
                                pipelineData = parsed;
                                contentToRender = contentToRender.replace(blockContent, "").trim();
                                break; 
                            }
                          }
                        } catch {
                          // Silently fail, it might just be normal JSON text
                        }
                      }
                    }
                  }

                  return (
                    <m.div
                      initial={{ opacity: 0, y: 10, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      key={idx}
                      className={cn("flex w-full gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {msg.role === "assistant" && (
                        <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 shadow-sm overflow-hidden border border-blue-500/20 sm:flex">
                          <Image 
                            src="/assets/images/echo_basic.png" 
                            alt="Echo" 
                            width={32} 
                            height={32} 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}

                      <div className={cn("flex max-w-[88%] flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "px-4 py-3 text-[15px] leading-relaxed shadow-sm",
                            msg.role === "user"
                              ? "rounded-2xl rounded-tr-md bg-blue-600 text-white shadow-blue-500/20"
                              : "rounded-2xl rounded-tl-md border border-(--border-subtle) bg-(--surface-elevated)/86 text-(--text-primary)",
                          )}
                        >
                          {msg.role === "user" ? (
                            <div className="whitespace-pre-wrap font-sans">{contentToRender}</div>
                          ) : (
                            <>
                              <Markdown content={contentToRender} />
                              {pipelineData && <PipelineSuggestion data={pipelineData} />}
                            </>
                          )}
                        </div>

                        {matchedTools.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-3">
                            {matchedTools.map((t) => (
                              <m.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={t.id}
                                className="w-40 overflow-hidden rounded-lg border border-(--border-subtle) shadow-lg transition-colors hover:border-blue-500/40"
                              >
                                <ToolCard
                                  title={t.name}
                                  route={`/${t.route}`}
                                  icon={t.thumbnail}
                                  toolId={t.id}
                                  metadata={t.tags}
                                />
                              </m.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </m.div>
                  );
                })}

                {streamBuffer && (
                  <m.div
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex w-full justify-start gap-3"
                  >
                    <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 shadow-sm overflow-hidden border border-blue-500/20 sm:flex">
                      <Image 
                        src="/assets/images/echo_basic.png" 
                        alt="Echo" 
                        width={32} 
                        height={32} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="max-w-[88%] flex flex-col gap-2">
                      <div className={cn(
                        "rounded-2xl rounded-tl-md border border-(--border-subtle) bg-(--surface-elevated)/86 px-4 py-3 text-[15px] leading-relaxed shadow-sm"
                      )}>
                        <Markdown content={streamBuffer.replace(/```[\s\S]*?(?:```|$)|[\s\r\n]\{[\s\S]*?"steps"[\s\S]*?(?:\}|$)[\s\r\n]/g, "").trim() || "Echo is thinking..."} />
                        
                        {/* Show creative loader if we detect a pipeline-like structure forming */}
                        {(streamBuffer.includes("```") || (streamBuffer.includes("{") && streamBuffer.includes("\"steps\""))) && 
                         !streamBuffer.match(/```[\s\S]*?```/) && (
                          <ThinkingIndicator text="Architecting Pipeline" />
                        )}
                      </div>
                      
                      {/* Check if we have a complete pipeline in the buffer */}
                      {(() => {
                        const match = streamBuffer.match(/```[\s\S]*?```|[\s\r\n](\{[\s\S]*?"steps"[\s\S]*?\})[\s\r\n]/);
                        if (match) {
                          try {
                            const jsonPart = match[0].match(/\{[\s\S]*\}/)?.[0];
                            if (jsonPart) {
                              const parsed = JSON.parse(jsonPart);
                              if (parsed.name && Array.isArray(parsed.steps)) {
                                return <PipelineSuggestion data={parsed} />;
                              }
                            }
                          } catch { /* Still streaming or invalid */ }
                        }
                        return null;
                      })()}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {(isGenerating || (isLoading && !isLoaded)) && !streamBuffer && (
            <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 flex justify-start gap-3">
              <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center overflow-hidden sm:flex">
                <Image 
                  src="/assets/images/echo_basic.png" 
                  alt="Echo" 
                  width={32} 
                  height={32} 
                  className="object-contain"
                  priority
                />
              </div>
              <ThinkingIndicator 
                text={isLoading && !isLoaded ? "Warming Engine" : "Echo is thinking"} 
                progress={isLoading && !isLoaded ? progressPercentage : undefined}
              />
            </m.div>
          )}
          {error && (
            <m.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider">Engine Crash</h3>
                    <p className="mt-1 text-sm leading-relaxed text-(--text-primary)">
                      {error}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      size="sm"
                      onClick={() => loadModel(activeModelId || DEFAULT_WEBLLM_MODEL_ID)}
                      className="gap-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Try Again
                    </Button>
                    
                    {activeModelId !== LIGHTWEIGHT_WEBLLM_MODEL_ID && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadModel(LIGHTWEIGHT_WEBLLM_MODEL_ID)}
                        className="gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                      >
                        <Zap className="h-4 w-4" />
                        Switch to Lightweight
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </m.div>
          )}

          <div ref={messagesEndRef} className="pb-4" />
        </div>
      </div>

      <div className="relative z-10 border-t border-(--border-subtle) bg-(--surface-overlay)/90 p-4 backdrop-blur-2xl">
        <div className="mx-auto max-w-4xl">
          <div className="group relative rounded-[28px] border border-(--border-subtle) bg-(--surface-elevated)/95 p-2 shadow-[0_12px_40px_var(--shadow-color)] transition-all focus-within:border-blue-500/40 focus-within:ring-4 focus-within:ring-blue-500/10">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoaded ? "Ask Echo about Toolbase..." : "Warming up local AI..."}
              className="max-h-[200px] min-h-[48px] w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-(--text-primary) outline-none placeholder:text-(--text-muted) disabled:opacity-50"
              rows={1}
              disabled={isGenerating || !isLoaded}
            />
            
            <div className="flex items-center justify-between px-2 pt-1 pb-1">
              <div className="flex items-center gap-2">
                <ModelPicker />
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <Button
                    onClick={handleStop}
                    size="icon"
                    aria-label="Stop response"
                    className="h-10 w-10 rounded-full bg-(--text-primary) p-0 text-(--background) shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || !isLoaded}
                    size="icon"
                    aria-label="Send message"
                    className={cn(
                      "h-10 w-10 rounded-full p-0 shadow-lg transition-all hover:scale-105 active:scale-95",
                      input.trim() && isLoaded
                        ? "bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700"
                        : "bg-(--surface-hover) text-(--text-muted) opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Send className="h-[18px] w-[18px]" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-(--text-faint) opacity-60">
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-blue-500" />
              <span>Echo Beta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-(--border-medium)" />
              <span>Enter to send</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-(--border-medium)" />
              <span>Shift + Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
