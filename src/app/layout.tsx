import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { CommandPaletteProvider } from "../components/ui/CommandPaletteProvider";
import { AIChatProvider } from "@/hooks/useAIChat";
import { GlobalAIOverlay } from "@/components/ai/GlobalAIOverlay";
import { ThemeProvider } from "../components/ui/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | OBN Toolkit",
    default: "OBN Toolkit",
  },
  description: "The Open Build Network: Browser-based utilities for the privacy-conscious developer.",
  keywords: ["developer tools", "privacy", "pdf tools", "browser tools", "no upload"],
  openGraph: {
    title: "OBN Toolkit",
    description: "Every tool you need. Zero data leaves your machine.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Material Symbols Outlined: used globally via .material-symbols-outlined CSS class.
          Loaded as a non-blocking stylesheet (media=print + onload swap trick handled by browser).
          Script/cursive fonts (Dancing Script, etc.) are lazy-loaded inside SignPdf component only.
        */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f0f0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Toolkit" />
        <link rel="apple-touch-icon" href="/icons/pwa/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AIChatProvider>
            {/* Global Header + Cmd+K palette — both managed by the client provider */}
            <CommandPaletteProvider />

            {children}

            {/* AI Chat Drawer rendered globally */}
            <GlobalAIOverlay />
          </AIChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
