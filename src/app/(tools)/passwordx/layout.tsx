import type { Metadata } from 'next';
import { ToolPageTracker } from '@/shared/ui/ToolPageTracker';
import { PrivacyBadge } from '@/shared/ui/PrivacyBadge';

export const metadata: Metadata = {
    title: 'PasswordX | OBN toolbase',
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
            <PrivacyBadge toolId="passwordx" />
            {children}
        </>
    );
}
