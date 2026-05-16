"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * DataLensPage
 * 
 * Uses dynamic import with ssr: false to exclude heavy data processing logic
 * from the server-side bundle, ensuring compatibility with Cloudflare Worker limits.
 */
const DataLensView = dynamic(() => import("@/app/(tools)/data-lens/components/DataLensView"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-text-muted font-medium animate-pulse">Initializing DataLens...</p>
        </div>
    )
});

export default function DataLensPage() {
    return <DataLensView />;
}
