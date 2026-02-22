import type { Metadata } from 'next';
import { ToolPageTracker } from '@/components/ui/ToolPageTracker';

export const metadata: Metadata = {
  title: 'Image Compressor | Secure Client-Side Compression',
  description:
    'Compress images securely in your browser. Supports JPEG, PNG, WEBP formatting and quality adjustment. No server uploads - 100% private.',
  keywords: [
    'image compressor',
    'compress jpeg',
    'compress png',
    'offline image compressor',
    'secure image tool',
    'client-side compression',
  ],
  authors: [{ name: 'ToolBase' }],
  openGraph: {
    title: 'Image Compressor | Secure Client-Side Compression',
    description: 'Compress images securely in your browser without uploading files.',
    type: 'website',
  },
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ToolPageTracker toolId="pixel-axe" />
      {children}
    </>
  );
}
