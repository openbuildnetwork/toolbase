'use client';

import NextImage from 'next/image';
import SearchBar from "../components/ui/SearchBar";
import ToolGrid from "../components/ui/ToolGrid";
import { useState, useMemo } from 'react';
import BottomNav from "../components/ui/BottomNav";
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { TOOLS } from '@/config/tools.registry';
import type { ToolMeta } from '@/types/tool-search';
import { ToolCardProps } from '@/types/tool-search';
import { RecentsDrawer } from '@/components/ui/RecentsDrawer';
import { FavoritesDrawer } from '@/components/ui/FavoritesDrawer';

/**
 * Map the central tool registry to the ToolCardProps shape expected
 * by ToolGrid / ToolCard. This is the single translation point —
 * add a tool to tools.registry.ts and it automatically appears here.
 */
function registryToCardProps(tools: ToolMeta[]): ToolCardProps[] {
  return tools.map((tool) => ({
    title: tool.name,
    route: tool.route,
    icon: tool.thumbnail,
    metadata: tool.tags,
    toolId: tool.id,
  }));
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecentsOpen, setIsRecentsOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  const tools = useMemo(() => registryToCardProps(TOOLS), []);

  return (
    <div>
      <Header 
        onOpenRecents={() => setIsRecentsOpen(true)} 
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />
      <div className="view font-display min-h-screen flex flex-col selection:bg-primary/30 antialiased"
        style={{ background: 'var(--background)', color: 'var(--text-primary)' }}
      >
        <main className="grow px-6 md:px-20 lg:px-40 py-12 lg:py-16">
          <div className="max-w-[1200px] mx-auto">
            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10 max-w-2xl mx-auto leading-snug animate-fade-up">
              The Open Build Network: Browser-based utilities for the privacy-conscious developer.
            </h3>

            <div className="animate-fade-up-delay-1 mb-12">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>

            <div id="tool-grid-section">
              <ToolGrid searchQuery={searchQuery} tools={tools} />
            </div>
            <div className="mt-16 flex justify-center">
              <div
                className="
                          flex items-center gap-2
                          px-5 py-2.5
                          rounded-full
                          backdrop-blur-xl
                          border
                          transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
                }}
              >
                <span className="text-sm">
                  Open source with
                </span>

                <span className="text-red-500 text-sm">❤️</span>

                <span className="text-sm">
                  by the Open Build Network.
                </span>
              </div>
            </div>
          </div>
        </main>
        <Footer />
        <BottomNav tools={tools} />
      </div>

      <RecentsDrawer 
        isOpen={isRecentsOpen} 
        onClose={() => setIsRecentsOpen(false)} 
      />
      <FavoritesDrawer 
        isOpen={isFavoritesOpen} 
        onClose={() => setIsFavoritesOpen(false)} 
      />
    </div>
  );
}