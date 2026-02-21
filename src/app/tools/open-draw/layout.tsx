import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Open Draw | OBN Toolkit',
    description: 'Create diagrams, flowcharts and system designs with a full diagramming canvas — no account required.',
};

export default function OpenDrawLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
