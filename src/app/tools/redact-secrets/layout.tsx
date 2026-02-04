import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Secret Redactor | Secure Local Redaction Tool",
    description: "Redact sensitive information (PII, secrets, API keys) from text and logs entirely in your browser. No data leaves your device. Powered by WebAssembly.",
    keywords: ["redaction", "security", "privacy", "local", "wasm", "pii", "secrets", "api keys"],
};

export default function RedactSecretsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
