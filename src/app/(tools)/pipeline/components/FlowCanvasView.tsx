"use client";

import React from 'react';
import { FlowCanvas } from '@/app/(tools)/pipeline/components/FlowCanvas';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";

export default function FlowCanvasView() {
    return (
        <>
            <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100 }}>
                <ReturnToToolsButton />
            </div>
            <FlowCanvas />
        </>
    );
}
