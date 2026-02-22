'use client';

import Link from 'next/link';
import React from 'react';
import { Search, Command } from 'lucide-react';

interface HeaderProps {
    onOpenPalette?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenPalette }) => {
    return (
        <header className="sticky top-0 z-100 w-full bg-white/70 backdrop-blur-2xl border-b border-black/5 px-6 md:px-20 lg:px-40 py-4">
            <div className="max-w-[1200px] p-2 mx-auto flex items-center justify-between gap-4">
                <Link href="/">
                    <img className="h-6" src="/assets/images/logo-dark.png" alt="Toolbase logo" />
                </Link>

                <div className="flex items-center gap-3">
                    {/* Cmd+K hint button */}
                    {onOpenPalette && (
                        <button
                            onClick={onOpenPalette}
                            aria-label="Open command palette"
                            title="Open command palette (Cmd+K)"
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/4 hover:bg-black/8 border border-black/6 transition-all duration-150 cursor-pointer"
                        >
                            <Search size={13} className="text-black/40" />
                            <span className="text-[12px] text-black/35 font-medium">Search tools…</span>
                            <span className="flex items-center gap-0.5 ml-1">
                                <kbd className="flex items-center justify-center w-5 h-5 rounded bg-black/5 text-[10px] font-medium text-black/30">
                                    <Command size={9} />
                                </kbd>
                                <kbd className="flex items-center justify-center w-5 h-5 rounded bg-black/5 text-[10px] font-medium text-black/30">
                                    K
                                </kbd>
                            </span>
                        </button>
                    )}

                    {/* Mobile: icon-only search trigger */}
                    {onOpenPalette && (
                        <button
                            onClick={onOpenPalette}
                            aria-label="Search tools"
                            className="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl bg-black/4 hover:bg-black/8 transition-all duration-150"
                        >
                            <Search size={16} className="text-black/50" />
                        </button>
                    )}

                    <img className="w-6 h-6 cursor-pointer" src="/assets/icons/settings.svg" alt="Settings" />
                </div>
            </div>
        </header>
    );
};

export default Header;
