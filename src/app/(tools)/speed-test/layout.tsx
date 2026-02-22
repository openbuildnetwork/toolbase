import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Speed Test | OBN Toolkit',
    description: 'Test your internet connection download and upload speed directly in your browser.',
};

export default function SpeedTestLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
