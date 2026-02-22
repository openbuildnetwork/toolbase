"use client";

import { ToolCardProps } from '@/types/tool-search';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { Pin } from 'lucide-react';
import { usePinnedTools } from '@/hooks/usePinnedTools';
import { cn } from '@/lib/utils';

const ToolCard: React.FC<ToolCardProps> = ({ title, route, icon }) => {
    const { isPinned, togglePin } = usePinnedTools();
    const pinned = isPinned(route || '');

    const handlePinClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(route || '');
    };

    return (
        <div className="relative group p-4 rounded-3xl transition-all duration-300 ">
            {/* Pin Button */}
            <button
                onClick={handlePinClick}
                className={cn(
                    "absolute top-2 right-2 z-20 p-2 rounded-full transition-all duration-300",
                    "opacity-0 group-hover:opacity-100",
                    pinned ? "opacity-100 bg-black/10 text-black" : "bg-white/50 text-black/40 hover:bg-black/10 hover:text-black",
                    "backdrop-blur-sm shadow-sm"
                )}
                title={pinned ? "Unpin tool" : "Pin to dock"}
            >
                <Pin
                    size={14}
                    className={cn(
                        "transition-transform duration-300",
                        pinned ? "fill-current rotate-0" : "-rotate-45"
                    )}
                />
            </button>

            <Link
                href={route}
                className="flex flex-col items-center gap-4 cursor-pointer haptic-click"
            >
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                    <Image
                        src={icon}
                        alt={title}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-[28px] p-2 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)] group-hover:scale-110 transition-transform duration-500"
                    />
                </div>
                <p className="text-[13px] font-semibold text-center text-[#3a3a3c] group-hover:text-black transition-colors tracking-tight">
                    {title}
                </p>
            </Link>
        </div>
    );
};

export default ToolCard;

