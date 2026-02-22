import type { Metadata } from 'next';
import { ToolPageTracker } from '@/components/ui/ToolPageTracker';

export const metadata: Metadata = {
    title: 'PasswordX | OBN Toolkit',
    description: 'Generate secure passwords and test their strength directly in your browser.',
};

export default function PasswordXLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <ToolPageTracker toolId="passwordx" />
            {children}
        </>
    );
}
