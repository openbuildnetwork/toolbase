import React, { useRef, useEffect, useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { useAIChat } from "@/hooks/useAIChat";
import { TOOLS } from "@/config/tools.registry";
import ToolCard from "@/components/ui/ToolCard";
import { Button } from "@/components/ui/Button";
import { Send, Plus, Trash2, MessageSquare, List, ChevronLeft, MoreVertical, ShieldAlert, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInterfaceProps {
  modelName?: string;
  onClose?: () => void;
  onSetupRequired?: () => void;
}

export function ChatInterface({ modelName, onClose, onSetupRequired }: ChatInterfaceProps) {
  const {
    conversations,
    activeId,
    setActiveId,
    createNewConversation,
    addMessageToActive,
    updateAssistantMessage,
    commitActiveConversation,
    deleteConversation,
    activeConversation,
  } = useConversations();

  const { generateResponse, isGenerating, uninstallModel, isLoaded, isLoading, progressPercentage } = useAIChat();

  const [input, setInput] = useState("");
  const [streamBuffer, setStreamBuffer] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !isLoaded) return;

    let currentActiveId = activeId;
    if (!currentActiveId) {
      currentActiveId = createNewConversation();
    }

    const userMsg = input.trim();
    setInput("");
    setStreamBuffer("");

    addMessageToActive({ role: "user", content: userMsg }, currentActiveId);

    // Manually construct the history for the engine to include the very first message
    const previousMessages = conversations.find(c => c.id === currentActiveId)?.messages || [];
    const history = [...previousMessages, { role: "user" as const, content: userMsg }];

    const toolDescriptions = TOOLS.map(t => `- **${t.name}**: ${t.description}`).join('\n');
    const systemPromptMessage = {
      role: "system" as const,
      content: `You are the AI assistant for OBN Toolbase. Answer concisely, directly, and naturally. Do NOT write markdown links or URLs. Available tools:\n${toolDescriptions}`
    };

    const messagesForEngine = [systemPromptMessage, ...history];

    try {
      let fullResponse = "";
      await generateResponse(messagesForEngine, (token) => {
        fullResponse += token;
        setStreamBuffer(fullResponse);
      });
      
      addMessageToActive({ role: "assistant", content: fullResponse }, currentActiveId);
      setStreamBuffer("");
      commitActiveConversation();
    } catch (err) {
      console.error(err);
      addMessageToActive({ role: "assistant", content: "An error occurred during generation. Please try again." }, currentActiveId);
      commitActiveConversation();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (showHistory) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="flex h-full w-full flex-col bg-(--background)"
      >
        <div className="flex items-center justify-between border-b border-(--border-subtle) p-4 bg-(--surface-overlay)/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="px-2 hover:bg-(--surface-hover)">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="font-semibold text-sm text-(--text-primary)">Chat History</span>
          </div>
          <Button onClick={() => { createNewConversation(); setShowHistory(false); }} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {conversations.map((conv) => (
            <motion.div
              layout
              key={conv.id}
              className={cn(
                "group flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3.5 text-sm transition-all border",
                activeId === conv.id 
                  ? "bg-blue-500/10 border-blue-500/20 text-(--text-primary)" 
                  : "bg-(--surface-secondary)/50 border-(--border-subtle) text-(--text-secondary) hover:bg-(--surface-hover) hover:border-blue-500/30"
              )}
              onClick={() => {
                setActiveId(conv.id);
                setShowHistory(false);
              }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn("p-2 rounded-xl", activeId === conv.id ? "bg-blue-500/20 text-blue-500" : "bg-(--surface-hover) text-(--text-muted)")}>
                   <MessageSquare className="h-4 w-4 shrink-0" />
                </div>
                <span className="truncate font-medium">{conv.title}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 text-(--text-muted) opacity-0 transition-opacity hover:text-red-500 hover:bg-red-500/10 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
          {conversations.length === 0 && (
            <div className="p-12 text-center text-sm text-(--text-muted) flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-(--surface-hover) flex items-center justify-center">
                 <MessageSquare className="h-8 w-8 text-(--text-faint)" />
              </div>
              <span>No recent conversations found.</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-(--background) relative overflow-hidden">
      {/* Dynamic Background Accents */}
      {/* <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" /> */}

      {/* Top Bar - Integrated with Global Title */}
      <div className="z-20 sticky top-0 p-4 flex justify-between items-center bg-(--background)/80 backdrop-blur-lg border-b border-(--border-subtle)/50">
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" className="bg-(--surface-overlay) hover:bg-(--surface-hover) shadow-sm h-9 px-3 border border-(--border-subtle) rounded-xl font-medium" onClick={() => setShowHistory(true)}>
            <List className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold tracking-tight text-(--text-primary)">Echo</h2>
            <span className="text-[10px] font-black text-blue-500 tracking-widest">Your local assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-xl bg-(--surface-overlay) border border-(--border-subtle) hover:bg-(--surface-hover)"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4 text-(--text-muted)" />
            </Button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-(--surface-overlay) border border-(--border-subtle) shadow-2xl p-1 z-30 overflow-hidden backdrop-blur-xl"
                >
                  <button
                    onClick={() => {
                      if (confirm("Uninstall Local AI Engine? This will clear ~2GB of cached model weights.")) {
                         uninstallModel();
                         setShowMenu(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-left"
                  >
                    <div className="p-1.5 rounded-lg bg-red-500/10">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    Uninstall Agent
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-xl bg-(--surface-hover) transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-(--text-muted)" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1  space-y-5 overflow-y-auto p-4 md:p-6 no-scrollbar">
        {!activeConversation?.messages.length ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center space-y-6 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative mb-2 flex h-20 w-20 items-center justify-center rounded-[32px] bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30">
                <Sparkles className="h-10 w-10" />
              </div>
            </div>
            <div className="space-y-2">
               <h2 className="text-2xl font-bold tracking-tight text-(--text-primary)">Local Intelligence Ready</h2>
               <p className="text-sm text-(--text-muted) max-w-[280px]">Ask me anything. Your data stays 100% on this device.</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {activeConversation.messages.map((msg, idx) => {
              let matchedTools: typeof TOOLS = [];
              if (msg.role === "assistant") {
                matchedTools = TOOLS.filter(t =>
                  msg.content.toLowerCase().includes(t.name.toLowerCase()) ||
                  msg.content.toLowerCase().includes(`/${t.route.toLowerCase()}`)
                );
              }

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={idx} 
                  className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex flex-col gap-2 max-w-[90%]", msg.role === "user" ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "rounded-[22px] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all",
                        msg.role === "user"
                          ? "rounded-tr-md bg-blue-600 text-white shadow-blue-500/20"
                          : "rounded-tl-md border border-(--border-subtle) bg-(--surface-overlay) text-(--text-primary)"
                      )}
                    >
                      <div className="font-sans whitespace-pre-wrap">{msg.content}</div>
                    </div>

                    {matchedTools.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {matchedTools.map(t => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={t.id} 
                            className="w-40 rounded-3xl overflow-hidden shadow-lg border border-(--border-subtle) hover:border-blue-500/50 transition-colors"
                          >
                            <ToolCard
                              title={t.name}
                              route={`/${t.route}`}
                              icon={t.thumbnail}
                              toolId={t.id}
                              metadata={t.tags}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {streamBuffer && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex w-full justify-start"
              >
                <div className="flex flex-col gap-2 max-w-[90%] items-start">
                  <div className="rounded-[22px] rounded-tl-md border border-(--border-subtle) bg-(--surface-overlay) px-5 py-3.5 text-[15px] leading-relaxed shadow-sm">
                    <div className="font-sans whitespace-pre-wrap">{streamBuffer}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        
        {(isGenerating || (isLoading && !isLoaded)) && !streamBuffer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
             <div className="rounded-[22px] rounded-tl-md border border-(--border-subtle) bg-(--surface-overlay) px-5 py-3.5 shadow-sm">
                <div className="flex gap-3 items-center">
                   <div className="flex gap-1.5 items-center h-5">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                   </div>
                   {isLoading && !isLoaded && (
                     <span className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">
                        Warming engine ({progressPercentage}%)
                     </span>
                   )}
                </div>
             </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="pb-4" />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-(--background)/50 backdrop-blur-xl border-t border-(--border-subtle)/50">
        <div className="relative mx-auto max-w-full">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoaded ? "Type a message..." : "Warming up..."}
            className="w-full resize-none rounded-3xl border border-(--border-subtle) bg-(--surface-overlay) py-4 pl-5 pr-14 text-[15px] text-(--text-primary) placeholder:text-(--text-muted) outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm max-h-[200px] disabled:opacity-50"
            rows={1}
            style={{ minHeight: "56px" }}
            disabled={isGenerating || !isLoaded}
          />
          <div className="absolute bottom-2 right-2">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating || !isLoaded}
              className={cn(
                "h-10 w-10 rounded-full p-0 transition-all shadow-md",
                input.trim() && !isGenerating && isLoaded
                  ? "bg-blue-600 text-white hover:bg-blue-500 scale-100" 
                  : "bg-(--surface-hover) text-(--text-muted) scale-90 opacity-50"
              )}
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-center mt-3 text-(--text-faint) uppercase tracking-widest font-bold">
           Local Engine: Phi-3 Mini (WebGPU)
        </p>
      </div>
    </div>
  );
}
