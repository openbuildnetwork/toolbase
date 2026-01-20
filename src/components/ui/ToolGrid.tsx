"use client";

import React, { useState, useMemo } from 'react';
import ToolCard from './ToolCard';
import { motion, AnimatePresence } from 'framer-motion';

const tools = [
    { title: "PDF Pro", icon: "picture_as_pdf", from: "#ff5e57", to: "#ff2d55" },
    { title: "Optimizely", icon: "compress", from: "#34c759", to: "#24b04b" },
    { title: "JSON Editor", icon: "code", from: "#ffcc00", to: "#ff9500" },
    { title: "Data Flow", icon: "data_table", from: "#5856d6", to: "#af52de" },
    { title: "QuickScan", icon: "qr_code_2", from: "#4a4a4e", to: "#1c1c1e" },
    { title: "WritePad", icon: "edit_note", from: "#00c7be", to: "#30b0c7" },
    { title: "Codec", icon: "enhanced_encryption", from: "#ff3b30", to: "#ff9500" },
    { title: "Units", icon: "straighten", from: "#007aff", to: "#0040dd" },
    { title: "Colors", icon: "palette", from: "#ff2d55", to: "#ff375f" },
    { title: "Regex", icon: "regular_expression", from: "#5e5ce6", to: "#5856d6" },
    { title: "SQL Lab", icon: "database", from: "#147efb", to: "#5fc9f8" },
    { title: "Security", icon: "fingerprint", from: "#ff9f0a", to: "#ff3b30" },
    { title: "Terminal", icon: "terminal", from: "#64d2ff", to: "#007aff" },
    { title: "Magic Refactor", icon: "auto_awesome", from: "#bf5af2", to: "#af52de" },
    { title: "Key Store", icon: "key", from: "#ffd60a", to: "#ff9f0a" },
    { title: "Insights", icon: "analytics", from: "#30d158", to: "#24b04b" },
    { title: "DevTimer", icon: "timer", from: "#ff453a", to: "#ff3b30" },
    { title: "Add-ons", icon: "extension", from: "#8e8e93", to: "#636366" },
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
                                iconUrl={tool.icon}
                                gradientFrom={tool.from}
                                gradientTo={tool.to}
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
