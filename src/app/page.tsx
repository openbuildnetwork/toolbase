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
import { PersonalizedGallery } from '@/components/ui/PersonalizedGallery';

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

  const tools = useMemo(() => registryToCardProps(TOOLS), []);

  return (
    <div>
      <Header />
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

            {/* Personalized sections: Favorites + Recents */}
            <PersonalizedGallery allTools={tools} />

            <div id="tool-grid-section">
              <ToolGrid searchQuery={searchQuery} tools={tools} />
            </div>

            <section
              className="sm:mt-[72px] animate-from-bottom mt-[42px] pt-[16px] max-w-3xl mx-auto"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>About the Platform</h2>
              <div className="space-y-6">
                <p className="text-lg md:text-xl leading-relaxed font-normal text-center sm:text-left" style={{ color: 'var(--text-secondary)' }}>
                  The Open Build Network (OBN) is a collection of high-performance developer utilities designed with a radical approach to security. Every tool in this suite runs <strong>entirely in your browser</strong> using WebAssembly (WASM) and local processing.
                </p>
                <p className="text-lg md:text-xl leading-relaxed font-normal text-center sm:text-left" style={{ color: 'var(--text-secondary)' }}>
                  By eliminating server-side requirements, we ensure that your sensitive data—whether it&apos;s source code, PDFs, or database credentials—<strong>never leaves your machine</strong>. This architecture provides the privacy of local desktop software with the accessibility of the web.
                </p>
              </div>
            </section>

            <section
              className="sm:mt-[72px] animate-from-bottom mt-[42px] py-16 rounded-3xl max-w-4xl mx-auto flex flex-col items-center text-center"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-10" style={{ color: 'var(--text-muted)' }}>Featured Tool</h2>
              <div className="flex flex-col items-center gap-8 w-full">
                <div className="icon-container w-[140px] h-[140px] bg-linear-to-br from-[#409cff] to-[#007aff] shadow-2xl">
                  <div className="icon-texture"></div>
                  <div className="premium-sheen"></div>
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <NextImage width={64} height={64} className='w-16 h-16' src="/assets/icons/pdf.svg" alt="" />
                  </div>
                </div>
                <div className="max-w-xl">
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">PDF Workspace</h3>
                  <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Securely merge, split, and optimize documents with industrial-grade tools running completely inside your browser environment.
                  </p>
                  <a className="macos-primary-button" href="#">
                    <span>Launch Tool</span>
                    <NextImage width={18} height={18} className='w-[18px] h-[18px]' src="/assets/icons/forward-white.svg" alt="" />
                  </a>
                </div>
              </div>
            </section>

            <section
              className="sm:mt-[72px] animate-from-bottom mt-[42px] pt-[16px] max-w-3xl mx-auto text-center"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--text-muted)' }}>Open Source &amp; Community</h2>
              <div className="space-y-8">
                <p className="text-lg md:text-xl leading-relaxed font-normal" style={{ color: 'var(--text-secondary)' }}>
                  OBN is built by the community, for the community. Our source code is fully transparent, and we welcome contributions to help build the world&apos;s most secure toolset.
                </p>
                <div className="pt-4">
                  <a className="macos-button" href="#">
                    <NextImage width={24} height={24} className='w-6 h-6' src="/assets/icons/github.svg" alt="" />
                    <span>View Repository</span>
                  </a>
                </div>
              </div>
            </section>
          </div>
        </main>
        <Footer />
        <BottomNav tools={tools} />
      </div>
    </div>
  );
}