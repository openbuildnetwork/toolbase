'use client';

import React, { useState, useEffect } from 'react';
import MergePdf from '@/components/features/magic-pdf/MergePdf';
import SplitPdf from '@/components/features/magic-pdf/SplitPdf';
import CompressPdf from '@/components/features/magic-pdf/CompressPdf';
import RearrangePdf from '@/components/features/magic-pdf/RearrangePdf';
import ProtectPdf from '@/components/features/magic-pdf/ProtectPdf';
import UnlockPdf from '@/components/features/magic-pdf/UnlockPdf';
import SignPdf from '@/components/features/magic-pdf/SignPdf';
import EditPdf from '@/components/features/magic-pdf/EditPdf';
import PdfToWord from '@/components/features/magic-pdf/PdfToWord';
import PdfToImage from '@/components/features/magic-pdf/PdfToImage';
import ImageToPdf from '@/components/features/magic-pdf/ImageToPdf';
import HtmlToPdf from '@/components/features/magic-pdf/HtmlToPdf';
import MaskPdf from '@/components/features/magic-pdf/MaskPdf';
import {
  Merge,
  Scissors,
  Minimize2,
  Image,
  FileText,
  ArrowUpDown,
  Lock,
  Unlock,
  PenTool,
  Edit3,
  FileCode,
  FileCode2,
  ShieldAlert,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReturnToToolsButton } from "@/components/ui/ReturnToToolsButton";
import { ToolSidebar, ToolSidebarItem } from '@/components/ui/ToolSidebar';
import { cn } from '@/lib/utils';

const MagicPdf = () => {
  const [activeTool, setActiveTool] = useState('merge');

  const tools: ToolSidebarItem[] = [
    { id: 'merge', label: 'Merge PDFs', icon: Merge },
    { id: 'split', label: 'Split PDF', icon: Scissors },
    { id: 'compress', label: 'Compress PDF', icon: Minimize2 },
    { id: 'rearrange', label: 'Rearrange Pages', icon: ArrowUpDown },
    { id: 'protect', label: 'Protect PDF', icon: Lock },
    { id: 'unlock', label: 'Unlock PDF', icon: Unlock },
    { id: 'sign', label: 'Sign PDF', icon: PenTool },
    { id: 'edit', label: 'Edit PDF', icon: Edit3, badge: 'Beta' },
    { id: 'redact', label: 'Redact & Mask', icon: ShieldAlert, badge: 'Beta' },
    { id: 'word', label: 'PDF to Word', icon: FileCode, badge: 'Beta' },
    { id: 'convert', label: 'PDF to Image', icon: Image },
    { id: 'img2pdf', label: 'Image to PDF', icon: Image },
    { id: 'html2pdf', label: 'HTML to PDF', icon: FileCode2, badge: 'Beta' },
  ];

  const activeToolLabel = tools.find(t => t.id === activeTool)?.label || 'Tool';
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Update page title when tool changes
  useEffect(() => {
    document.title = `${activeToolLabel} | OBN Toolkit`;

    // Cleanup: reset to layout default when component unmounts
    return () => {
      document.title = 'Magic PDF | OBN Toolkit';
    };
  }, [activeToolLabel]);

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--background)] relative">
      <ToolSidebar
        title="PDF Tools"
        items={tools}
        activeId={activeTool}
        onSelect={setActiveTool}
        isOpen={isSidebarOpen}
        onToggle={setSidebarOpen}
      />

      {/* Main Editor Area */}
      <main className="flex-1 overflow-hidden relative bg-transparent flex flex-col">
        <header className="h-14 border-b border-[color:var(--border-subtle)] bg-[var(--surface-overlay)] backdrop-blur-md flex items-center justify-between px-6 transition-all duration-300">
          <div className={cn("flex items-center gap-2 transition-all duration-300", !isSidebarOpen && "pl-12")}>
            <div className="flex items-center text-sm text-text-muted">
              <span className="font-semibold text-text-primary mr-2">Magic PDF</span>
              <span className="text-text-muted">/</span>
              <span className="ml-2">{activeToolLabel}</span>
            </div>
          </div>
          <ReturnToToolsButton />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="h-full w-full">
            <AnimatePresence mode="wait">
              {activeTool === 'merge' && (
                <motion.div
                  key="merge"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <MergePdf />
                </motion.div>
              )}

              {activeTool === 'split' && (
                <motion.div
                  key="split"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <SplitPdf />
                </motion.div>
              )}

              {activeTool === 'compress' && (
                <motion.div
                  key="compress"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <CompressPdf />
                </motion.div>
              )}

              {activeTool === 'rearrange' && (
                <motion.div
                  key="rearrange"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <RearrangePdf />
                </motion.div>
              )}

              {activeTool === 'protect' && (
                <motion.div
                  key="protect"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ProtectPdf />
                </motion.div>
              )}

              {activeTool === 'unlock' && (
                <motion.div
                  key="unlock"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <UnlockPdf />
                </motion.div>
              )}

              {activeTool === 'sign' && (
                <motion.div
                  key="sign"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <SignPdf />
                </motion.div>
              )}

              {activeTool === 'edit' && (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <EditPdf />
                </motion.div>
              )}

              {activeTool === 'word' && (
                <motion.div
                  key="word"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <PdfToWord />
                </motion.div>
              )}

              {activeTool === 'redact' && (
                <motion.div
                  key="redact"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <MaskPdf />
                </motion.div>
              )}

              {activeTool === 'convert' && (
                <motion.div
                  key="convert"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <PdfToImage />
                </motion.div>
              )}

              {activeTool === 'img2pdf' && (
                <motion.div
                  key="img2pdf"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ImageToPdf />
                </motion.div>
              )}

              {activeTool === 'html2pdf' && (
                <motion.div
                  key="html2pdf"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <HtmlToPdf />
                </motion.div>
              )}

              {activeTool !== 'merge' && activeTool !== 'split' && activeTool !== 'compress' && activeTool !== 'rearrange' && activeTool !== 'protect' && activeTool !== 'unlock' && activeTool !== 'sign' && activeTool !== 'edit' && activeTool !== 'redact' && activeTool !== 'word' && activeTool !== 'convert' && activeTool !== 'img2pdf' && activeTool !== 'html2pdf' && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex h-full items-center justify-center p-12 text-center text-text-faint"
                >
                  <Card className="p-12 max-w-md w-full flex flex-col items-center gap-6 border-dashed border-2 bg-transparent shadow-none">
                    <div className="w-20 h-20 rounded-full bg-surface-secondary flex items-center justify-center">
                      {(() => {
                        const Icon = tools.find(t => t.id === activeTool)?.icon || FileText;
                        return <Icon className="w-10 h-10 opacity-20" />
                      })()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">Coming Soon</h3>
                      <p>The <strong>{activeToolLabel}</strong> tool is currently under development.</p>
                    </div>
                    <Button variant="outline" onClick={() => setActiveTool('merge')}>
                      Go to Merge Tool
                    </Button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MagicPdf;
