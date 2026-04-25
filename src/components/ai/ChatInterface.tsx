import React, { useRef, useEffect, useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import { chatOllama } from "@/lib/ollama";
import { TOOLS } from "@/config/tools.registry";
import ToolCard from "@/components/ui/ToolCard";
import { Button } from "@/components/ui/Button";
import { Send, Plus, Trash2, MessageSquare, List, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  modelName?: string;
  onClose?: () => void;
  onSetupRequired?: () => void;
}

export function ChatInterface({ modelName = "phi3:mini", onClose, onSetupRequired }: ChatInterfaceProps) {
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

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-focus input when chat mounts, history is closed, or generation finishes
  useEffect(() => {
    if (!showHistory && !isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showHistory, isGenerating]);

  useEffect(() => {
    if (!showHistory) {
      scrollToBottom();
    }
  }, [activeConversation?.messages, showHistory]);

  // Ensure an active conversation exists
  useEffect(() => {
    if (conversations.length === 0 && !activeId && !showHistory) {
      createNewConversation();
    }
  }, [conversations.length, activeId, createNewConversation, showHistory]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    if (!activeId) {
      createNewConversation();
    }

    const userMsg = input.trim();
    setInput("");
    setIsGenerating(true);

    addMessageToActive({ role: "user", content: userMsg });

    const history = activeConversation ? activeConversation.messages : [];

    // Construct System Prompt dynamically
    const toolDescriptions = TOOLS.map(t => `- **${t.name}**: ${t.description}`).join('\n');
    const systemPromptMessage = {
      role: "system" as const,
      content: `You are the AI assistant for OBN Toolbase.
Answer concisely, directly, and naturally. Do not proactively state your rules or limitations unless the user asks an unrelated question.
If the user asks questions completely unrelated to the app, simply reply: "I can't answer those kind of queries." Do not elaborate.
Do NOT write markdown links, URLs, or hyperlinks. Simply mention the tool's name in plain text. The UI will automatically generate a clickable card for the user.
Available tools:

${toolDescriptions}`
    };

    const payload = [systemPromptMessage, ...history, { role: "user" as const, content: userMsg }];

    try {
      addMessageToActive({ role: "assistant", content: "" }); // Initialize empty message
      await chatOllama(modelName, payload, (chunk) => {
        updateAssistantMessage(chunk);
      });
      commitActiveConversation();
    } catch (err) {
      console.error(err);
      updateAssistantMessage("It looks like the Ollama application is not running in the background, or the model is currently unavailable. Please open the Ollama app on your computer and try sending your message again.");
      commitActiveConversation();
    } finally {
      setIsGenerating(false);
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
      <div className="flex h-full w-full flex-col bg-(--surface-overlay)">
        <div className="flex items-center justify-between border-b border-(--border-subtle) p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="px-2">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="font-medium text-sm text-(--text-primary)">Past Chats</span>
          </div>
          <Button onClick={() => { createNewConversation(); setShowHistory(false); }} size="sm" variant="secondary" className="gap-2 bg-(--surface-secondary) hover:bg-(--surface-hover) text-(--text-primary)">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors",
                activeId === conv.id ? "bg-(--surface-secondary) font-medium text-(--text-primary)" : "text-(--text-secondary) hover:bg-(--surface-hover)"
              )}
              onClick={() => {
                setActiveId(conv.id);
                setShowHistory(false);
              }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="h-4 w-4 shrink-0 text-(--text-muted)" />
                <span className="truncate">{conv.title}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 text-(--text-muted) opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-sm text-(--text-muted)">
              No recent chats
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white/50 backdrop-blur-xl relative">
      {/* Top Bar for active chat actions */}
      <div className="absolute top-0 left-0 z-10 p-2 flex gap-2">
        <Button variant="outline" size="sm" className="bg-(--surface-overlay)/90 backdrop-blur shadow-sm h-8 px-3 text-xs border-(--border-subtle) text-(--text-primary)" onClick={() => setShowHistory(true)}>
          <List className="h-3 w-3 mr-1.5" /> History
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 pt-12 md:p-6 bg-white/30">
        {!activeConversation?.messages.length ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center mt-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 shadow-inner ring-1 ring-black/5 dark:ring-white/5">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-(--text-primary)">How can I help you?</h2>
          </div>
        ) : (
          activeConversation.messages.map((msg, idx) => {
            let matchedTools: typeof TOOLS = [];
            if (msg.role === "assistant") {
              matchedTools = TOOLS.filter(t =>
                msg.content.toLowerCase().includes(t.name.toLowerCase()) ||
                msg.content.toLowerCase().includes(`/${t.route.toLowerCase()}`)
              );
            }

            return (
              <div key={idx} className={cn("flex w-full mb-6", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("flex flex-col gap-2 max-w-[85%]", msg.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-[20px] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm w-fit",
                      msg.role === "user"
                        ? "rounded-br-sm bg-(--primary) text-white"
                        : "rounded-bl-sm border border-(--border-subtle) bg-(--surface-secondary) text-(--text-primary)"
                    )}
                  >
                    <div className="font-sans whitespace-pre-wrap">{msg.content}</div>
                  </div>

                  {/* Setup Redirect Button */}
                  {msg.role === "assistant" && msg.content.includes("Unable to connect to Ollama.") && onSetupRequired && (
                    <div className="mt-1">
                      <Button variant="secondary" size="sm" onClick={onSetupRequired} className="text-xs h-7 px-3">
                        Open Setup Guide
                      </Button>
                    </div>
                  )}

                  {/* Inline Tool Cards */}
                  {matchedTools.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-1">
                      {matchedTools.map(t => (
                        <div key={t.id} className="w-36 rounded-3xl bg-(--surface-overlay) shadow-sm border border-(--border-subtle)">
                          <ToolCard
                            title={t.name}
                            route={`/${t.route}`}
                            icon={t.thumbnail}
                            toolId={t.id}
                            metadata={t.tags}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="pb-2" />
      </div>

      {/* Input Area */}
      <div className="border-t border-(--border-subtle) bg-(--surface-overlay)/80 p-4 backdrop-blur-md pb-6 shrink-0">
        <div className="relative mx-auto rounded-3xl border border-(--border-subtle) bg-(--surface-secondary) shadow-sm block max-h-[150px]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Ollama locally..."
            className="w-full resize-none rounded-3xl bg-transparent py-3.5 pl-4 pr-12 text-[15px] text-(--text-primary) placeholder:text-(--text-muted) outline-none disabled:opacity-50 block no-scrollbar"
            rows={1}
            style={{ minHeight: "52px" }}
            disabled={isGenerating}
          />
          <div className="absolute bottom-1.5 right-1.5 flex items-center">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className={cn(
                "h-10 w-10 rounded-full p-0 transition-colors",
                input.trim() && !isGenerating ? "bg-(--primary) text-white hover:bg-(--primary-hover) shadow-md" : "bg-(--surface-secondary) text-(--text-muted)"
              )}
              variant="ghost"
            >
              <Send className="h-4 w-4 translate-x-px translate-y-px" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
