import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'JSON to Interface/Model | OBN Toolkit',
    description: 'Convert JSON data to TypeScript interfaces, Python models, and other type definitions instantly.',
};

export default function JsonToInterfaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
