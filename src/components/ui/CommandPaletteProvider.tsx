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

export function CommandPaletteProvider() {
    const palette = useCommandPalette();

    return (
        <CommandPalette isOpen={palette.isOpen} onClose={palette.close} />
    );
}
