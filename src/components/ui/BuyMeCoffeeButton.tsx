"use client";

import { Coffee } from "lucide-react";

type BuyMeCoffeeButtonProps = {
  mode?: "floating" | "inline";
  className?: string;
};

export function BuyMeCoffeeButton({ mode = "inline", className = "" }: BuyMeCoffeeButtonProps) {
  const baseClassName =
    mode === "floating"
      ? "fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[120] inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl"
      : "inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl";

  return (
    <a
      href="https://buymeacoffee.com/openbuildnetwork"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Buy Me a Coffee"
      className={`${baseClassName} group border border-(--border-medium) bg-(--surface-overlay) backdrop-blur-md shadow-sm shadow-black/[0.05] dark:shadow-black/20 transition-all duration-200 ease-out hover:shadow-md hover:shadow-black/[0.08] dark:hover:shadow-black/30 hover:border-(--border-subtle) hover:bg-(--surface-hover) active:scale-95 active:shadow-none ${className}`}
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0
                   bg-(--surface-active) border border-(--border-subtle)
                   text-(--text-muted) transition-all duration-200
                   group-hover:bg-amber-500/10 group-hover:border-amber-500/20 group-hover:text-amber-500"
      >
        <Coffee className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
      </span>

      <span className="flex flex-col gap-px leading-none">
        <span className="text-[8.5px] font-black uppercase tracking-[0.16em] text-(--text-muted) group-hover:text-amber-500 transition-colors duration-200">
          support
        </span>
        <span className="text-[12px] font-semibold tracking-tight text-(--text-primary)">
          Buy Me a Coffee
        </span>
      </span>
    </a>
  );
}
