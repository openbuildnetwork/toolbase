import Link from "next/link";
import { Home } from "lucide-react";

export function ToolHomeButton() {
  return (
    <Link
      href="/"
      aria-label="Go to home page"
      className="fixed right-4 top-20 z-50 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-gray-900"
    >
      <Home className="h-3.5 w-3.5" />
      <span>Home</span>
    </Link>
  );
}
