'use client';

import Link from 'next/link';
import React from 'react';
import { Search, Command } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
    onOpenPalette?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenPalette }) => {
    return (
        <header
            className="sticky top-0 z-100 w-full backdrop-blur-2xl px-6 md:px-20 lg:px-40 py-4 transition-colors duration-200"
            style={{
                background: 'var(--surface-overlay)',
                borderBottom: '1px solid var(--border-subtle)',
            }}
        >
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
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer"
                            style={{
                                background: 'var(--surface-hover)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <Search size={13} style={{ color: 'var(--text-muted)' }} />
                            <span className="text-[12px] font-medium" style={{ color: 'var(--text-faint)' }}>
                                Search tools…
                            </span>
                            <span className="flex items-center gap-0.5 ml-1">
                                <kbd
                                    className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium"
                                    style={{ background: 'var(--kbd-bg)', color: 'var(--text-faint)' }}
                                >
                                    <Command size={9} />
                                </kbd>
                                <kbd
                                    className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium"
                                    style={{ background: 'var(--kbd-bg)', color: 'var(--text-faint)' }}
                                >
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
                            className="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
                            style={{
                                background: 'var(--surface-hover)',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <Search size={16} />
                        </button>
                    )}

                    {/* Theme toggle */}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
};

export default Header;
