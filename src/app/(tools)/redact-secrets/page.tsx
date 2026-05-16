"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
const RedactSecretsView = dynamic(() => import("./components/RedactSecretsView"), { ssr: false, loading: () => <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4"><Loader2 className="w-12 h-12 text-primary animate-spin" /><p className="text-text-muted font-medium animate-pulse">Loading Redact Secrets...</p></div> });
export default function RedactSecretsPage() { return <RedactSecretsView />; }
