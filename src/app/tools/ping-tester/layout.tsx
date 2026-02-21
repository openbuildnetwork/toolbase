import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ping Tester | OBN Toolkit',
    description: 'Test network latency and reachability of any host directly from your browser.',
};

export default function PingTesterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
