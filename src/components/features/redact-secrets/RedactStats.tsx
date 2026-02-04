import React from "react";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { RedactResponse } from "@/types/redact";

interface RedactStatsProps {
    response: RedactResponse | null;
}

export const RedactStats: React.FC<RedactStatsProps> = ({ response }) => {
    return (
        <AnimatePresence>
            {response && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                >
                    <Card className="border-none shadow-lg bg-linear-to-br from-primary/5 to-primary/10 ring-1 ring-primary/20">
                        <div className="px-6 py-4 border-b border-primary/10 bg-white/30">
                            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-tight">
                                <Activity className="w-4 h-4" />
                                Security Audit
                            </div>
                        </div>
                        <div className="p-8 text-center bg-white/40">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-5xl font-black text-primary mb-2"
                            >
                                {response.summary.totalMasked}
                            </motion.div>
                            <div className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] text-balance leading-tight">
                                Sensitive Entries Neutralized
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(response.summary.byType).map(([type, count]) => (
                            <motion.div
                                key={type}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white/60 backdrop-blur-md px-5 py-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm group hover:border-primary/20 transition-colors"
                            >
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">{type.replace(/_/g, ' ')}</span>
                                <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">{count}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
