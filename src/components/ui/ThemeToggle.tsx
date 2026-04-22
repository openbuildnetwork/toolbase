'use client';

/**
 * ThemeToggle — compact dark/light/system theme switcher.
 * Uses next-themes useTheme() to read/write the current theme.
 * Renders a segmented pill with three icon-only buttons.
 */

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

const OPTIONS: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch — only render after mount
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        // Render a skeleton pill with the same dimensions to prevent layout shift
        return (
            <div
                className="flex items-center rounded-full p-0.5"
                style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border-subtle)',
                    width: 92,
                    height: 32,
                }}
            />
        );
    }

    return (
        <div
            className="flex items-center rounded-full p-0.5 transition-colors duration-200"
            style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
            }}
        >
            {OPTIONS.map(({ value, icon: Icon, label }) => {
                const active = theme === value;
                return (
                    <button
                        key={value}
                        onClick={() => setTheme(value)}
                        aria-label={`Switch to ${label} theme`}
                        title={label}
                        className={cn(
                            'flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 cursor-pointer',
                            active
                                ? 'shadow-sm'
                                : 'hover:opacity-80'
                        )}
                        style={{
                            background: active ? 'var(--surface-elevated)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                            boxShadow: active ? '0 1px 3px var(--shadow-color)' : 'none',
                        }}
                    >
                        <Icon size={14} strokeWidth={2} />
                    </button>
                );
            })}
        </div>
    );
}
