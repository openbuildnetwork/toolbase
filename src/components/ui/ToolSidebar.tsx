'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Menu,
    Sidebar as SidebarIcon,
    LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolSidebarItem {
    id: string;
    label: string;
    icon: LucideIcon;
    disabled?: boolean;
    group?: string;
    badge?: string;
}

interface ToolSidebarProps {
    title: string;
    items: ToolSidebarItem[];
    activeId: string;
    onSelect: (id: string) => void;
    className?: string;

    // Controlled props
    isOpen: boolean;
    onToggle: (state: boolean) => void;

    version?: string;
}

export const ToolSidebar = ({
    title,
    items,
    activeId,
    onSelect,
    className,
    isOpen,
    onToggle,
    version = 'v1.0.0'
}: ToolSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onToggle(false)}
                        className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: isOpen ? 280 : 0,
                    x: isOpen ? 0 : 0 // On mobile we might want slide, but let's stick to width for now or conditional logic
                }}
                // Mobile override: Fixed position
                className={cn(
                    "fixed md:relative top-0 bottom-0 left-0 bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col z-40 h-full overflow-hidden shadow-2xl md:shadow-none transition-all duration-300 ease-in-out",
                    !isOpen && "border-none w-0", // w-0 for non-motion fallbacks
                    // Mobile specific positioning
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    "md:transform-none", // Reset transform on desktop where we use width animation
                    className
                )}
                style={{
                    // We use Framer Motion for width on desktop, but for mobile we want fixed sidebar.
                    // Actually, combining width animation and mobile fixed sidebar is tricky.
                    // Let's use specific variants if possible, or simple conditional formatting.
                }}
            >
                {/* 
                   Correction: Framer Motion animates inline styles. 
                   For mobile, we want it fixed full height. 
                   For desktop, relative full height.
                 */}

                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 min-w-[280px]">
                    <span className="font-semibold text-gray-700 text-sm tracking-tight flex items-center gap-2">
                        {title.toUpperCase()}
                    </span>
                    <button onClick={() => onToggle(false)} className="p-1 hover:bg-gray-200 rounded-md">
                        <SidebarIcon className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 shrink-0 min-w-[280px]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find action..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto py-2 scrollbar-thin min-w-[280px]">
                    <div className="px-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Quick Actions
                    </div>
                    {filteredItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            isActive={activeId === item.id}
                            onClick={() => {
                                onSelect(item.id);
                                if (window.innerWidth < 768) onToggle(false);
                            }}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 shrink-0 min-w-[280px]">
                    <div className="text-xs text-center text-gray-400">
                        {title} {version}
                    </div>
                </div>
            </motion.aside>

            {/* Floating Toggle Button - only visible when closed */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute top-4 left-4 z-30"
                    >
                        <button
                            onClick={() => onToggle(true)}
                            className="rounded-full bg-white border border-gray-200 shadow-md p-2 hover:bg-gray-50 text-gray-500 transition-transform active:scale-95"
                        >
                            <SidebarIcon className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

const SidebarItem = ({
    item,
    isActive,
    onClick
}: {
    item: ToolSidebarItem;
    isActive: boolean;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        disabled={item.disabled}
        className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border-l-2",
            isActive
                ? "bg-primary/10 border-primary text-primary"
                : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-600"
        )}
    >
        <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-500")} />
        <span>{item.label}</span>
        {item.badge && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full uppercase tracking-wider">
                {item.badge}
            </span>
        )}
    </button>
);
