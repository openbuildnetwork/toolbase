"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * OpenDrawPage
 * 
 * Dynamically imports OpenDraw components to keep tldraw and other heavy 
 * canvas libraries out of the server bundle.
 */
const OpenDrawView = dynamic(() => import("./components/OpenDrawView"), {
    ssr: false,
    loading: () => (
        <div className="w-screen h-screen bg-surface flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-text-muted font-medium animate-pulse">Initializing Canvas...</p>
        </div>
    )
});

export default function OpenDrawPage() {
    return (
        <div className="w-screen h-screen overflow-hidden">
            <OpenDrawView />
        </div>
    );
}
