import type { Metadata } from 'next';
import { ToolPageTracker } from '@/components/ui/ToolPageTracker';

export const metadata: Metadata = {
    title: 'Open Draw | OBN Toolkit',
    description: 'Create diagrams, flowcharts and system designs with a full diagramming canvas — no account required.',
};

export default function OpenDrawLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <ToolPageTracker toolId="open-draw" />
            {children}
        </>
    );
}
