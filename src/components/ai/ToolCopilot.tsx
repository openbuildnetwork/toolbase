'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useAIChat } from '@/app/(tools)/ai-chat/hooks/useAIChat';
import { Button } from '@/components/ui/Button';
import { Markdown } from '@/components/ui/Markdown';
import { 
  Sparkles, 
  Wrench, 
  BookOpen, 
  Lightbulb, 
  X, 
  Loader2, 
  CheckCircle2, 
  Copy 
} from 'lucide-react';
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';

export interface ToolCopilotProps {
  /** The current text/code that the copilot should analyze */
  contextData: string;
  /** What type of data this is (e.g., 'JSON', 'Base64', 'Code', 'Text') */
  contextType?: string;
  /** Callback if the tool supports auto-applying fixes */
  onApplyFix?: (fixedText: string) => void;
  className?: string;
}

export function ToolCopilot({ contextData, contextType = 'Text', onApplyFix, className = '' }: ToolCopilotProps) {
  const { generateResponse, isGenerating, isLoaded, isLoading, progressPercentage, stopGeneration, loadModel } = useAIChat();
  
  const [activeIntent, setActiveIntent] = useState<'fix' | 'explain' | 'suggest' | null>(null);
  const [response, setResponse] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleIntent = async (intent: 'fix' | 'explain' | 'suggest') => {
    if (!isLoaded || isGenerating) return;
    
    setActiveIntent(intent);
    setIsOpen(true);
    setResponse("");

    let dataPreview = contextData.trim();
    const MAX_LENGTH = 4000;
    if (dataPreview.length > MAX_LENGTH) {
      const half = Math.floor(MAX_LENGTH / 2);
      dataPreview = dataPreview.substring(0, half) + 
        `\n\n... [${dataPreview.length - MAX_LENGTH} characters truncated for context limits] ...\n\n` + 
        dataPreview.substring(dataPreview.length - half);
    }
    if (!dataPreview) {
      setResponse("Please provide some input first before asking for help.");
      setActiveIntent(null);
      return;
    }

    let prompt = "";
    if (intent === 'fix') {
      prompt = `Review the following ${contextType} for errors, bugs, or invalid syntax. If it's invalid, provide the corrected version. ONLY output the corrected code inside a markdown block if a fix is needed. If no fix is needed, explain why it's correct.\n\nData:\n${dataPreview}`;
    } else if (intent === 'explain') {
      prompt = `Briefly explain what the following ${contextType} is doing or what it represents. Be concise and professional.\n\nData:\n${dataPreview}`;
    } else if (intent === 'suggest') {
      prompt = `Given the following ${contextType}, suggest 1-2 next steps or improvements the user could make. Be very concise.\n\nData:\n${dataPreview}`;
    }

    try {
      const messages = [
        { role: "system" as const, content: "You are an expert Copilot assisting a user inside a specialized tool. Keep answers concise, accurate, and directly address the user's data." },
        { role: "user" as const, content: prompt }
      ];

      let fullText = "";
      await generateResponse(messages, (token) => {
        fullText += token;
        setResponse(fullText);
      });
    } catch (e) {
      console.error(e);
      setResponse((prev) => prev ? prev + "\n\n[Error: Generation interrupted]" : "An error occurred while generating the response.");
    } finally {
      setActiveIntent(null);
    }
  };

  const closePanel = () => {
    if (isGenerating) stopGeneration();
    setIsOpen(false);
    setTimeout(() => setResponse(""), 200);
  };

  if (!isLoaded) {
    return (
      <div className={`relative flex items-center ${className}`}>
        <button 
          onClick={() => !isLoading && loadModel(undefined, false, true)}
          disabled={isLoading}
          className="flex items-center p-1.5 px-2 bg-(--surface-secondary)/40 hover:bg-(--surface-secondary)/80 transition-colors backdrop-blur-md rounded-[14px] border border-(--border-subtle) shadow-sm cursor-pointer disabled:cursor-wait group/wake"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 ml-1 mr-2 text-blue-500 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-secondary) pr-2">
                Warming Up AI ({Math.round(progressPercentage)}%)
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 ml-1 mr-2 text-blue-500 opacity-60 group-hover/wake:opacity-100 transition-opacity" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-(--text-tertiary) group-hover/wake:text-(--text-secondary) pr-2 transition-colors">
                Wake Up Copilot
              </span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Sleek Inline Action Buttons */}
      <div className="flex items-center p-1 bg-(--surface-secondary)/50 hover:bg-(--surface-secondary)/80 transition-all duration-300 backdrop-blur-md rounded-[14px] border border-(--border-subtle) shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.15)] group/copilot">
        <Sparkles className="w-4 h-4 ml-2 mr-1 text-blue-500 group-hover/copilot:animate-pulse" />
        <div className="w-px h-4 bg-(--border-subtle) mx-2"></div>
        <div className="flex items-center gap-0.5">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleIntent('fix')}
            disabled={isGenerating}
            className="h-8 px-2.5 gap-1.5 text-[11px] font-bold uppercase tracking-wider text-(--text-tertiary) hover:text-amber-500 hover:bg-amber-500/10 transition-colors rounded-lg"
            title="Fix Syntax/Errors"
          >
            {activeIntent === 'fix' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
            Fix
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleIntent('explain')}
            disabled={isGenerating}
            className="h-8 px-2.5 gap-1.5 text-[11px] font-bold uppercase tracking-wider text-(--text-tertiary) hover:text-blue-500 hover:bg-blue-500/10 transition-colors rounded-lg"
            title="Explain Content"
          >
            {activeIntent === 'explain' ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
            Explain
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleIntent('suggest')}
            disabled={isGenerating}
            className="h-8 px-2.5 gap-1.5 text-[11px] font-bold uppercase tracking-wider text-(--text-tertiary) hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors rounded-lg"
            title="Suggest Next Steps"
          >
            {activeIntent === 'suggest' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lightbulb className="h-3 w-3" />}
            Suggest
          </Button>
        </div>
      </div>

      {/* Response Panel (Drops down from the top right of the editor header) */}
      <AnimatePresence>
        {isOpen && (
          <m.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-3 right-0 w-[420px] max-w-[90vw] bg-(--surface-overlay)/95 backdrop-blur-3xl border border-(--border-subtle) rounded-[20px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] overflow-hidden z-[100] flex flex-col ring-1 ring-white/10"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-(--border-subtle) bg-(--surface-secondary)/40">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-(--text-primary)">
                  {activeIntent === 'fix' ? 'Analyzing Code...' : activeIntent === 'explain' ? 'Explaining...' : activeIntent === 'suggest' ? 'Suggestions...' : 'Copilot Output'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onApplyFix && response && !isGenerating && response.includes('```') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const match = response.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
                      if (match && match[1]) {
                        onApplyFix(match[1].trim());
                      } else {
                        onApplyFix(response);
                      }
                    }}
                    className="h-7 px-3 text-[11px] uppercase tracking-wider gap-1.5 text-blue-500 hover:bg-blue-500/10 transition-colors rounded-lg font-bold border border-blue-500/20 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Apply Code
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={closePanel} className="h-7 w-7 rounded-lg text-(--text-muted) hover:text-red-500 hover:bg-red-500/10 transition-colors">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-5 max-h-[400px] overflow-y-auto custom-scrollbar text-[13px] leading-relaxed text-(--text-secondary) bg-(--background)/50">
              {response ? (
                <Markdown content={response} />
              ) : (
                <div className="flex items-center justify-center gap-3 text-(--text-muted) h-20">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="font-medium tracking-wide">Reading context...</span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
