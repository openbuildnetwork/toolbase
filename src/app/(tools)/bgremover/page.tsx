"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * BgRemoverPage
 * 
 * We use dynamic import with ssr: false to prevent the heavy '@imgly/background-removal' 
 * library from being bundled into the server-side handler. This is critical for 
 * maintaining a small Cloudflare Worker bundle size.
 */
const BgRemoverView = dynamic(() => import("./components/BgRemoverView"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-text-muted font-medium animate-pulse">Loading AI Engine...</p>
        </div>
    )
});

export default function BgRemoverPage() {
    return <BgRemoverView />;
}
