import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ReturnToToolsButton() {
  return (
    <Link
      href="/"
      aria-label="Return to tools"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 transition-all duration-200 active:scale-95 group shadow-xs"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span className="text-xs font-bold uppercase tracking-wider">Return to tools</span>
    </Link>
  );
}
