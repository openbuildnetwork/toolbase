"use client";

import React from "react";

type BuyMeCoffeeButtonProps = {
  mode?: "floating" | "inline";
  className?: string;
};

export function BuyMeCoffeeButton({ mode = "inline", className = "" }: BuyMeCoffeeButtonProps) {
  const baseClassName =
    mode === "floating"
      ? "fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[120]"
      : "inline-block";

  return (
    <>
      {/* Dynamically load the Cookie font for the authentic handwriting look */}
      <link href="https://fonts.googleapis.com/css2?family=Cookie&display=swap" rel="stylesheet" />

      <a
        href="https://buymeacoffee.com/openbuildnetwork"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy Me a Coffee"
        className={`${baseClassName} inline-flex items-center gap-2.5 px-4.5 py-2 rounded-xl select-none transition-all duration-200 ease-out hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] group ${className}`}
        style={{
          background: "#FFDD00",
          color: "#000000",
          boxShadow: "0px 4px 14px rgba(0, 0, 0, 0.06), inset 0px 1px 0px rgba(255, 255, 255, 0.2)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#FFEA3B";
          e.currentTarget.style.boxShadow = "0px 6px 20px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FFDD00";
          e.currentTarget.style.boxShadow = "0px 4px 14px rgba(0, 0, 0, 0.06)";
        }}
      >
        {/* Official SVG Logo of Buy Me a Coffee */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-[2deg]"
          style={{ transform: "translateY(-0.5px)" }}
        >
          <path
            d="M20.216 6.415L20.084 5.749C19.965 5.151 19.696 4.586 19.083 4.37C18.886 4.301 18.663 4.272 18.513 4.129C18.361 3.986 18.317 3.763 18.282 3.557C18.217 3.179 18.157 2.801 18.09 2.424C18.033 2.099 17.988 1.734 17.84 1.437C17.645 1.037 17.243 0.803 16.844 0.649C16.638 0.57 16.425 0.514 16.218 0.455C15.218 0.192 14.168 0.095 13.141 0.039C11.906 -0.028 10.655 -0.01 9.441 0.052C8.526 0.135 7.571 0.236 6.701 0.552C6.383 0.668 6.055 0.808 5.813 1.053C5.516 1.355 5.42 1.823 5.636 2.199C5.79 2.466 6.051 2.655 6.328 2.779C6.688 2.941 7.065 3.063 7.451 3.145C8.526 3.383 9.64 3.476 10.738 3.515C11.956 3.565 13.175 3.525 14.388 3.397C14.687 3.364 14.986 3.324 15.284 3.278C15.636 3.224 15.862 2.765 15.758 2.444C15.634 2.061 15.301 1.913 14.924 1.971C14.458 2.045 13.964 2.079 13.542 2.117C12.365 2.197 11.184 2.199 10.006 2.123C9.622 2.098 9.237 2.065 8.849 2.016C8.763 2.006 8.669 1.991 8.591 1.98C8.348 1.944 8.107 1.9 7.867 1.85C7.756 1.823 7.756 1.665 7.867 1.638H7.872C8.149 1.578 8.429 1.53 8.71 1.491H8.712C8.843 1.482 8.975 1.459 9.106 1.443C10.239 1.328 11.381 1.295 12.532 1.323C13.206 1.342 13.879 1.39 14.549 1.467L14.777 1.498C15.044 1.538 15.31 1.586 15.575 1.643C15.967 1.728 16.47 1.756 16.645 2.185C16.7 2.322 16.725 2.473 16.756 2.616L17.075 4.1C17.094 4.195 17.027 4.283 16.928 4.284H16.925C16.888 4.29 16.85 4.294 16.813 4.299C15.228 4.496 13.633 4.591 12.07 4.594C10.49 4.597 8.905 4.5 7.371 4.29C7.231 4.273 7.078 4.248 6.954 4.23C6.628 4.182 6.305 4.122 5.981 4.069C5.588 4.004 5.213 4.037 4.858 4.23C4.568 4.39 4.331 4.634 4.183 4.931C4.029 5.247 3.984 5.591 3.916 5.931C3.847 6.271 3.74 6.638 3.781 6.987C3.868 7.74 4.394 8.352 5.151 8.489C8.949 9.176 12.809 9.155 16.494 8.865C16.685 8.85 16.845 8.995 16.88 9.185L16.809 9.882L15.791 19.789C15.75 20.199 15.744 20.621 15.666 21.026C15.544 21.663 15.113 22.054 14.484 22.197C13.907 22.328 13.319 22.397 12.728 22.402C12.072 22.406 11.418 22.377 10.762 22.38C10.063 22.384 9.206 22.32 8.667 21.8C8.192 21.342 8.127 20.626 8.062 20.007L7.331 12.994L7.009 9.9C6.972 9.549 6.723 9.205 6.331 9.222C5.995 9.237 5.613 9.522 5.653 9.901L5.881 12.086L6.83 21.198C6.977 22.542 8.004 23.266 9.276 23.47C10.018 23.59 10.779 23.614 11.533 23.626C12.499 23.642 13.475 23.679 14.425 23.504C15.833 23.246 16.89 22.306 17.041 20.847C17.381 17.515 17.724 14.184 18.065 10.852L18.28 8.765C18.298 8.587 18.435 8.441 18.613 8.411C19.015 8.333 19.4 8.199 19.782 8.03C20.158 7.863 20.472 7.593 20.612 7.185C20.732 6.838 20.505 6.55 20.216 6.415Z"
            fill="#000000"
          />
        </svg>

        {/* Cursive Handwriting Text style */}
        <span
          style={{
            fontFamily: "'Cookie', cursive, sans-serif",
            fontSize: "24px",
            lineHeight: "1",
            fontWeight: "normal",
            transform: "translateY(1px)",
          }}
        >
          Buy me a coffee
        </span>
      </a>
    </>
  );
}
