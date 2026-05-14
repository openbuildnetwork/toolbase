'use client';

/**
 * CommandPaletteProvider
 *
 * Mounts the global Cmd+K keyboard shortcut and portal in one place.
 * Renders NO visible UI — the palette only appears when triggered by keyboard.
 */

import dynamic from 'next/dynamic';
import { useCommandPalette } from '@/shared/hooks/useCommandPalette';
import { PerformanceToast } from '@/shared/ui/PerformanceToast';

const CommandPalette = dynamic(() => import('@/shared/ui/CommandPalette').then(mod => mod.CommandPalette), {
    ssr: false,
});

export function CommandPaletteProvider() {
    const palette = useCommandPalette();

    return (
        <>
            <CommandPalette isOpen={palette.isOpen} onClose={palette.close} />
            <PerformanceToast />
        </>
    );
}
