"use client";
import Image from 'next/image';

import React, { useState, useMemo } from 'react';
import ToolCard from './ToolCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolCardProps } from '@/types/tool-search';

interface ToolGridProps {
    searchQuery: string;
    tools: ToolCardProps[];
}

const itemVariants: any = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: i * 0.04
        }
    })
};


import { searchTools } from '@/lib/searchTools';

const ToolGrid: React.FC<ToolGridProps> = ({ searchQuery, tools }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const filteredTools = useMemo(() => {
        return searchTools(tools, searchQuery);
    }, [searchQuery, tools]);

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
                                route={tool.route}
                                icon={tool.icon}
                                metadata={tool.metadata} // Pass metadata for future use (e.g. highlighting)
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
                                <Image width={18} height={18} className='w-[18px] h-[18px] transform rotate-90' src="/assets/icons/forward.svg" alt="" />
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span>Show less</span>
                                <Image width={18} height={18} className='w-[18px] h-[18px] transform rotate-270' src="/assets/icons/forward.svg" alt="" />
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
