'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSystemCapabilities, CapabilityReport } from '@/utils/SystemCapabilities';

const CapabilityContext = createContext<CapabilityReport | null>(null);

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const [report, setReport] = useState<CapabilityReport | null>(null);

  useEffect(() => {
    void getSystemCapabilities().then(setReport);
  }, []);

  return (
    <CapabilityContext.Provider value={report}>
      {children}
      {report && !report.webGPU && (
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
          <div className="bg-orange-500/10 border border-orange-500/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-orange-200/80">Compatibility Mode Active</span>
          </div>
        </div>
      )}
      {report && report.webGPU && (
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
          <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-200/80">WebGPU Accelerated</span>
          </div>
        </div>
      )}
    </CapabilityContext.Provider>
  );
}

export function useCapabilities() {
  return useContext(CapabilityContext);
}
