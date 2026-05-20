'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TOOLS } from '@/config/tools.registry';
import { MobileOptimizationWarning } from './MobileOptimizationWarning';

interface ToolMobileGuardProps {
  children: React.ReactNode;
}

export function ToolMobileGuard({ children }: ToolMobileGuardProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
  const [dismissed, setDismissed] = useState(false);
  const toolRoute = pathname?.split('/')[1];
  const tool = TOOLS.find(t => t.route === toolRoute);
  const shouldGuard = Boolean(isMobile && tool && !tool.mobileOptimized && !dismissed);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      {!shouldGuard && children}
      <MobileOptimizationWarning 
        isOpen={shouldGuard}
        onProceed={() => {
            setDismissed(true);
        }} 
      />
    </>
  );
}
