import type { Metadata } from 'next';
import { ToolPageTracker } from '@/shared/ui/ToolPageTracker';
import { PrivacyBadge } from '@/shared/ui/PrivacyBadge';

export const metadata: Metadata = {
    title: 'Pipeline Builder | OBN toolbase',
    description: 'Chain Toolbase tools together into automated workflows powered by TIP — the Toolbase Interoperability Protocol.',
};

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ToolPageTracker toolId="pipeline" />
            <PrivacyBadge toolId="pipeline" />
            {children}
        </>
    );
}
