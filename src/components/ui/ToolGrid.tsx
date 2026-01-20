"use client";

import React, { useState, useMemo } from 'react';
import ToolCard from './ToolCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolCardProps } from '@/interface/toolSearch.interface';

const tools: ToolCardProps[] = [
    { title: "PDF Pro", toolFolderName: "pdf-pro", icon: "picture_as_pdf", gradientFrom: "#ff5e57", gradientTo: "#ff2d55" },
    { title: "Optimizely", toolFolderName: "optimizely", icon: "compress", gradientFrom: "#34c759", gradientTo: "#24b04b" },
    { title: "JSON Editor", toolFolderName: "json-editor", icon: "code", gradientFrom: "#ffcc00", gradientTo: "#ff9500" },
    { title: "Data Flow", toolFolderName: "data-flow", icon: "data_table", gradientFrom: "#5856d6", gradientTo: "#af52de" },
    { title: "QuickScan", toolFolderName: "quickscan", icon: "qr_code_2", gradientFrom: "#4a4a4e", gradientTo: "#1c1c1e" },
    { title: "WritePad", toolFolderName: "writepad", icon: "edit_note", gradientFrom: "#00c7be", gradientTo: "#30b0c7" },
    { title: "Codec", toolFolderName: "codec", icon: "enhanced_encryption", gradientFrom: "#ff3b30", gradientTo: "#ff9500" },
    { title: "Units", toolFolderName: "units", icon: "straighten", gradientFrom: "#007aff", gradientTo: "#0040dd" },
    { title: "Colors", toolFolderName: "colors", icon: "palette", gradientFrom: "#ff2d55", gradientTo: "#ff375f" },
    { title: "Regex", toolFolderName: "regex", icon: "regular_expression", gradientFrom: "#5e5ce6", gradientTo: "#5856d6" },
    { title: "SQL Lab", toolFolderName: "sql-lab", icon: "database", gradientFrom: "#147efb", gradientTo: "#5fc9f8" },
    { title: "Security", toolFolderName: "security", icon: "fingerprint", gradientFrom: "#ff9f0a", gradientTo: "#ff3b30" },
    { title: "Redact Secrets", toolFolderName: "redact-secrets", icon: "fingerprint", gradientFrom: "#ff9f0a", gradientTo: "#ff3b30" },
    { title: "Terminal", toolFolderName: "terminal", icon: "terminal", gradientFrom: "#64d2ff", gradientTo: "#007aff" },
    { title: "Magic Refactor", toolFolderName: "magic-refactor", icon: "auto_awesome", gradientFrom: "#bf5af2", gradientTo: "#af52de" },
    { title: "Key Store", toolFolderName: "key-store", icon: "key", gradientFrom: "#ffd60a", gradientTo: "#ff9f0a" },
    { title: "Insights", toolFolderName: "insights", icon: "analytics", gradientFrom: "#30d158", gradientTo: "#24b04b" },
    { title: "DevTimer", toolFolderName: "devtimer", icon: "timer", gradientFrom: "#ff453a", gradientTo: "#ff3b30" },
    { title: "Add-ons", toolFolderName: "addons", icon: "extension", gradientFrom: "#8e8e93", gradientTo: "#636366" },
];

interface ToolGridProps {
    searchQuery: string;
}

const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.23, 1, 0.32, 1],
            delay: i * 0.05
        }
    })
};

const ToolGrid: React.FC<ToolGridProps> = ({ searchQuery }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const filteredTools = useMemo(() => {
        return tools.filter(tool =>
            tool.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    return (
        <div className="flex flex-col items-center mt-12 w-full">
            <div
                className="grid w-full sm:px-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-12 gap-y-16 pb-8 overflow-hidden ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{ maxHeight: isExpanded ? '2000px' : '380px' }}
            >
                <AnimatePresence mode="popLayout">
                    {filteredTools.map((tool, index) => (
                        <motion.div
                            key={tool.title}
                            variants={itemVariants}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            layout
                        >
                            <ToolCard
                                title={tool.title}
                                toolFolderName={tool.toolFolderName}
                                icon={tool.icon}
                                gradientFrom={tool.gradientFrom}
                                gradientTo={tool.gradientTo}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredTools.length > 6 && (
                <div className="expand-button-wrapper flex justify-center mt-4 animate-fade-up-delay-3">
                    <button
                        className="macos-button cursor-pointer select-none"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {!isExpanded ? (
                            <span className="flex items-center gap-2">
                                <span>Show all tools</span>
                                <img className='w-[18px] h-[18px] transform rotate-90' src="/assets/icons/forward.svg" alt="" />
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span>Show less</span>
                                <img className='w-[18px] h-[18px] transform rotate-270' src="/assets/icons/forward.svg" alt="" />
                            </span>
                        )}
                    </button>
                </div>
            )}

            {filteredTools.length === 0 && (
                <p className="text-[#3a3a3c] mt-8">No tools found for &quot;{searchQuery}&quot;</p>
            )}
        </div>
    );
};

export default ToolGrid;
