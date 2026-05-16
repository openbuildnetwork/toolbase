"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * PipelinePage
 * 
 * Uses dynamic import with ssr: false to exclude React Flow and other 
 * heavy graph libraries from the server-side bundle.
 */
const FlowCanvasView = dynamic(() => import("./components/FlowCanvasView"), {
    ssr: false,
    loading: () => (
        <div className="w-screen h-screen bg-[#0b0b0d] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-white/40 font-medium animate-pulse">Initializing Flow Engine...</p>
        </div>
    )
});

export default function PipelinePage() {
    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0b0b0d', position: 'relative' }}>
            <FlowCanvasView />
        </div>
    );
}
