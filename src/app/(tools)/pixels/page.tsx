"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * PixelsPage
 * 
 * Dynamically imports the Pixels editor to keep image processing 
 * libraries out of the server bundle.
 */
const PixelsView = dynamic(() => import("./components/PixelsView"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-text-muted font-medium animate-pulse">Initializing Pixels...</p>
        </div>
    )
});

export default function PixelsPage() {
    return <PixelsView />;
}
