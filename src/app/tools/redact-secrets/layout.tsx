import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Redact Secrets | OBN Toolkit',
    description: 'Automatically detect and redact sensitive information like API keys, passwords, and credentials from your code.',
};

export default function RedactSecretsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
