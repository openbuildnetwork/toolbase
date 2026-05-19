"use client";

import React, { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Heart, QrCode, Coffee, Copy, Check, X, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

// ==========================================
// ⚙️ CUSTOM SUPPORT CONFIGURATION
// ==========================================
// 1. Static QR Code Image (optional)
//    Place your image in the "public/" folder and put the path here (e.g., "/my-qr.png").
//    If left empty (""), the app dynamically generates a dynamic UPI QR code offline.
const CUSTOM_QR_IMAGE_PATH = "assets/images/upi-qr.jpg"; 

// 2. Google Pay / UPI Details
const UPI_ID = "don.benny@superyes";
const UPI_DISPLAY_NAME = "Open Build Network";

// 3. Buy Me a Coffee Link
const BUY_ME_COFFEE_URL = "https://buymeacoffee.com/openbuildnetwork";
// ==========================================

type SupportButtonProps = {
  mode?: "floating" | "inline";
  className?: string;
};

export function SupportButton({ mode = "inline", className = "" }: SupportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const upiUri = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_DISPLAY_NAME)}&cu=INR`;

  useEffect(() => {
    // Only generate dynamic QR code if custom image path is empty
    if (isOpen && !CUSTOM_QR_IMAGE_PATH) {
      QRCode.toDataURL(upiUri, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [isOpen, upiUri]);

  // Close on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy UPI ID:", err);
    }
  };

  const baseClassName =
    mode === "floating"
      ? "fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[120]"
      : "inline-block";

  // Parse hostname for display on the Buy Me a Coffee card (e.g. buymeacoffee.com/...)
  const displayBmcUrl = BUY_ME_COFFEE_URL.replace(/https?:\/\/(www\.)?/, "");

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Support Toolbase"
        className={`${baseClassName} group inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl select-none font-semibold text-sm transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]
          ${
            mode === "floating"
              ? "bg-(--surface-overlay) border border-(--border-medium) hover:border-(--border-subtle) hover:bg-(--surface-hover) hover:scale-[1.03] text-(--text-primary) shadow-lg backdrop-blur-md shadow-black/[0.08]"
              : "bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/35 hover:bg-rose-500/20 hover:scale-[1.02] text-rose-600 dark:text-rose-400"
          } ${className}`}
      >
        <span>Support ❤️</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-2xl bg-(--surface) border border-(--border-medium) rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-(--border-subtle) flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-(--text-primary) flex items-center gap-2">
                    Support Toolbase
                    <Heart className="w-5 h-5 fill-rose-500 stroke-rose-500 animate-pulse" />
                  </h3>
                  <p className="text-sm text-(--text-secondary) mt-1.5 leading-relaxed">
                    100% of contributions go towards keeping our client-side offline tools fast, free, and completely private.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-hover) transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 scrollbar-thin">
                
                {/* Option 1: Google Pay (UPI) */}
                <div className="flex flex-col bg-(--surface-secondary) border border-(--border-subtle) rounded-xl p-5 items-center text-center justify-between">
                  <div className="flex flex-col items-center w-full">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                      <QrCode className="w-5 h-5 text-blue-500" />
                    </div>
                    <h4 className="font-bold text-(--text-primary) text-base">Google Pay & UPI</h4>
                    <p className="text-xs text-(--text-tertiary) mt-1 leading-relaxed max-w-[200px]">
                      Scan with Google Pay, PhonePe, Paytm, or any UPI banking app
                    </p>

                    {/* QR Code Container */}
                    <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200/80 shadow-sm flex items-center justify-center">
                      {CUSTOM_QR_IMAGE_PATH ? (
                        /* Render static custom QR code image if path is set */
                        <img
                          src={CUSTOM_QR_IMAGE_PATH}
                          alt="Google Pay QR Code"
                          className="w-40 h-40 object-contain select-none"
                          draggable={false}
                        />
                      ) : qrUrl ? (
                        /* Fallback to dynamic client-side QR generation */
                        <img
                          src={qrUrl}
                          alt="Google Pay UPI QR Code"
                          className="w-40 h-40 object-contain select-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UPI Copy Area */}
                  <div className="mt-4 w-full">
                    <div className="flex items-center gap-1 bg-(--surface) border border-(--border-subtle) rounded-lg p-2 text-xs font-mono text-(--text-secondary) w-full justify-between overflow-hidden">
                      <span className="truncate select-all pr-2 pl-1 font-semibold">{UPI_ID}</span>
                      <button
                        onClick={handleCopyUpi}
                        title="Copy UPI ID"
                        className="p-1 rounded bg-(--surface-secondary) hover:bg-(--surface-hover) border border-(--border-subtle) transition-all text-(--text-primary) cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-green-500 font-semibold px-0.5">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px] px-0.5">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option 2: Buy Me a Coffee */}
                <div className="flex flex-col bg-(--surface-secondary) border border-(--border-subtle) rounded-xl p-5 items-center text-center justify-between">
                  <div className="flex flex-col items-center w-full">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-3">
                      <Coffee className="w-5 h-5 text-yellow-500" />
                    </div>
                    <h4 className="font-bold text-(--text-primary) text-base">Buy Me a Coffee</h4>
                    <p className="text-xs text-(--text-tertiary) mt-1 leading-relaxed max-w-[200px]">
                      Support via Credit Card, PayPal, Apple Pay, or Google Pay on our page
                    </p>

                    {/* Styled Brand Graphic */}
                    <div className="mt-6 flex flex-col items-center justify-center py-6 px-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10 w-full grow">
                      <Coffee className="w-12 h-12 text-yellow-500 stroke-[1.5] animate-bounce" />
                      <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 mt-2 truncate max-w-full px-2">
                        {displayBmcUrl}
                      </span>
                    </div>
                  </div>

                  {/* Brand Link Button */}
                  <a
                    href={BUY_ME_COFFEE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
                    style={{
                      background: "#FFDD00",
                      color: "#000000",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FFEA3B";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#FFDD00";
                    }}
                  >
                    <span>Visit BMC Page</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

              </div>

              {/* Footer Banner */}
              <div className="px-6 py-4 bg-(--surface-secondary) border-t border-(--border-subtle) text-center">
                <span className="text-[11px] text-(--text-muted) font-medium tracking-wide uppercase">
                  Thank you for keeping toolbase open-source & private ❤️
                </span>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
