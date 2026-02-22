import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "DataLens | In-Browser SQL & Data Analytics",
    description: "Analyze CSV, Excel, and JSON files instantly in your browser with SQL and Python. Privacy-first, no server uploads required.",
    keywords: ["csv viewer", "sql editor", "data analytics", "python wasm", "excel viewer", "json viewer", "local data analysis"],
};

export default function DataLensLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
