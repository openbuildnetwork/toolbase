import React, { useState } from "react";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RedactResponse } from "@/types/redact";

interface RedactOutputProps {
    response: RedactResponse | null;
}

export const RedactOutput: React.FC<RedactOutputProps> = ({ response }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        if (!response?.maskedContent) return;
        navigator.clipboard.writeText(response.maskedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence mode="wait">
            {response && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                >
                    <Card className="overflow-hidden border-none shadow-2xl bg-white/90 backdrop-blur-3xl ring-1 ring-black/5 ring-inset">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <ShieldCheck className="w-5 h-5" />
                                <span className="font-bold text-sm">Protected Output</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 group">
                                {copied ? (
                                    <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                )}
                                <span className="ml-2 group-hover:text-gray-900 transition-colors uppercase text-[10px] font-bold tracking-wider">
                                    {copied ? "Copied!" : "Copy Output"}
                                </span>
                            </Button>
                        </div>
                        <div className="p-6 bg-gray-900/2 min-h-[300px]">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed selection:bg-primary/20">
                                {response.maskedContent}
                            </pre>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
