"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * MagicPdfPage
 * 
 * Uses dynamic import with ssr: false to exclude heavy PDF libraries 
 * (pdf-lib, pdfjs-dist) from the server-side bundle.
 */
const MagicPdfView = dynamic(() => import("./components/MagicPdfView"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-ping absolute inset-0" />
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <p className="text-text-muted font-medium animate-pulse">Initializing PDF Studio...</p>
        </div>
    )
});

export default function MagicPdfPage() {
    return <MagicPdfView />;
}
