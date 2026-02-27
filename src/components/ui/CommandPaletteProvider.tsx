'use client';

/**
 * CommandPaletteProvider
 *
 * Mounts the global Cmd+K keyboard shortcut and portal in one place.
 * Renders NO visible UI — the palette only appears when triggered by keyboard.
 */

import React from 'react';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { PerformanceToast } from '@/components/ui/PerformanceToast';
import { registerAllTIPTools } from '@/tip-tools';

// Register all TIP tools on the client so the Registry isn't empty.
registerAllTIPTools();

export function CommandPaletteProvider() {
    const palette = useCommandPalette();

    return (
        <>
            <CommandPalette isOpen={palette.isOpen} onClose={palette.close} />
            <PerformanceToast />
        </>
    );
}
