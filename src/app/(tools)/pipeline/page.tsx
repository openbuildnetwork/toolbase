'use client';

import React from 'react';
import { FlowCanvas } from '@/components/features/pipeline/FlowCanvas';

/**
 * Pipeline page — full-screen canvas with floating UI panels.
 * NodePalette, Toolbar, and InspectorPanel are all positioned absolutely
 * inside FlowCanvas, so no outer chrome is needed.
 */
export default function PipelinePage() {
    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0b0b0d' }}>
            <FlowCanvas />
        </div>
    );
}
