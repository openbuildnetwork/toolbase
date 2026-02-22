import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "JSON to Interface | TypeScript, Go, Java, Python",
    description: "Instantly convert JSON objects into type-safe interfaces and models for TypeScript, Go, Java, Python, and more. Runs locally in your browser.",
    keywords: ["json to typescript", "json listener", "json to interface", "json to struct", "code generator", "developer productivity"],
};

export default function JsonToInterfaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
