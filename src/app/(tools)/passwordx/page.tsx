"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
const PasswordxView = dynamic(() => import("./components/PasswordxView"), { ssr: false, loading: () => <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div> });
export default function PasswordxPage() { return <PasswordxView />; }
